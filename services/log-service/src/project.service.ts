import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DataStore } from './data.store';
import { LogInfrastructure } from './log.infrastructure';

export type ProjectRole = 'OWNER' | 'MAINTAINER' | 'VIEWER';
export interface Actor {
  userId: string;
  role: 'ADMIN' | 'OPERATOR';
  email?: string;
}

@Injectable()
export class ProjectService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectService.name);
  private timer?: ReturnType<typeof setInterval>;
  private maintenanceTimer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly db: DataStore,
    private readonly infra: LogInfrastructure,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.drainAudit();
    }, 10_000);
    this.maintenanceTimer = setInterval(() => {
      void this.cleanupLedger();
    }, 3600_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
  }

  private async cleanupLedger() {
    try {
      await this.db.query(
        `DELETE FROM log_idempotency WHERE created_at < now() - interval '24 hours'`,
      );
      await this.db.query(
        `DELETE FROM log_accepted_batches WHERE accepted_at < now() - interval '90 days'`,
      );
    } catch (error) {
      this.logger.warn(`Log ledger cleanup will retry: ${String(error)}`);
    }
  }

  private async drainAudit() {
    try {
      const pending = await this.db.query<{
        event_id: string;
        payload: Record<string, unknown>;
      }>(
        `SELECT event_id,payload FROM log_audit_outbox WHERE published_at IS NULL
         ORDER BY created_at LIMIT 100`,
      );
      for (const item of pending.rows) {
        await this.infra.publishAudit({
          eventId: item.event_id,
          ...item.payload,
        });
        await this.db.query(
          'UPDATE log_audit_outbox SET published_at=now() WHERE event_id=$1',
          [item.event_id],
        );
      }
    } catch (error) {
      this.logger.warn(`Audit delivery will retry: ${String(error)}`);
    }
  }

  private async audit(
    client: PoolClient,
    projectId: string,
    actor: Actor,
    action: string,
    resourceId?: string,
    detail: Record<string, unknown> = {},
  ) {
    const eventId = randomUUID();
    const payload = {
      actorUserId: actor.userId,
      actorRole: actor.role,
      actorEmail: actor.email,
      action,
      resourceType: action.startsWith('PROJECT_TOKEN')
        ? 'PROJECT_TOKEN'
        : action.startsWith('PROJECT_MEMBER')
          ? 'PROJECT_MEMBER'
          : 'PROJECT',
      resourceId: resourceId ?? projectId,
      metadata: { projectId, ...detail },
    };
    await client.query(
      `INSERT INTO log_project_activity (activity_id,project_id,actor_user_id,action,resource_id,detail)
         VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        randomUUID(),
        projectId,
        actor.userId,
        action,
        resourceId ?? null,
        JSON.stringify(detail),
      ],
    );
    await client.query(
      'INSERT INTO log_audit_outbox (event_id,payload) VALUES ($1,$2)',
      [eventId, JSON.stringify(payload)],
    );
  }

  async list(actor: Actor) {
    const result = await this.db.query(
      `SELECT p.project_id AS "projectId",p.name,p.created_at AS "createdAt",m.role
       FROM log_projects p JOIN log_project_members m ON m.project_id=p.project_id
       WHERE m.user_id=$1 ORDER BY p.created_at DESC`,
      [actor.userId],
    );
    return result.rows;
  }

  async membership(projectId: string, actor: Actor, allowed?: ProjectRole[]) {
    const result = await this.db.query<{ role: ProjectRole }>(
      'SELECT role FROM log_project_members WHERE project_id=$1 AND user_id=$2',
      [projectId, actor.userId],
    );
    const role = result.rows[0]?.role;
    if (!role) throw new NotFoundException('Project not found');
    if (allowed && !allowed.includes(role))
      throw new ForbiddenException('Project permission denied');
    return role;
  }

  async get(projectId: string, actor: Actor) {
    const role = await this.membership(projectId, actor);
    const result = await this.db.query(
      'SELECT project_id AS "projectId",name,created_at AS "createdAt" FROM log_projects WHERE project_id=$1',
      [projectId],
    );
    return { ...result.rows[0], role };
  }

  async create(actor: Actor, name: string) {
    const clean = name?.trim();
    if (!clean || clean.length > 100)
      throw new BadRequestException('Project name must be 1–100 characters');
    const projectId = randomUUID();
    await this.db.transaction(async (client) => {
      await client.query(
        'INSERT INTO log_projects (project_id,name,owner_user_id) VALUES ($1,$2,$3)',
        [projectId, clean, actor.userId],
      );
      await client.query(
        `INSERT INTO log_project_members (project_id,user_id,email,role)
        VALUES ($1,$2,$3,'OWNER')`,
        [projectId, actor.userId, actor.email ?? ''],
      );
      await this.audit(client, projectId, actor, 'PROJECT_CREATED', projectId);
    });
    void this.drainAudit();
    return this.get(projectId, actor);
  }

  async members(projectId: string, actor: Actor) {
    await this.membership(projectId, actor);
    const result = await this.db.query(
      `SELECT user_id AS "userId",email,role,created_at AS "createdAt"
       FROM log_project_members WHERE project_id=$1 ORDER BY created_at`,
      [projectId],
    );
    return result.rows;
  }

  private async resolveActiveUser(
    email: string,
  ): Promise<{ userId: string; email: string }> {
    const url = process.env.AUTH_SERVICE_URL;
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!url || !secret)
      throw new ServiceUnavailableException('User directory is not configured');
    const response = await fetch(
      `${url}/internal/users/resolve?email=${encodeURIComponent(email)}`,
      {
        headers: { 'x-internal-service-secret': secret },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.status === 404)
      throw new NotFoundException('Active user not found');
    if (!response.ok)
      throw new ServiceUnavailableException('User directory unavailable');
    return response.json() as Promise<{ userId: string; email: string }>;
  }

  async addMember(
    projectId: string,
    actor: Actor,
    email: string,
    role: ProjectRole,
  ) {
    await this.membership(projectId, actor, ['OWNER']);
    if (!email || !['MAINTAINER', 'VIEWER'].includes(role))
      throw new BadRequestException('Invalid member');
    const user = await this.resolveActiveUser(email.trim().toLowerCase());
    try {
      await this.db.transaction(async (client) => {
        await client.query(
          `INSERT INTO log_project_members (project_id,user_id,email,role) VALUES ($1,$2,$3,$4)`,
          [projectId, user.userId, user.email, role],
        );
        await this.audit(
          client,
          projectId,
          actor,
          'PROJECT_MEMBER_ADDED',
          user.userId,
          { role },
        );
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('User is already a member');
      throw error;
    }
    void this.drainAudit();
    return { ...user, role };
  }

  async setMemberRole(
    projectId: string,
    actor: Actor,
    userId: string,
    role: ProjectRole,
  ) {
    await this.membership(projectId, actor, ['OWNER']);
    if (!['MAINTAINER', 'VIEWER'].includes(role))
      throw new BadRequestException('Invalid member role');
    await this.db.transaction(async (client) => {
      const result = await client.query(
        `UPDATE log_project_members SET role=$3
      WHERE project_id=$1 AND user_id=$2 AND role <> 'OWNER' RETURNING user_id`,
        [projectId, userId, role],
      );
      if (!result.rowCount) throw new NotFoundException('Member not found');
      await this.audit(
        client,
        projectId,
        actor,
        'PROJECT_MEMBER_ROLE_CHANGED',
        userId,
        { role },
      );
    });
    void this.drainAudit();
    return { userId, role };
  }

  async removeMember(projectId: string, actor: Actor, userId: string) {
    await this.membership(projectId, actor, ['OWNER']);
    await this.db.transaction(async (client) => {
      const result = await client.query(
        `DELETE FROM log_project_members
      WHERE project_id=$1 AND user_id=$2 AND role <> 'OWNER' RETURNING user_id`,
        [projectId, userId],
      );
      if (!result.rowCount) throw new NotFoundException('Member not found');
      await this.audit(
        client,
        projectId,
        actor,
        'PROJECT_MEMBER_REMOVED',
        userId,
      );
    });
    void this.drainAudit();
    return { removed: true };
  }

  async tokens(projectId: string, actor: Actor) {
    await this.membership(projectId, actor, ['OWNER', 'MAINTAINER']);
    const result = await this.db.query(
      `SELECT token_id AS "tokenId",name,prefix,
      created_at AS "createdAt",revoked_at AS "revokedAt",last_used_at AS "lastUsedAt"
      FROM log_api_tokens WHERE project_id=$1 ORDER BY created_at DESC`,
      [projectId],
    );
    return result.rows;
  }

  async createToken(projectId: string, actor: Actor, name: string) {
    await this.membership(projectId, actor, ['OWNER', 'MAINTAINER']);
    const clean = name?.trim();
    if (!clean || clean.length > 100)
      throw new BadRequestException('Token name must be 1–100 characters');
    const tokenId = randomUUID();
    const token = `prj_live_${randomBytes(32).toString('base64url')}`;
    const tokenHash = this.infra.tokenHash(token);
    await this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO log_api_tokens (token_id,project_id,name,token_hash,prefix)
      VALUES ($1,$2,$3,$4,$5)`,
        [tokenId, projectId, clean, tokenHash, token.slice(0, 17)],
      );
      await this.audit(
        client,
        projectId,
        actor,
        'PROJECT_TOKEN_CREATED',
        tokenId,
        { name: clean },
      );
    });
    void this.drainAudit();
    return { tokenId, name: clean, token, prefix: token.slice(0, 17) };
  }

  async revokeToken(projectId: string, actor: Actor, tokenId: string) {
    await this.membership(projectId, actor, ['OWNER', 'MAINTAINER']);
    const result = await this.db.query<{ token_hash: string }>(
      `SELECT token_hash FROM log_api_tokens
      WHERE project_id=$1 AND token_id=$2 AND revoked_at IS NULL`,
      [projectId, tokenId],
    );
    if (!result.rows[0]) throw new NotFoundException('Active token not found');
    const hash = result.rows[0].token_hash;
    await this.infra.redis.set(`log:revoked:${hash}`, '1', 'EX', 600);
    try {
      await this.infra.redis.del(`log:token:${hash}`);
      await this.db.transaction(async (client) => {
        const revoked = await client.query(
          `UPDATE log_api_tokens SET revoked_at=now()
        WHERE project_id=$1 AND token_id=$2 AND revoked_at IS NULL RETURNING token_id`,
          [projectId, tokenId],
        );
        if (!revoked.rowCount)
          throw new NotFoundException('Active token not found');
        await this.audit(
          client,
          projectId,
          actor,
          'PROJECT_TOKEN_REVOKED',
          tokenId,
        );
      });
    } catch (error) {
      await this.infra.redis.del(`log:revoked:${hash}`);
      throw error;
    }
    void this.drainAudit();
    return { revoked: true };
  }

  async activity(projectId: string, actor: Actor) {
    await this.membership(projectId, actor);
    const result = await this.db.query(
      `SELECT activity_id AS "activityId",actor_user_id AS "actorUserId",
      action,resource_id AS "resourceId",detail,occurred_at AS "occurredAt"
      FROM log_project_activity WHERE project_id=$1 ORDER BY occurred_at DESC LIMIT 100`,
      [projectId],
    );
    return result.rows;
  }

  async usage(projectId: string, actor: Actor) {
    await this.membership(projectId, actor);
    const month =
      new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7) + '-01';
    const result = await this.db.query<{ accepted_records: string }>(
      'SELECT accepted_records FROM log_monthly_usage WHERE project_id=$1 AND month_start=$2',
      [projectId, month],
    );
    return {
      month,
      timezone: 'Asia/Bangkok',
      acceptedRecords: Number(result.rows[0]?.accepted_records ?? 0),
      requestsPerMinute: await this.infra.getRpm(projectId),
      rateLimitRpm: this.infra.rateLimitRpm,
    };
  }

  async invalidRpm(actor: Actor) {
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException('Administrator role is required');
    return { invalidRequestsPerMinute: await this.infra.getInvalidRpm() };
  }
}
