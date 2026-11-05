import { INITIAL_PLAYER, playerReducer, type PlayerAction, type PlayerState } from './playerState.js';

/**
 * Registro de eventos do jogador (event sourcing).
 *
 * O progresso não é gravado como "estado final": cada jogada vira um evento imutável com
 * identificador único. O estado é sempre recalculado a partir da lista de eventos, ordenada
 * por (horário, id). Assim, qualquer aparelho que tenha o mesmo conjunto de eventos chega ao
 * mesmo estado, sem coordenação, e juntar o progresso de dois aparelhos é só unir os conjuntos.
 */

/** Ações que fazem parte do progresso e vão para o servidor. */
export type SyncedAction = Extract<
  PlayerAction,
  { type: 'onboard' | 'updateProfile' | 'addToTeam' | 'removeFromTeam' | 'useBall' | 'settleBattle' }
>;

/** Progresso salvo antes da sincronização existir: entra uma vez como evento. */
export interface ImportLegacyAction {
  type: 'importLegacy';
  snapshot: Pick<PlayerState, 'displayName' | 'course' | 'score' | 'battles' | 'captures' | 'creatures' | 'team' | 'inventory' | 'settledBattles'>;
}

export type EventAction = SyncedAction | ImportLegacyAction;

export interface PlayerEvent {
  /** Chave de idempotência: o mesmo evento enviado duas vezes é o mesmo documento. */
  id: string;
  deviceId: string;
  /** Horário do aparelho quando a jogada aconteceu (ms). */
  at: number;
  action: EventAction;
  /**
   * Só em updateProfile: o último evento de perfil que este aparelho conhecia. Se outro
   * aparelho alterou o perfil sem saber deste, é uma edição concorrente (conflito).
   */
  basis?: string | null;
}

const SYNCED_TYPES = new Set<string>(['onboard', 'updateProfile', 'addToTeam', 'removeFromTeam', 'useBall', 'settleBattle']);

export function isSyncedAction(action: PlayerAction): action is SyncedAction {
  return SYNCED_TYPES.has(action.type);
}

export type ConflictKind = 'duplicate-starter' | 'duplicate-capture' | 'no-balls' | 'concurrent-profile' | 'duplicate-legacy';

export interface ResolvedConflict {
  eventId: string;
  kind: ConflictKind;
  /** O evento que prevaleceu. */
  winnerId: string | null;
  message: string;
}

/** Ordem total e determinística: horário do aparelho e, no empate, o id. */
export function compareEvents(a: PlayerEvent, b: PlayerEvent): number {
  return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export interface FoldResult {
  player: PlayerState;
  conflicts: ResolvedConflict[];
}

/**
 * Recalcula o estado do jogador a partir dos eventos e aplica a política de conflitos:
 *
 * - Inicial escolhido em dois aparelhos offline: vale o primeiro (menor horário); o outro é descartado.
 * - Mesmo Pokémon selvagem (spawn) resolvido em dois aparelhos: vale a primeira batalha; a outra é
 *   descartada inteira (sem captura, XP ou pontos em dobro).
 * - Bolas usadas além do estoque: o uso excedente é descartado (o estoque nunca fica negativo).
 * - Nome/curso alterados em dois aparelhos sem um saber do outro: vale a alteração mais recente
 *   (last-writer-wins) e o conflito fica registrado.
 * - Eventos repetidos (mesmo id) contam uma vez só.
 */
export function foldPlayerEvents(base: PlayerState, events: readonly PlayerEvent[]): FoldResult {
  const unique = new Map<string, PlayerEvent>();
  for (const event of events) if (!unique.has(event.id)) unique.set(event.id, event);
  const ordered = [...unique.values()].sort(compareEvents);

  let player = base;
  const conflicts: ResolvedConflict[] = [];
  const captureBySpawn = new Map<string, string>();
  let starterEventId: string | null = null;
  let lastProfile: PlayerEvent | null = null;

  for (const event of ordered) {
    const { action } = event;
    switch (action.type) {
      case 'importLegacy': {
        if (player.onboarded) {
          conflicts.push({ eventId: event.id, kind: 'duplicate-legacy', winnerId: starterEventId, message: 'Progresso antigo deste aparelho ignorado: a conta já tinha progresso.' });
          break;
        }
        player = { ...player, ...action.snapshot, onboarded: true };
        starterEventId = event.id;
        break;
      }
      case 'onboard': {
        if (player.onboarded) {
          conflicts.push({ eventId: event.id, kind: 'duplicate-starter', winnerId: starterEventId, message: 'Pokémon inicial escolhido em dois aparelhos: valeu a primeira escolha.' });
          break;
        }
        player = playerReducer(player, action);
        starterEventId = event.id;
        break;
      }
      case 'settleBattle': {
        const spawnId = action.spawnId;
        const winner = spawnId ? captureBySpawn.get(spawnId) : undefined;
        if (winner) {
          conflicts.push({ eventId: event.id, kind: 'duplicate-capture', winnerId: winner, message: 'O mesmo Pokémon foi enfrentado em dois aparelhos: valeu a primeira batalha.' });
          break;
        }
        const next = playerReducer(player, action);
        if (next !== player && spawnId) captureBySpawn.set(spawnId, event.id);
        player = next;
        break;
      }
      case 'useBall': {
        if (player.inventory[action.item] <= 0) {
          conflicts.push({ eventId: event.id, kind: 'no-balls', winnerId: null, message: 'Bola usada sem estoque (gasta em outro aparelho): uso descartado.' });
          break;
        }
        player = playerReducer(player, action);
        break;
      }
      case 'updateProfile': {
        if (lastProfile && event.basis !== undefined && event.basis !== lastProfile.id && lastProfile.deviceId !== event.deviceId) {
          conflicts.push({ eventId: lastProfile.id, kind: 'concurrent-profile', winnerId: event.id, message: 'Nome/curso alterados em dois aparelhos: valeu a alteração mais recente.' });
        }
        player = playerReducer(player, action);
        lastProfile = event;
        break;
      }
      default:
        player = playerReducer(player, action);
    }
  }
  return { player, conflicts };
}

/** Último evento de perfil conhecido (vai como `basis` do próximo updateProfile). */
export function lastProfileEventId(events: readonly PlayerEvent[]): string | null {
  let last: PlayerEvent | null = null;
  for (const event of events) {
    if (event.action.type !== 'updateProfile') continue;
    if (!last || compareEvents(event, last) > 0) last = event;
  }
  return last?.id ?? null;
}

/** Converte o progresso salvo pela versão antiga (antes dos eventos) num evento de importação. */
export function legacyImportEvent(stored: PlayerState, deviceId: string, at: number, id: string): PlayerEvent | null {
  if (!stored.onboarded || stored.creatures.length === 0) return null;
  const { displayName, course, score, battles, captures, creatures, team, inventory, settledBattles } = stored;
  return {
    id,
    deviceId,
    at,
    action: { type: 'importLegacy', snapshot: { displayName, course, score, battles, captures, creatures, team, inventory, settledBattles: settledBattles ?? [] } },
  };
}

export const EMPTY_PROGRESS: PlayerState = INITIAL_PLAYER;
