import { getSpecies } from '../../catalog/species.js';

/** Duração da animação, casada com a música de evolução (evolucao.mp3 tem ~4,9 s). */
export const EVOLUTION_SCENE_MS = 4_800;

interface EvolutionSceneProps {
  from: string;
  to: string;
  onClose: () => void;
}

/**
 * Animação de evolução em tela cheia, no estilo clássico:
 * 1. o Pokémon aparece normal ("… está evoluindo!");
 * 2. vira uma silhueta brilhante que alterna entre a forma antiga e a nova, cada vez mais rápido;
 * 3. um clarão branco;
 * 4. a forma nova aparece colorida, com brilhos ("Parabéns!").
 * O tempo de cada fase está em index.css (.evo-*) e acompanha a música, tocada pelo álbum.
 */
export function EvolutionScene({ from, to, onClose }: EvolutionSceneProps) {
  const before = getSpecies(from);
  const after = getSpecies(to);
  const title = `${before.displayName} evoluiu para ${after.displayName}!`;

  return (
    <dialog
      ref={(node) => {
        if (node && !node.open) node.showModal();
      }}
      onCancel={onClose}
      aria-labelledby="evolution-title"
      className="evo-scene fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-[radial-gradient(circle_at_50%_40%,#3a3770_0%,#14132e_70%)] p-0 text-white backdrop:bg-black/80"
    >
      <h2 id="evolution-title" className="sr-only">{title}</h2>
      <div className="relative flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <div aria-hidden="true" className="evo-rays" />
        <div className="evo-stage relative grid size-56 place-items-center">
          <img className="evo-from col-start-1 row-start-1 size-48 object-contain" src={before.image} alt="" />
          <img className="evo-to col-start-1 row-start-1 size-48 object-contain" src={after.image} alt="" />
          <span aria-hidden="true" className="evo-sparkles" />
        </div>

        <div className="relative grid min-h-[72px] w-full max-w-sm place-items-center font-display">
          <p className="evo-text-start col-start-1 row-start-1 m-0 text-2xl font-bold">O quê? {before.displayName} está evoluindo!</p>
          <p className="evo-text-end col-start-1 row-start-1 m-0 text-2xl font-bold">
            Parabéns! {before.displayName} evoluiu para <span className="text-amarelo">{after.displayName}</span>!
          </p>
        </div>

        <button type="button" onClick={onClose} className="evo-continue rounded-[18px] sticker bg-amarelo px-8 py-3 font-display text-lg font-bold text-tinta">
          Continuar
        </button>
      </div>
      <div aria-hidden="true" className="evo-flash" />
    </dialog>
  );
}
