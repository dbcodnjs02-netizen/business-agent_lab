import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'wood' | 'soft' | 'ghost';
  size?: 'sm' | 'md';
}

const VARIANTS = {
  wood: 'bg-gradient-to-b from-wood-500 to-wood-700 text-cream shadow-[0_3px_0_var(--wood-900)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_var(--wood-900)]',
  soft: 'glass text-ink hover:bg-white/80 active:translate-y-px',
  ghost: 'text-ink-soft hover:bg-wood-300/20',
};

const SIZES = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-[15px]',
};

export function Button({ variant = 'wood', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
}
