/**
 * Volume das músicas e efeitos.
 *
 * No iPhone/iPad o Safari ignora `audio.volume` (toca sempre no máximo). Por isso, quando o
 * navegador tem Web Audio, o som passa por um ganho (GainNode), que todos respeitam. Sem Web
 * Audio (ex.: testes), usa o `volume` do próprio elemento.
 *
 * O Web Audio também precisa ser liberado num toque do jogador: `resumeOutput` é chamado nos
 * toques que iniciam som e em qualquer toque enquanto estiver suspenso.
 */

export interface Level {
  get(): number;
  set(value: number): void;
}

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;
let touchBound = false;

function audioContextClass(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function getContext(): AudioContext | null {
  if (context) return context;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  if (!touchBound && typeof document !== 'undefined') {
    touchBound = true;
    // O sistema pode suspender o áudio (ligação, app em segundo plano): o próximo toque religa.
    document.addEventListener('pointerdown', resumeOutput, true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resumeOutput();
    });
  }
  return context;
}

export function resumeOutput(): void {
  if (context && context.state !== 'running') void context.resume().catch(() => {});
}

/** Controle de volume do elemento (ligado ao ganho do Web Audio quando existe). */
export function levelFor(element: HTMLAudioElement): Level {
  const ctx = getContext();
  if (ctx) {
    try {
      const source = ctx.createMediaElementSource(element);
      const gain = ctx.createGain();
      source.connect(gain).connect(ctx.destination);
      element.volume = 1;
      return {
        get: () => gain.gain.value,
        set: (value) => {
          gain.gain.value = Math.max(0, Math.min(1, value));
        },
      };
    } catch {
      // segue com o volume do elemento
    }
  }
  return {
    get: () => element.volume,
    set: (value) => {
      element.volume = Math.max(0, Math.min(1, value));
    },
  };
}

/** Para os testes. */
export function resetOutputForTests(): void {
  context = null;
  touchBound = false;
}
