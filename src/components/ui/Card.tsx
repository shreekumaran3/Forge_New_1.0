import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'blue' | 'glass';
  className?: string;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  id,
  ...props
}) => {
  let borderClasses = 'border border-[var(--forge-border)] hover:border-[var(--forge-border-strong)]';
  let bgClasses = 'bg-[var(--forge-surface)]';

  if (variant === 'gold') {
    borderClasses = 'border border-[var(--forge-border-accent)] shadow-[0_0_15px_var(--forge-primary-glow)]';
    bgClasses = 'bg-[var(--forge-surface-elevated)]';
  } else if (variant === 'blue') {
    borderClasses = 'border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.08)]';
    bgClasses = 'bg-[var(--forge-surface-elevated)]';
  } else if (variant === 'glass') {
    borderClasses = 'border border-[var(--forge-border)] backdrop-blur-md';
    bgClasses = 'bg-[var(--forge-surface)]/90';
  }

  return (
    <div
      id={id}
      className={`rounded-xl p-4 sm:p-5 transition-all duration-200 ${bgClasses} ${borderClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
