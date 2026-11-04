/**
 * Contratos públicos do módulo de exploração.
 * Outros módulos (batalha, captura, sincronização) devem depender destes tipos,
 * não dos componentes nem dos dados simulados.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Spawn como a tela de exploração o consome. */
export interface ExplorationSpawn {
  spawnId: string;
  speciesId: string;
  latitude: number;
  longitude: number;
  level: number;
  rarity: Rarity;
  /** ISO 8601 UTC. */
  startsAt: string;
  /** ISO 8601 UTC. */
  expiresAt: string;
  zoneId?: string;
  /** Token assinado pelo servidor; ausente nos dados simulados. */
  spawnToken?: string;
}

export interface CampusZone {
  id: string;
  slug: string;
  name: string;
  /** Cor de preenchimento e borda no mapa. */
  color: string;
  /** Vértices em ordem; o polígono é fechado automaticamente. */
  boundary: GeoPoint[];
  /**
   * true quando o polígono é apenas de demonstração e NÃO representa
   * o limite oficial do curso ou dos prédios.
   */
  isDemo: boolean;
}

export type LocationSource = 'gps' | 'simulated';

export interface LocationFix extends GeoPoint {
  /** Precisão em metros (0 para posição simulada). */
  accuracyMeters: number;
  /** Epoch em ms. */
  timestamp: number;
  source: LocationSource;
}

export type LocationErrorCode = 'unsupported' | 'permission-denied' | 'position-unavailable' | 'timeout';

export interface LocationError {
  code: LocationErrorCode;
  message: string;
}

export type EncounterBlockReason = 'no-location' | 'not-started' | 'expired' | 'out-of-range';

export type EncounterEligibility =
  | { allowed: true; distanceMeters: number }
  | { allowed: false; reason: EncounterBlockReason; distanceMeters: number | null };

/**
 * Intenção de iniciar um encontro. A tela de exploração apenas emite este pedido;
 * o módulo de batalha decide o que fazer e o backend valida definitivamente
 * (spawnToken, janela de tempo e regras). Localização do cliente não é autoridade.
 */
export interface EncounterStartRequest {
  spawnId: string;
  speciesId: string;
  level: number;
  spawnToken?: string;
  /** ISO 8601 UTC do momento do pedido no dispositivo. */
  requestedAt: string;
  playerPosition: GeoPoint;
  locationSource: LocationSource;
  distanceMeters: number;
}

export type EncounterStartHandler = (request: EncounterStartRequest) => void | Promise<void>;
