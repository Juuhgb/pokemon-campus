import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Pool } from 'pg';

const migrations = ['001_initial.sql', '002_contracts.sql', '003_deterministic_battle.sql'];

export async function migrate(pool: Pool): Promise<void> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  for (const name of migrations) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(73194201)');
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
      if (!done.rowCount) {
        const sql = await readFile(resolve(process.cwd(), 'apps/api/src/database/migrations', name), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
}
