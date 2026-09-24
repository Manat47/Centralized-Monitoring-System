import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';

import { users } from '../schema/database.schema';

async function bootstrapAdmin(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const displayName = process.env.INITIAL_ADMIN_DISPLAY_NAME?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  if (!email || !password || !displayName) {
    throw new Error(
      'INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD and INITIAL_ADMIN_DISPLAY_NAME are required',
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  try {
    const [existingUser] = await db
      .select({
        userId: users.userId,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      console.log(`Admin user ${email} already exists. Skipping bootstrap.`);
      return;
    }

    const passwordHash = await hash(password, 12);
    const now = new Date();

    await db.insert(users).values({
      userId: randomUUID(),
      email,
      passwordHash,
      displayName,
      role: 'ADMIN',
      status: 'ACTIVE',
      lastLoginAt: null,
      invitationTokenHash: null,
      invitationExpiresAt: null,
      invitationSentAt: null,
      invitationAcceptedAt: null,
      invitationRevokedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Initial admin ${email} created successfully.`);
  } finally {
    await pool.end();
  }
}

bootstrapAdmin().catch((error: unknown) => {
  console.error('Failed to bootstrap initial admin:', error);
  process.exitCode = 1;
});
