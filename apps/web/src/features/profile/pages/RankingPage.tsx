import { useState } from 'react';
import { ROUTES } from '../../../app/router.js';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { BackLink } from '../../../components/ui/ui.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { COURSES, initials } from '../../player/playerState.js';
import { rankingFor } from '../ranking.js';

const MEDALS = ['#ffc23d', '#ece9f5', '#ff8a5c'];
const courseLabel = (slug: string) => COURSES.find((course) => course.slug === slug)?.label ?? slug;

export function RankingPage() {
  const { player } = usePlayer();
  const [scope, setScope] = useState<'all' | 'course'>('all');
  const rows = rankingFor(player, scope);
  const podium = [rows[1], rows[0], rows[2]].filter((row) => row !== undefined);
  const rest = rows.slice(3);

  return (
    <TabScreen active="profile" label="Ranking">
      <header className="flex items-center gap-3">
        <BackLink to={ROUTES.profile} label="Voltar ao perfil" />
        <h1 className="m-0 font-display text-[32px] leading-none font-bold">Ranking</h1>
      </header>

      <div role="group" aria-label="Escopo do ranking" className="mt-4 grid grid-cols-2 gap-2">
        {([['all', 'Geral'], ['course', 'Meu curso']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={scope === id}
            onClick={() => setScope(id)}
            className={`h-11 rounded-[14px] text-sm font-extrabold ${scope === id ? 'sticker-sm bg-amarelo' : 'ink-border bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section aria-label="Pódio" className="mt-5 grid grid-cols-3 items-end gap-2.5">
        {podium.map((row) => {
          const place = row.rank - 1;
          return (
            <div key={`${row.rank}-${row.name}`} className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className="grid place-items-center rounded-[18px] sticker-sm font-display text-lg font-bold"
                style={{ width: place === 0 ? 62 : 52, height: place === 0 ? 62 : 52, background: row.me ? '#6aa8ff' : '#ffffff' }}
              >
                {initials(row.name)}
              </span>
              <span className="text-center text-sm font-extrabold">{row.me ? 'Você' : row.name.split(' ')[0]}</span>
              <span className="text-xs font-extrabold text-tinta-suave">{row.score.toLocaleString('pt-BR')} pts</span>
              <div
                className="flex w-full items-start justify-center rounded-[14px_14px_6px_6px] ink-border pt-1.5 font-display text-[28px] font-bold"
                style={{ height: place === 0 ? 100 : place === 1 ? 74 : 58, background: MEDALS[place] }}
              >
                {row.rank}º
              </div>
            </div>
          );
        })}
      </section>

      <ol aria-label="Classificação" className="mt-4 mb-0 flex list-none flex-col gap-2 p-0">
        {rest.map((row) => (
          <li
            key={`${row.rank}-${row.name}`}
            className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-3.5 py-1.5 ${row.me ? 'sticker bg-azul' : 'ink-border bg-white'}`}
          >
            <span className="w-6 font-display text-lg font-bold">{row.rank}</span>
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl border-2 border-tinta bg-lilas text-[13px] font-extrabold">{initials(row.name)}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-extrabold">{row.name}{row.me ? ' (você)' : ''}</span>
              <span className="text-xs font-bold text-tinta-suave">{courseLabel(row.course)}</span>
            </span>
            <span className="font-display text-lg font-bold">{row.score.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 mb-0 text-xs font-bold text-tinta-suave">Outros jogadores são de exemplo até o ranking da API ficar pronto.</p>
    </TabScreen>
  );
}
