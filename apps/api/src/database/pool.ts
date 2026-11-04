import { Pool } from 'pg';

export function createPool(): Pool | undefined {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  return new Pool({ connectionString });
}

