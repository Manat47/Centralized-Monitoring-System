import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { LogQueryService, type LogFilters } from './log-query.service';
import {
  type Actor,
  type ProjectRole,
  ProjectService,
} from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projects: ProjectService,
    private readonly logs: LogQueryService,
  ) {}

  private actor(headers: Record<string, string | string[] | undefined>): Actor {
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    const received = headers['x-internal-service-secret'];
    if (
      !secret ||
      typeof received !== 'string' ||
      Buffer.byteLength(secret) !== Buffer.byteLength(received) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(received))
    )
      throw new BadRequestException('Gateway authentication is required');
    const userId = headers['x-user-id'];
    const role = headers['x-user-role'];
    const email = headers['x-user-email'];
    if (typeof userId !== 'string' || (role !== 'ADMIN' && role !== 'OPERATOR'))
      throw new BadRequestException('Authenticated user is required');
    return {
      userId,
      role,
      email: typeof email === 'string' ? email : undefined,
    };
  }

  @Get()
  list(@Headers() headers: Record<string, string | string[] | undefined>) {
    return this.projects.list(this.actor(headers));
  }

  @Post()
  create(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: { name: string },
  ) {
    return this.projects.create(this.actor(headers), body?.name);
  }

  @Get('invalid-rpm')
  invalidRpm(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.projects.invalidRpm(this.actor(headers));
  }

  @Get(':projectId')
  get(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.get(projectId, this.actor(headers));
  }

  @Get(':projectId/members')
  members(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.members(projectId, this.actor(headers));
  }

  @Post(':projectId/members')
  addMember(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { email: string; role: ProjectRole },
  ) {
    return this.projects.addMember(
      projectId,
      this.actor(headers),
      body?.email,
      body?.role,
    );
  }

  @Patch(':projectId/members/:userId')
  setMemberRole(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: { role: ProjectRole },
  ) {
    return this.projects.setMemberRole(
      projectId,
      this.actor(headers),
      userId,
      body?.role,
    );
  }

  @Delete(':projectId/members/:userId')
  removeMember(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projects.removeMember(projectId, this.actor(headers), userId);
  }

  @Get(':projectId/tokens')
  tokens(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.tokens(projectId, this.actor(headers));
  }

  @Post(':projectId/tokens')
  createToken(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { name: string },
  ) {
    return this.projects.createToken(
      projectId,
      this.actor(headers),
      body?.name,
    );
  }

  @Delete(':projectId/tokens/:tokenId')
  revokeToken(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ) {
    return this.projects.revokeToken(projectId, this.actor(headers), tokenId);
  }

  @Get(':projectId/usage')
  usage(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.usage(projectId, this.actor(headers));
  }

  @Get(':projectId/activity')
  activity(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.activity(projectId, this.actor(headers));
  }

  @Get(':projectId/logs')
  async logsForProject(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() filters: LogFilters,
  ) {
    await this.projects.membership(projectId, this.actor(headers));
    return this.logs.list(projectId, filters);
  }

  @Get(':projectId/logs/values')
  async logValues(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: { field: string; q?: string; from?: string; to?: string },
  ) {
    await this.projects.membership(projectId, this.actor(headers));
    return this.logs.values(
      projectId,
      query.field,
      query.q ?? '',
      query.from,
      query.to,
    );
  }
}
