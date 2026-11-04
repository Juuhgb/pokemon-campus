import { navigate, ROUTES } from '../../../app/router.js';
import { CreatureBadge } from '../../../components/ui/CreatureBadge.js';
import { StepDots } from '../../../components/ui/ui.js';
import { usePlayer } from '../../player/PlayerProvider.js';

/** Conta usada enquanto o login real com Google (módulo de autenticação) não existe. */
export const SIMULATED_GOOGLE_ACCOUNT = 'Conta Google (simulada)';

export function WelcomePage() {
  const { dispatch } = usePlayer();

  const continueWithGoogle = () => {
    dispatch({ type: 'linkGoogle', email: SIMULATED_GOOGLE_ACCOUNT });
    navigate(ROUTES.starter);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-creme px-6 pt-6 pb-8 text-tinta">
      <div aria-hidden="true" className="relative -mx-1 h-[340px]">
        <div className="absolute inset-x-2.5 top-5 bottom-8 -rotate-3 rounded-[36px] sticker-lg bg-azul" />
        <div className="absolute inset-x-8 top-10 bottom-12 rotate-2 rounded-[30px] ink-border bg-amarelo" />
        <div className="absolute top-[70px] left-[50px] -rotate-8"><CreatureBadge kind="leaf" color="#7ad88f" image="/pokemon/bulbasaur.png" size={76} /></div>
        <div className="absolute top-16 right-[52px] rotate-10"><CreatureBadge kind="drop" color="#6aa8ff" image="/pokemon/squirtle.png" size={68} /></div>
        <div className="absolute top-[136px] left-1/2 -translate-x-1/2"><CreatureBadge kind="bolt" color="#ffffff" image="/pokemon/pikachu.png" size={96} /></div>
        <div className="absolute bottom-16 left-[62px] rotate-6"><CreatureBadge kind="flame" color="#ff8a5c" image="/pokemon/charmander.png" size={64} /></div>
        <div className="absolute right-[60px] bottom-[70px] -rotate-6"><CreatureBadge kind="leaf" color="#b6e388" image="/pokemon/chikorita.png" size={60} /></div>
      </div>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1 className="m-0 font-display text-[46px] leading-[0.95] font-bold">Pokémon<br />Campus</h1>
        <p className="m-0 max-w-[300px] text-base leading-snug font-bold text-tinta-suave">
          Caminhe pelo campus, encontre Pokémon e complete seu álbum — mesmo sem internet.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-3.5 pt-8">
        <button
          type="button"
          onClick={continueWithGoogle}
          className="flex h-[60px] items-center justify-center gap-3 rounded-[18px] sticker-lg bg-white font-display text-[19px] font-semibold"
        >
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full ink-border text-[15px] font-bold">G</span>
          Continuar com Google
        </button>
        <p className="m-0 text-center text-[13px] leading-normal font-semibold text-tinta-suave">
          Login simulado nesta versão. Ao continuar, você concorda com os Termos de uso e a Política de privacidade.
        </p>
        <StepDots step={1} />
      </div>
    </main>
  );
}
