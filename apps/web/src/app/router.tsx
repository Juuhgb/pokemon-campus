import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/** Rotas do app. O Firebase Hosting e o Vite devolvem index.html para qualquer caminho. */
export const ROUTES = {
  map: '/',
  collection: '/colecao',
  team: '/equipe',
  profile: '/perfil',
  ranking: '/ranking',
  settings: '/configuracoes',
  welcome: '/boas-vindas',
  starter: '/inicial',
  location: '/localizacao',
  battle: '/batalha',
  capture: '/captura',
  battleResult: '/resultado',
  admin: '/admin',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

const NAVIGATE_EVENT = 'pokemon-campus:navigate';

export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const getPath = () => normalizePath(window.location.pathname);

export function usePath(): string {
  return useSyncExternalStore(subscribe, getPath, () => '/');
}

export function navigate(to: string, { replace = false }: { replace?: boolean } = {}) {
  if (normalizePath(to) === getPath()) return;
  if (replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo(0, 0);
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; replace?: boolean };

/** Link interno sem recarregar a página. */
export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to, { replace });
  };
  return <a href={to} onClick={handleClick} {...rest}>{children}</a>;
}
