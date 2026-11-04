ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS players_email_lower_unique
  ON players (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS creature_species (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  types TEXT[] NOT NULL CHECK (cardinality(types) BETWEEN 1 AND 2),
  base_stats JSONB NOT NULL CHECK (jsonb_typeof(base_stats) = 'object'),
  base_capture_rate NUMERIC(5, 4) NOT NULL CHECK (base_capture_rate BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  boundary JSONB NOT NULL CHECK (jsonb_typeof(boundary) = 'array'),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id),
  species_id TEXT NOT NULL REFERENCES creature_species(id),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 100),
  active_from TIMESTAMPTZ NOT NULL,
  active_until TIMESTAMPTZ NOT NULL,
  spawn_seed TEXT NOT NULL,
  CHECK (active_from < active_until)
);

CREATE INDEX IF NOT EXISTS spawns_zone_window_idx
  ON spawns (zone_id, active_from, active_until);

CREATE TABLE IF NOT EXISTS encounters (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id),
  spawn_id UUID NOT NULL REFERENCES spawns(id),
  species_id TEXT NOT NULL REFERENCES creature_species(id),
  wild_level SMALLINT NOT NULL CHECK (wild_level BETWEEN 1 AND 100),
  wild_current_hp INTEGER NOT NULL CHECK (wild_current_hp >= 0),
  wild_max_hp INTEGER NOT NULL CHECK (wild_max_hp > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'captured', 'fled', 'expired')),
  turn_number INTEGER NOT NULL DEFAULT 1 CHECK (turn_number > 0),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  captured_creature_id UUID,
  UNIQUE (player_id, id),
  CHECK (wild_current_hp <= wild_max_hp)
);

CREATE INDEX IF NOT EXISTS encounters_player_status_idx
  ON encounters (player_id, status, updated_at);

CREATE TABLE IF NOT EXISTS player_creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id),
  species_id TEXT NOT NULL REFERENCES creature_species(id),
  nickname TEXT CHECK (nickname IS NULL OR length(trim(nickname)) BETWEEN 1 AND 20),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 100),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  current_hp INTEGER NOT NULL CHECK (current_hp >= 0),
  max_hp INTEGER NOT NULL CHECK (max_hp > 0),
  caught_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_encounter_id UUID,
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  UNIQUE (player_id, id),
  CHECK (current_hp <= max_hp)
);

CREATE INDEX IF NOT EXISTS player_creatures_owner_idx
  ON player_creatures (player_id, caught_at DESC);

CREATE TABLE IF NOT EXISTS parties (
  player_id UUID PRIMARY KEY REFERENCES players(id),
  version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS party_slots (
  player_id UUID NOT NULL REFERENCES parties(player_id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 3),
  creature_id UUID NOT NULL,
  PRIMARY KEY (player_id, slot),
  UNIQUE (player_id, creature_id),
  FOREIGN KEY (player_id, creature_id)
    REFERENCES player_creatures (player_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS encounter_party_members (
  player_id UUID NOT NULL,
  encounter_id UUID NOT NULL,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 3),
  creature_id UUID NOT NULL,
  PRIMARY KEY (encounter_id, slot),
  UNIQUE (encounter_id, creature_id),
  FOREIGN KEY (player_id, encounter_id)
    REFERENCES encounters (player_id, id) ON DELETE CASCADE,
  FOREIGN KEY (player_id, creature_id)
    REFERENCES player_creatures (player_id, id)
);

CREATE TABLE IF NOT EXISTS sync_events (
  idempotency_key UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id),
  device_id UUID NOT NULL,
  client_sequence BIGINT NOT NULL CHECK (client_sequence > 0),
  schema_version SMALLINT NOT NULL CHECK (schema_version = 1),
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  server_sequence BIGINT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected')),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  UNIQUE (device_id, client_sequence)
);

CREATE SEQUENCE IF NOT EXISTS sync_server_sequence;

CREATE INDEX IF NOT EXISTS sync_events_player_cursor_idx
  ON sync_events (player_id, server_sequence)
  WHERE status = 'accepted';

CREATE TABLE IF NOT EXISTS battle_turns (
  idempotency_key UUID PRIMARY KEY REFERENCES sync_events(idempotency_key),
  player_id UUID NOT NULL,
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL CHECK (turn_number > 0),
  actor_creature_id UUID,
  action JSONB NOT NULL CHECK (jsonb_typeof(action) = 'object'),
  result JSONB NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (encounter_id, turn_number),
  FOREIGN KEY (player_id, actor_creature_id)
    REFERENCES player_creatures (player_id, id)
);

ALTER TABLE encounters
  ADD CONSTRAINT encounters_captured_creature_fk
  FOREIGN KEY (player_id, captured_creature_id)
  REFERENCES player_creatures (player_id, id);

ALTER TABLE player_creatures
  ADD CONSTRAINT player_creatures_source_encounter_fk
  FOREIGN KEY (player_id, source_encounter_id)
  REFERENCES encounters (player_id, id);
