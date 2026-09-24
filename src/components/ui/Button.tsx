import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'blue' | 'secondary' | 'dark' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  id?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'dark',
  size = 'md',
  children,
  className = '',
  id,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3.5 py-2 min-h-[38px] text-xs tracking-wider rounded-lg font-medium',
    md: 'px-5 py-2.5 min-h-[44px] text-xs tracking-wider rounded-xl font-medium',
    lg: 'px-7 py-3.5 min-h-[48px] text-sm tracking-wider rounded-xl font-bold',
  }[size];

  let variantClasses =
    'bg-[var(--forge-surface,#0A0A0A)] border border-[var(--forge-border,#1A1A1A)] text-[var(--forge-text-secondary,#8E9299)] hover:text-[var(--forge-text-primary,#E4E3E0)] hover:bg-[var(--forge-surface-interactive,#1A1A1A)] active:scale-[0.98] uppercase font-semibold';

  if (variant === 'gold') {
    variantClasses =
      'bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_var(--forge-primary-glow,rgba(212,175,55,0.2))] hover:brightness-110 active:scale-[0.98] border border-[var(--forge-border-accent,rgba(212,175,55,0.4))]';
  } else if (variant === 'secondary') {
    variantClasses =
      'bg-[var(--forge-button-secondary,#F59E0B)] text-[var(--forge-button-secondary-text,#050505)] font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_var(--forge-secondary-glow,rgba(245,158,11,0.25))] hover:brightness-110 active:scale-[0.98] border border-[var(--forge-border-secondary,rgba(245,158,11,0.4))]';
  } else if (variant === 'blue') {
    variantClasses =
      'bg-cyan-950/80 text-cyan-200 font-semibold uppercase tracking-[0.15em] border border-cyan-500/40 hover:brightness-110 active:scale-[0.98]';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent text-[var(--forge-text-secondary,#8E9299)] hover:text-[var(--forge-text-primary,#E4E3E0)] hover:bg-[var(--forge-surface-interactive,#1A1A1A)]/50 uppercase';
  } else if (variant === 'danger') {
    variantClasses =
      'bg-red-950/60 border border-red-800/60 text-red-300 hover:bg-red-900/60 uppercase font-semibold active:scale-[0.98]';
  }

  return (
    <button
      id={id}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
