import type { ReactNode } from 'react';
import { Link, ROUTES } from '../../app/router.js';

type Tab = 'map' | 'collection' | 'team' | 'profile';

const TABS: { id: Tab; label: string; to: string; icon: string }[] = [
  { id: 'map', label: 'Mapa', to: ROUTES.map, icon: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>' },
  { id: 'collection', label: 'Coleção', to: ROUTES.collection, icon: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>' },
  { id: 'team', label: 'Equipe', to: ROUTES.team, icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>' },
  { id: 'profile', label: 'Perfil', to: ROUTES.profile, icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>' },
];

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="grid grid-cols-4 gap-2 border-t-[2.5px] border-tinta bg-white px-3 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] font-display"
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={on ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[13px] font-semibold text-tinta no-underline ${on ? 'sticker-sm bg-amarelo' : 'border-[2.5px] border-transparent'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tab.icon }} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tela com barra inferior: conteúdo rolável + navegação fixa. */
export function TabScreen({ active, children, label }: { active: Tab; children: ReactNode; label: string }) {
  return (
    <div className="flex h-full flex-col bg-creme text-tinta">
      <main aria-label={label} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-md px-5 pt-6 pb-6">{children}</div>
      </main>
      <div className="mx-auto w-full max-w-md md:max-w-none">
        <BottomNav active={active} />
      </div>
    </div>
  );
}
