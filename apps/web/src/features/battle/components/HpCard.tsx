import { hpColor, ProgressBar } from '../../../components/ui/ui.js';
import { getSpecies } from '../../catalog/species.js';
import type { Combatant } from '../battleState.js';

export function HpCard({ combatant, note, className }: { combatant: Combatant; note?: string; className?: string }) {
  const species = getSpecies(combatant.speciesId);
  const percent = (Math.max(0, combatant.hp) / combatant.maxHp) * 100;
  return (
    <div className={`w-[180px] rounded-2xl sticker bg-white px-3 py-2.5 ${className ?? ''}`}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[17px] font-semibold">{species.displayName}</span>
        <span className="text-xs font-extrabold">Nv. {combatant.level}</span>
      </div>
      <div className="mt-1.5"><ProgressBar percent={percent} color={hpColor(percent)} label={`Vida de ${species.displayName}`} /></div>
      <span className="text-[11px] font-extrabold text-tinta-suave">PV {Math.max(0, combatant.hp)}/{combatant.maxHp}{note ? ` · ${note}` : ''}</span>
    </div>
  );
}
