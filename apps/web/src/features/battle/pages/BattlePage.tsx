import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { navigate, ROUTES } from '../../../app/router.js';
import { ConnectionStatus } from '../../../components/ConnectionStatus.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { getSpecies } from '../../catalog/species.js';
import { Arena } from '../components/Arena.js';
import { HpCard } from '../components/HpCard.js';
import { useBattle } from '../BattleProvider.js';
import { activeMember, attack, flee, movesOf, switchTo, type BattleState } from '../battleState.js';
import { describeTurn, TURN_TIMING, type TurnAnimation } from '../turnAnimation.js';

const TYPE_BG: Record<string, string> = {
  Normal: '#ece9f5', Planta: '#7ad88f', Água: '#6aa8ff', Fogo: '#ff8a5c', Elétrico: '#ffc23d', Voador: '#c9b8ff', Pedra: '#d9c3a0', Luz: '#ffd76a',
};

const bigAction = 'flex flex-col items-center justify-center gap-1 rounded-[20px] font-display text-[22px] font-bold text-tinta disabled:opacity-60';
const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

function DamagePop({ amount, at, className }: { amount: number; at: number; className: string }) {
  if (amount <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`dmg-pop pointer-events-none absolute z-10 rounded-xl sticker-sm bg-white px-2.5 py-0.5 font-display text-2xl font-bold text-coral ${className}`}
      style={delay(at)}
    >
      −{amount}
    </span>
  );
}

