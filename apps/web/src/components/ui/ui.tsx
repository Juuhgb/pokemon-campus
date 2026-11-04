import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '../../app/router.js';

/** Classes dos botões do guia de estilo. */
export const buttonStyles = {
  primary:
    'inline-flex h-[60px] items-center justify-center rounded-[18px] sticker-lg bg-coral px-5 font-display text-xl font-bold text-tinta no-underline transition-transform active:translate-x-[2px] active:translate-y-[2px] disabled:border-dashed disabled:bg-lilas disabled:text-tinta-suave disabled:shadow-none',
  secondary:
    'inline-flex min-h-11 items-center justify-center rounded-[14px] ink-border bg-white px-4 text-sm font-extrabold text-tinta no-underline disabled:bg-lilas disabled:text-tinta-suave',
  accent:
    'inline-flex min-h-11 items-center justify-center rounded-[14px] sticker-sm bg-amarelo px-4 text-sm font-extrabold text-tinta no-underline disabled:bg-lilas disabled:text-tinta-suave disabled:shadow-none',
  link: 'inline-flex min-h-11 items-center justify-center font-extrabold text-tinta underline underline-offset-4',
};

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${buttonStyles.primary} ${className ?? ''}`} {...props} />;
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] sticker-sm bg-white text-tinta"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </Link>
  );
}

export function ScreenTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="m-0 font-display text-[32px] leading-none font-bold">{children}</h1>
      {aside}
    </div>
  );
}

export function ProgressBar({ percent, color = '#2fb36b', height = 12, label }: { percent: number; color?: string; height?: number; label?: string }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="overflow-hidden rounded-full border-2 border-tinta bg-lilas"
      style={{ height }}
    >
      <div className="h-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export const hpColor = (percent: number) => (percent > 50 ? '#2fb36b' : percent > 25 ? '#ffc23d' : '#ff5a4e');

export function StepDots({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div aria-label={`Passo ${step} de ${total}`} className="flex justify-center gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 rounded-full border-2 border-tinta ${index + 1 === step ? 'w-6' : 'w-2.5'} ${index + 1 <= step ? 'bg-coral' : 'bg-white'}`}
        />
      ))}
    </div>
  );
}
