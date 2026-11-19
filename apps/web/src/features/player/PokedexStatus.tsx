import { useSpeciesRegistered } from './PlayerProvider.js';

export function PokedexStatus({ speciesId }: { speciesId: string }) {
  const registered = useSpeciesRegistered(speciesId);
  if (registered === undefined) return null;
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold text-tinta ${registered ? 'bg-verde' : 'bg-amarelo'}`}>
      <span aria-hidden="true">{registered ? '✓' : '✦'}</span>
      {registered ? 'Já registrado na Pokédex' : 'Falta registrar na Pokédex'}
    </span>
  );
}
