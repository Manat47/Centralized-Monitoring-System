import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = await readFile(fileURLToPath(new URL('../migrations/001_init.sql', import.meta.url)), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(sql);
  console.log('log-service migration complete');
} finally {
  await client.end();
}
