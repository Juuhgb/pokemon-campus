import type { PlayerProfile } from '@pokemon-campus/shared';
import type { Pool } from 'pg';

interface PlayerRow {
  id: string;
  display_name: string;
  score: number;
  created_at: Date;
}

export async function getPlayerProfile(pool: Pool, playerId: string): Promise<PlayerProfile | null> {
  const result = await pool.query<PlayerRow>(
    'SELECT id, display_name, score, created_at FROM players WHERE id = $1',
    [playerId],
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    displayName: row.display_name,
    score: row.score,
    createdAt: row.created_at.toISOString(),
  };
}
