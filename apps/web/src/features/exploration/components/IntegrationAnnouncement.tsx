import { useEffect, useState } from 'react';
import { integrationAppearance } from '../data/integrationEvent.js';
import { useNow } from '../hooks/useNow.js';

const localTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
});

export function IntegrationAnnouncement({ clock = Date.now }: { clock?: () => number }) {
  const now = useNow(1000, clock);
  const event = integrationAppearance(now);
  const [visibleSince, setVisibleSince] = useState(() => document.hidden ? Infinity : clock());
  useEffect(() => {
    const visibilityChanged = () => setVisibleSince(document.hidden ? Infinity : clock());
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => document.removeEventListener('visibilitychange', visibilityChanged);
  }, [clock]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!event || visibleSince > event.begins || now.getTime() >= event.begins + 15_000 || dismissed === event.spawn.spawnId) return null;

  return (
    <aside className="fixed inset-x-3 top-3 z-[2000] mx-auto flex max-w-md items-start gap-3 rounded-2xl sticker bg-amarelo p-3 text-tinta">
      <div role="status" className="flex-1">
        <strong className="font-display">XII Evento de Integração da UENP</strong>
        <p className="m-0 text-sm">Jirachi apareceu no setor de <b>{event.sector}</b>! Aproxime-se para encontrá-lo até as {localTime.format(event.ends)}.</p>
      </div>
      <button type="button" aria-label="Fechar anúncio do evento" className="rounded-lg ink-border bg-white px-2 py-1 text-sm font-bold"
        onClick={() => setDismissed(event.spawn.spawnId)}>Fechar</button>
    </aside>
  );
}
