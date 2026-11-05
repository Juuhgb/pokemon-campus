import { useLiveQuery } from 'dexie-react-hooks';
import { Link, navigate, ROUTES } from '../../../app/router.js';
import { BallIcon, BALL_NAME } from '../../../components/ui/BallIcon.js';
import { TabScreen } from '../../../components/ui/BottomNav.js';
import { database } from '../../../sync/database.js';
import { SPECIES } from '../../catalog/species.js';
import { usePlayer } from '../../player/PlayerProvider.js';
import { COURSES, countBySpecies, initials, type BallItem } from '../../player/playerState.js';
import { rankingFor } from '../ranking.js';

export function ProfilePage() {
  const { player, dispatch } = usePlayer();
  const pendingEvents = useLiveQuery(() => database.outbox.count(), [], 0) ?? 0;
  const course = COURSES.find((item) => item.slug === player.course);
  const discovered = countBySpecies(player.creatures).size;
  const position = rankingFor(player, 'all').find((row) => row.me)?.rank;

  const signOut = () => {
    if (!window.confirm('Sair da conta e apagar o progresso salvo neste aparelho?')) return;
    dispatch({ type: 'reset' });
    navigate(ROUTES.welcome, { replace: true });
  };

  return (
    <TabScreen active="profile" label="Perfil">
      <header className="flex items-center gap-3.5">
        <span aria-hidden="true" className="grid h-[66px] w-[66px] shrink-0 place-items-center rounded-[22px] sticker bg-azul font-display text-[26px] font-bold">
          {initials(player.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate font-display text-[28px] leading-tight font-bold">{player.displayName}</h1>
          <p className="mt-0.5 mb-0 text-sm font-bold text-tinta-suave">{course?.label}</p>
        </div>
        <Link to={ROUTES.settings} aria-label="Configurações" className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] sticker-sm bg-white text-tinta">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
        </Link>
      </header>

      <Link to={ROUTES.ranking} className="mt-4 flex items-center justify-between gap-3 rounded-[22px] sticker-lg bg-coral px-4.5 py-4 text-tinta no-underline">
        <span>
          <span className="block text-[13px] font-extrabold">Pontuação</span>
          <span className="block font-display text-[40px] leading-none font-bold">{player.score.toLocaleString('pt-BR')}</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-[14px] ink-border bg-white px-3 py-2 text-[15px] font-extrabold">
          {position ? `${position}º lugar` : 'Ranking'}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </Link>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        {[
          [player.captures, 'Capturas'],
          [`${discovered}/${SPECIES.length}`, 'Espécies'],
          [player.battles, 'Batalhas'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-[18px] ink-border bg-white p-3">
            <div className="font-display text-[28px] font-bold">{value}</div>
            <div className="text-xs font-extrabold text-tinta-suave">{label}</div>
          </div>
        ))}
      </div>

      <section aria-labelledby="items-title" className="mt-3.5 flex flex-col gap-2.5 rounded-[22px] ink-border bg-white px-4 py-3.5">
        <h2 id="items-title" className="m-0 font-display text-[21px] font-semibold">Mochila</h2>
        {(['POKE_BALL', 'GREAT_BALL'] as BallItem[]).map((item) => (
          <div key={item} className="flex items-center gap-3">
            <BallIcon item={item} size={40} />
            <span className="flex-1 text-[15px] font-extrabold">{BALL_NAME[item]}</span>
            <span className="font-display text-[22px] font-bold">×{player.inventory[item]}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="sync-title" className="mt-3.5 flex flex-col gap-2 rounded-[22px] ink-border bg-amarelo px-4 py-3.5">
        <h2 id="sync-title" className="m-0 font-display text-[21px] font-semibold">Sincronização</h2>
        <p className="m-0 text-sm leading-snug font-bold">
          {pendingEvents === 0 ? 'Nenhuma ação esperando para enviar.' : `${pendingEvents} ${pendingEvents === 1 ? 'ação esperando' : 'ações esperando'} para enviar.`}{' '}
          O progresso deste protótipo fica salvo neste aparelho.
        </p>
      </section>

      <button type="button" onClick={signOut} className="mt-3 min-h-11 w-full text-[15px] font-extrabold text-perigo underline underline-offset-4">
        Sair da conta
      </button>
    </TabScreen>
  );
}
