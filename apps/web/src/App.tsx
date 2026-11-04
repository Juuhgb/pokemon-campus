import { useRegisterSW } from 'virtual:pwa-register/react';
import { ConnectionStatus } from './components/ConnectionStatus.js';
import { HomePage } from './pages/HomePage.js';

export default function App() {
  useRegisterSW({ immediate: true });

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Jogo de exploração</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Pokémon Campus</h1>
          </div>
          <ConnectionStatus />
        </header>
        <HomePage />
      </div>
    </main>
  );
}

