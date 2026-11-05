import type { BallItem } from '../../features/player/playerState.js';

interface BallIconProps {
  item: BallItem;
  size?: number;
  className?: string;
}

export const BALL_NAME: Record<BallItem, string> = {
  POKE_BALL: 'Pokébola',
  GREAT_BALL: 'Grande bola',
};

/** Pokébola (topo coral) e Grande bola (topo azul com dois riscos vermelhos). */
export function BallIcon({ item, size = 44, className }: BallIconProps) {
  const great = item === 'GREAT_BALL';
  const inkPx = size >= 80 ? 3 : size >= 40 ? 2.5 : 2;
  const stroke = Math.max(1.2, (inkPx * 24) / size);
  const thin = stroke * 0.6;
  const shadow = size >= 64 ? '5px 5px 0 #1d1b3a' : size >= 36 ? '3px 3px 0 #1d1b3a' : 'none';

  return (
    <span className={`inline-block shrink-0 rounded-full ${className ?? ''}`} style={{ width: size, height: size, boxShadow: shadow }}>
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={BALL_NAME[item]} className="block">
        <circle cx="12" cy="12" r="10.6" fill="#ffffff" />
        <path d="M1.4 12a10.6 10.6 0 0 1 21.2 0z" fill={great ? '#3b82f6' : '#ff5a4e'} />
        {great && (
          <>
            <path d="M4 9.2 L7.4 4.4 L9.6 5.5 L6.3 10.2 Z" fill="#ff5a4e" stroke="#1d1b3a" strokeWidth={thin} strokeLinejoin="round" />
            <path d="M20 9.2 L16.6 4.4 L14.4 5.5 L17.7 10.2 Z" fill="#ff5a4e" stroke="#1d1b3a" strokeWidth={thin} strokeLinejoin="round" />
          </>
        )}
        <path d="M1.4 12h7.2M15.4 12h7.2" stroke="#1d1b3a" strokeWidth={stroke} fill="none" />
        <circle cx="12" cy="12" r="10.6" fill="none" stroke="#1d1b3a" strokeWidth={stroke} />
        <circle cx="12" cy="12" r="3.3" fill="#ffffff" stroke="#1d1b3a" strokeWidth={stroke} />
        <circle cx="12" cy="12" r="1.3" fill="none" stroke="#1d1b3a" strokeWidth={thin} />
      </svg>
    </span>
  );
}
