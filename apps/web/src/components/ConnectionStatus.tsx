import { useEffect, useState } from 'react';

export function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full ink-border bg-white px-3 py-1.5 text-[13px] font-extrabold text-tinta">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border-2 border-tinta ${online ? 'bg-verde-forte' : 'bg-coral'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
