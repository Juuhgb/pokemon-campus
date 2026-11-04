import { useLiveQuery } from 'dexie-react-hooks';
import { database } from '../sync/database.js';

export function HomePage() {
  const pendingEvents = useLiveQuery(() => database.outbox.count(), [], 0);

  return (
    <section className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <p className="text-sm text-slate-400">Seu campus, sua aventura</p>
        <h2 className="mt-3 text-2xl font-semibold">O projeto está pronto para começar.</h2>
        <p className="mt-3 max-w-xl leading-7 text-slate-300">
          A interface já identifica quando a conexão cai. O armazenamento local e o contrato de eventos estão preparados para registrar ações e sincronizá-las depois.
        </p>
      </div>
      <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm text-slate-400">Sincronização</p>
        <p className="mt-3 text-3xl font-bold">{pendingEvents ?? 0}</p>
        <p className="mt-1 text-slate-300">eventos aguardando envio</p>
        <p className="mt-6 text-sm leading-6 text-slate-400">Os dados ficam no IndexedDB deste navegador e podem continuar disponíveis offline.</p>
      </aside>
    </section>
  );
}

