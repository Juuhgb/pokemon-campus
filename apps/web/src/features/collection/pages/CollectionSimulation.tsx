import { useState } from 'react';
import { OpeningMusic } from '../../audio/OpeningMusic.js';
import { SPECIES } from '../../catalog/species.js';
import { PlayerProvider } from '../../player/PlayerProvider.js';
import { INITIAL_PLAYER, newCreature } from '../../player/playerState.js';
import { CollectionPage } from './CollectionPage.js';

export function CollectionSimulation() {
  const [speciesId, setSpeciesId] = useState('brotinho');
  const [player, setPlayer] = useState(() => ({
    ...INITIAL_PLAYER,
    onboarded: true,
    creatures: [newCreature('demo-bulbasaur', 'brotinho', 20, new Date().toISOString())],
  }));

  function addCreature() {
    const creature = newCreature(crypto.randomUUID(), speciesId, 20, new Date().toISOString());
    setPlayer(current => ({ ...current, creatures: [...current.creatures, creature] }));
  }

  return (
    <PlayerProvider initial={player}>
      <OpeningMusic />
      <div className="flex h-dvh flex-col bg-creme">
        <section aria-label="Coleção de teste" className="mx-auto w-full max-w-md space-y-2 px-5 pt-4">
          <h1 className="font-display text-xl">Coleção de teste</h1>
          <p className="text-sm">Bulbasaur já pode evoluir. Abra “Ver na Pokédex” no álbum. Recarregar a página reinicia o teste.</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Espécie de teste" className="rounded-lg ink-border bg-white p-2" value={speciesId} onChange={event => setSpeciesId(event.target.value)}>
              {SPECIES.map(species => <option key={species.id} value={species.id}>{species.displayName}</option>)}
            </select>
            <button type="button" className="rounded-lg ink-border bg-amarelo px-3 py-2 font-bold" onClick={addCreature}>Adicionar no nível 20</button>
          </div>
        </section>
        <div className="min-h-0 flex-1"><CollectionPage /></div>
      </div>
    </PlayerProvider>
  );
}
