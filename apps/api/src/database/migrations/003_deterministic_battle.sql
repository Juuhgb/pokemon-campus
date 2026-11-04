-- Congela as entradas da batalha para que cliente e servidor reproduzam as mesmas ações.
ALTER TABLE spawns
  ADD COLUMN IF NOT EXISTS rules_version SMALLINT NOT NULL DEFAULT 1
  CHECK (rules_version > 0);

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS battle_seed TEXT;

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS rules_version SMALLINT NOT NULL DEFAULT 1
  CHECK (rules_version > 0);

-- Encontros já existentes passam a usar a semente do spawn de origem.
UPDATE encounters AS encounter
SET battle_seed = spawn.spawn_seed,
    rules_version = spawn.rules_version
FROM spawns AS spawn
WHERE spawn.id = encounter.spawn_id
  AND encounter.battle_seed IS NULL;

ALTER TABLE encounters
  ALTER COLUMN battle_seed SET NOT NULL;

-- Um agregado de inventário por jogador simplifica o controle otimista de versão.
CREATE TABLE IF NOT EXISTS player_inventories (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_inventory_items (
  player_id UUID NOT NULL REFERENCES player_inventories(player_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL CHECK (item_id IN ('POKE_BALL', 'GREAT_BALL')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (player_id, item_id)
);

-- O cursor é serializado por jogador dentro da mesma transação que aceita o evento.
CREATE TABLE IF NOT EXISTS player_sync_cursors (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  last_server_sequence BIGINT NOT NULL DEFAULT 0 CHECK (last_server_sequence >= 0)
);

INSERT INTO player_sync_cursors (player_id, last_server_sequence)
SELECT player.id, COALESCE(MAX(event.server_sequence), 0)
FROM players AS player
LEFT JOIN sync_events AS event
  ON event.player_id = player.id AND event.status = 'accepted'
GROUP BY player.id
ON CONFLICT (player_id) DO UPDATE
SET last_server_sequence = GREATEST(
  player_sync_cursors.last_server_sequence,
  EXCLUDED.last_server_sequence
);

-- Sequências e deduplicação são escopadas pelo jogador/dispositivo.
ALTER TABLE sync_events
  DROP CONSTRAINT IF EXISTS sync_events_server_sequence_key;
ALTER TABLE sync_events
  DROP CONSTRAINT IF EXISTS sync_events_device_id_client_sequence_key;

CREATE UNIQUE INDEX IF NOT EXISTS sync_events_player_sequence_unique
  ON sync_events (player_id, server_sequence)
  WHERE server_sequence IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sync_events_player_device_client_sequence_unique
  ON sync_events (player_id, device_id, client_sequence);

DROP SEQUENCE IF EXISTS sync_server_sequence;
