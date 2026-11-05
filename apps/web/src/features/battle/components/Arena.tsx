import type { ReactNode } from 'react';

interface ArenaProps {
  height: number;
  children: ReactNode;
  label?: string;
  /** "battle": duas plataformas (adversário e jogador); "center": uma plataforma no meio. */
  variant?: 'battle' | 'center';
}

/** Cenário de céu e grama usado nas telas de batalha. */
export function Arena({ height, children, label = 'Arena', variant = 'battle' }: ArenaProps) {
  const ground = height * (variant === 'center' ? 0.62 : 0.56);
  return (
    <section aria-label={label} className="relative shrink-0 overflow-hidden border-b-[2.5px] border-tinta bg-ceu" style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 390 ${height}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" className="absolute inset-0">
        <path d={`M-10 ${ground} Q 120 ${ground - 30} 220 ${ground - 10} T 400 ${ground - 18} V ${height + 10} H -10 Z`} fill="#9fd477" stroke="#1d1b3a" strokeWidth="2.5" />
        {variant === 'battle' ? (
          <>
            <ellipse cx="282" cy={height * 0.47} rx="78" ry="17" fill="#7cc35c" stroke="#1d1b3a" strokeWidth="2.5" />
            <ellipse cx="108" cy={height * 0.85} rx="88" ry="20" fill="#7cc35c" stroke="#1d1b3a" strokeWidth="2.5" />
          </>
        ) : (
          <ellipse cx="195" cy={height * 0.74} rx="100" ry="22" fill="#7cc35c" stroke="#1d1b3a" strokeWidth="2.5" />
        )}
        <path d="M30 70 q18-20 40-6 q13-15 31 0 q15 4 9 17 h-84 q-9-6 4-11z" fill="#ffffff" stroke="#1d1b3a" strokeWidth="2.5" />
      </svg>
      {children}
    </section>
  );
}
