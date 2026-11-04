import type {
  PlayerStateSnapshot,
  SyncChangesResponse,
  SyncRequest,
  SyncResponse,
} from '@pokemon-campus/shared';

/** Porta da rede: telas e regras não dependem de fetch nem de Fastify. */
export interface RemotePort {
  synchronize(request: SyncRequest): Promise<SyncResponse>;
  pullChanges(after: string, limit?: number): Promise<SyncChangesResponse>;
  restoreState(): Promise<PlayerStateSnapshot>;
}
