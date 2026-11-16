import { ROUTES } from '../../../app/router.js';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { BackLink } from '../../../components/ui/ui.js';
import { getSpecies } from '../../catalog/species.js';
import { usePlayer, useSync } from '../../player/PlayerProvider.js';
import type { BattleOutcome, BattleRecord } from '../../player/playerState.js';

const OUTCOME: Record<BattleOutcome, { label: string; bg: string }> = {
  captured: { label: 'Capturado', bg: '#7ad88f' },
  won: { label: 'Vitória', bg: '#ffc23d' },
  lost: { label: 'Derrota', bg: '#c9b8ff' },
  fled: { label: 'Fuga', bg: '#bfe3ff' },
};

function formatWhen(iso: string | null): string {
  if (!iso) return 'Data desconhecida';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Data desconhecida';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function HistoryRow({ record }: { record: BattleRecord }) {
  const species = record.speciesId ? getSpecies(record.speciesId) : null;
  const outcome = record.outcome ? OUTCOME[record.outcome] : null;
  return (
    <li className="flex min-h-[64px] items-center gap-3 rounded-2xl ink-border bg-white px-3 py-2">
      {species
        ? <CreatureBadge kind={species.kind} color={species.color} image={species.image} size={44} />
        : <CreatureBadge kind="unknown" color="#e6e3f0" size={44} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-extrabold">
          {species ? species.displayName : 'Batalha'}
          {record.level !== null && <span className="font-bold text-tinta-suave"> · Nv. {record.level}</span>}
        </span>
        <span className="text-xs font-bold text-tinta-suave">{formatWhen(record.at)}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        {outcome && (
          <span className="rounded-full border-2 border-tinta px-2 py-0.5 text-[11px] font-extrabold" style={{ background: outcome.bg }}>{outcome.label}</span>
        )}
        <span className="text-xs font-extrabold">+{record.points} pts</span>
      </span>
    </li>
  );
}

/** Histórico das batalhas do jogador (vem dos eventos sincronizados com o servidor). */
export function HistoryPage() {
  const { player } = usePlayer();
  const sync = useSync();
  const records = [...player.history].reverse();
  const captured = player.history.filter((record) => record.captured).length;

  return (
    <TabScreen active="profile" label="Minhas batalhas">
      <header className="flex items-center gap-3">
        <BackLink to={ROUTES.profile} label="Voltar ao perfil" />
        <h1 className="m-0 font-display text-[30px] leading-none font-bold">Minhas batalhas</h1>
      </header>

      <p className="mt-3 mb-0 text-sm font-bold text-tinta-suave">
        {player.history.length} {player.history.length === 1 ? 'batalha' : 'batalhas'} · {captured} {captured === 1 ? 'captura' : 'capturas'}
        {sync.enabled && sync.signedIn && (
          sync.pending > 0
            ? ` · ${sync.pending} ${sync.pending === 1 ? 'jogada esperando' : 'jogadas esperando'} para ir ao servidor`
            : ' · tudo salvo no servidor'
        )}
      </p>

      {records.length === 0 ? (
        <p className="mt-6 mb-0 rounded-2xl ink-border bg-white px-4 py-6 text-center text-sm font-bold text-tinta-suave">
          Nenhuma batalha ainda. Encontre um Pokémon no mapa e toque em Batalhar.
        </p>
      ) : (
        <ol aria-label="Batalhas" className="mt-4 mb-0 flex list-none flex-col gap-2 p-0">
          {records.map((record) => <HistoryRow key={record.battleId} record={record} />)}
        </ol>
      )}
    </TabScreen>
  );
}