export function BattlePage() {
  const { battle, update } = useBattle();
  const [mode, setMode] = useState<'main' | 'attack' | 'switch'>('main');
  const [anim, setAnim] = useState<TurnAnimation | null>(null);
  const animKey = useRef(0);

  useEffect(() => {
    if (!battle) {
      navigate(ROUTES.map, { replace: true });
      return;
    }
    if (battle.status === 'active') return;
    // Espera a animação de desmaio antes de mostrar o resultado.
    const wait = battle.status === 'won' || battle.status === 'lost' ? (anim?.durationMs ?? 0) + 400 : 0;
    const id = window.setTimeout(() => navigate(ROUTES.battleResult, { replace: true }), wait);
    return () => window.clearTimeout(id);
  }, [battle, anim]);

  useEffect(() => {
    // Mantém a última animação (ex.: desmaio) quando a batalha acabou, até ir para o resultado.
    if (!anim || battle?.status !== 'active') return;
    const id = window.setTimeout(() => setAnim((current) => (current?.key === anim.key ? null : current)), anim.durationMs + 50);
    return () => window.clearTimeout(id);
  }, [anim, battle?.status]);

  if (!battle) return null;

  const busy = anim !== null || battle.status !== 'active';
  const act = (next: (state: BattleState) => BattleState, playerAttacked: boolean) => {
    const after = next(battle);
    if (after === battle) return;
    animKey.current += 1;
    setAnim(describeTurn(battle, after, playerAttacked, animKey.current));
    update(() => after);
    setMode('main');
  };

  const me = activeMember(battle);
  const mySpecies = getSpecies(me.speciesId);
  const foeSpecies = getSpecies(battle.foe.speciesId);
  const currentMode = battle.mustSwitch && !anim ? 'switch' : mode;

  // Duas camadas por Pokémon: a de fora avança quando ataca; a de dentro treme (ou desmaia) quando apanha.
  // O "key" muda a cada turno para reiniciar as animações.
  const counterAt = anim?.counterAt ?? 0;
  const foeOuter = anim?.foeAttacked ? 'atk-lunge-foe' : '';
  const foeInner = anim?.foeFainted ? 'faint' : anim && anim.foeDamage > 0 ? 'hit-shake' : '';
  const foeInnerDelay = anim?.foeFainted ? TURN_TIMING.faintDelay : TURN_TIMING.hitDelay;
  const meOuter = anim?.playerAttacked ? 'atk-lunge-player' : '';
  const meInner = anim?.playerFainted ? 'faint' : anim && anim.playerDamage > 0 ? 'hit-shake' : '';
  const meInnerDelay = counterAt + (anim?.playerFainted ? TURN_TIMING.faintDelay : TURN_TIMING.hitDelay);
  const turnKey = anim?.key ?? animKey.current;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-creme text-tinta">
      <Arena height={420}>
        <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
          <span className="rounded-full bg-tinta px-3 py-1 font-display text-[15px] font-semibold text-amarelo">Turno {battle.turn}</span>
          <ConnectionStatus />
        </div>
        <HpCard combatant={battle.foe} note="selvagem" className="absolute top-[62px] left-3.5" />

        <div className="absolute top-[92px] right-[54px]">
          <div key={`foe-${turnKey}`} className={foeOuter} style={delay(counterAt)}>
            <div className={foeInner} style={delay(foeInnerDelay)}>
              <CreatureBadge kind={foeSpecies.kind} color={foeSpecies.color} size={108} label={foeSpecies.displayName} />
            </div>
          </div>
          {anim && <DamagePop key={`dmg-foe-${anim.key}`} amount={anim.foeDamage} at={TURN_TIMING.hitDelay} className="-top-6 left-8" />}
        </div>

        <div className="absolute top-[222px] left-11">
          <div key={`me-${turnKey}`} className={meOuter}>
            <div className={meInner} style={delay(meInnerDelay)}>
              <CreatureBadge kind={mySpecies.kind} color={mySpecies.color} size={124} label={mySpecies.displayName} />
            </div>
          </div>
          {anim && <DamagePop key={`dmg-me-${anim.key}`} amount={anim.playerDamage} at={counterAt + TURN_TIMING.hitDelay} className="-top-6 left-10" />}
        </div>
        <HpCard combatant={me} className="absolute top-[262px] right-3.5" />
      </Arena>

      <div className="px-4 pt-3.5">
        <p role="log" aria-live="polite" className="m-0 min-h-[46px] rounded-2xl ink-border bg-white px-3.5 py-3 text-[15px] leading-snug font-bold">
          {battle.mustSwitch ? `${battle.log} Quem entra agora?` : battle.log}
        </p>
      </div>

      <section aria-label="Ações" className="flex flex-1 flex-col gap-2.5 px-4 pt-3.5 pb-6">
        {currentMode === 'main' && (
          <>
            <div className="grid min-h-[200px] flex-1 grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={() => setMode('attack')} className={`${bigAction} sticker bg-coral`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4l6 6-9 9H5v-6z" /><path d="M12 6l6 6" /></svg>
                Atacar
              </button>
              <button type="button" disabled={busy} onClick={() => navigate(ROUTES.capture)} className={`${bigAction} sticker bg-amarelo`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /><path d="M4 12h5.5M14.5 12H20" /></svg>
                Capturar
                <span className="font-sans text-xs font-extrabold">Escolher a bola</span>
              </button>
              <button type="button" onClick={() => setMode('switch')} disabled={busy || battle.team.length < 2} className={`${bigAction} sticker bg-azul disabled:bg-lilas disabled:text-tinta-suave disabled:shadow-none`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" /></svg>
                Trocar
              </button>
              <button type="button" disabled={busy} onClick={() => update(flee)} className={`${bigAction} ink-border bg-white`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 5l7 7-7 7M20 12H6" /><path d="M4 5v14" /></svg>
                Fugir
              </button>
            </div>
            <p className="m-0 text-center text-xs font-bold text-tinta-suave">
              Dica: enfraqueça sem derrotar. Derrotar dá XP; capturar exige a bola.
            </p>
          </>
        )}

        {currentMode === 'attack' && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {movesOf(me).map((move) => (
                <button
                  key={move.id}
                  type="button"
                  disabled={busy}
                  onClick={() => act((state) => attack(state, move.id), true)}
                  className="flex min-h-[76px] flex-col items-start gap-1.5 rounded-[18px] sticker-sm bg-white px-3 py-2.5 text-left"
                >
                  <span className="font-display text-lg font-semibold">{move.name}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full border-2 border-tinta px-2 text-[11px] font-extrabold" style={{ background: TYPE_BG[move.type] ?? '#ece9f5' }}>{move.type}</span>
                    <span className="text-xs font-extrabold text-tinta-suave">Poder {move.power}</span>
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setMode('main')} className="min-h-11 font-extrabold underline underline-offset-4">Voltar</button>
          </>
        )}

        {currentMode === 'switch' && (
          <>
            {battle.team.map((member, index) => {
              const species = getSpecies(member.speciesId);
              const unavailable = member.hp <= 0 || index === battle.activeIndex;
              return (
                <button
                  key={member.creatureId}
                  type="button"
                  disabled={unavailable || busy}
                  onClick={() => act((state) => switchTo(state, index), false)}
                  className={`flex min-h-[60px] items-center gap-3 rounded-[18px] ink-border px-3 py-1.5 text-left ${unavailable ? 'bg-lilas' : 'bg-white'}`}
                >
                  <CreatureBadge kind={species.kind} color={species.color} size={40} />
                  <span className="flex-1 text-[15px] font-extrabold">{species.displayName} <span className="text-tinta-suave">Nv. {member.level}</span></span>
                  <span className="text-xs font-extrabold text-tinta-suave">
                    {index === battle.activeIndex ? 'Em campo' : member.hp <= 0 ? 'Desmaiado' : `PV ${member.hp}/${member.maxHp}`}
                  </span>
                </button>
              );
            })}
            {!battle.mustSwitch && <button type="button" onClick={() => setMode('main')} className="min-h-11 font-extrabold underline underline-offset-4">Voltar</button>}
          </>
        )}
      </section>
    </main>
  );
}
