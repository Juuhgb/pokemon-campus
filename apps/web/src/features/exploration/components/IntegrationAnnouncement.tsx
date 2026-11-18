import { useEffect, useState } from 'react';
import { integrationAppearance } from '../data/integrationEvent.js';
import { useNow } from '../hooks/useNow.js';

const localTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
});

/** Quanto tempo o aviso fica na tela. */
export const ANNOUNCEMENT_MS = 15_000;
const SEEN_PREFIX = 'pokemon-campus:aviso-evento:';

function seen(spawnId: string): boolean {
  try {
    return window.localStorage.getItem(SEEN_PREFIX + spawnId) === '1';
  } catch {
    return false;
  }
}

function markSeen(spawnId: string): void {
  try {
    window.localStorage.setItem(SEEN_PREFIX + spawnId, '1');
  } catch {
    // sem armazenamento: pode aparecer de novo ao reabrir, sem problema
  }
}

/**
 * Aviso do XII Evento de Integração: aparece uma vez por aparição do Jirachi neste aparelho,
 * tanto para quem estava jogando quando ele surgiu quanto para quem abre o jogo no meio dos
 * 30 minutos. Só conta como visto com o jogo na tela (não some com o app em segundo plano).
 */
export function IntegrationAnnouncement({ clock = Date.now }: { clock?: () => number }) {
  const now = useNow(1000, clock);
  const event = integrationAppearance(now);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const visibilityChanged = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => document.removeEventListener('visibilitychange', visibilityChanged);
  }, []);
  if (!event || !visible) return null;
  // `key`: um aviso novo para cada aparição.
  return <Notice key={event.spawn.spawnId} spawnId={event.spawn.spawnId} sector={event.sector} ends={event.ends} />;
}

function Notice({ spawnId, sector, ends }: { spawnId: string; sector: string; ends: number }) {
  const [open, setOpen] = useState(() => !seen(spawnId));

  useEffect(() => {
    if (!open) return;
    markSeen(spawnId);
    const id = window.setTimeout(() => setOpen(false), ANNOUNCEMENT_MS);
    return () => window.clearTimeout(id);
  }, [open, spawnId]);

  if (!open) return null;
  return (
    <aside className="fixed inset-x-3 top-3 z-[2000] mx-auto flex max-w-md items-start gap-3 rounded-2xl sticker bg-amarelo p-3 text-tinta">
      <div role="status" className="flex-1">
        <strong className="font-display">XII Evento de Integração da UENP</strong>
        <p className="m-0 text-sm">Jirachi apareceu no setor de <b>{sector}</b>! Aproxime-se para encontrá-lo até as {localTime.format(ends)}.</p>
      </div>
      <button type="button" aria-label="Fechar anúncio do evento" className="rounded-lg ink-border bg-white px-2 py-1 text-sm font-bold"
        onClick={() => setOpen(false)}>Fechar</button>
    </aside>
  );
}
