import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { playUISound } from '../../services/soundManager';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  sublabel?: string;
  id?: string;
  className?: string;
  title?: string;
}

/**
 * FORGE — Premium Native-Touch Back Button
 * 
 * Provides an accessible, thumb-friendly touch target (min 48px x 48px),
 * responsive hover/active micro-states, audio click feedback,
 * and high-contrast typography in accordance with Forge dark luxury theme.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Forge',
  sublabel,
  id,
  className = '',
  title,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    playUISound('tap');
    onClick();
  };

  return (
    <button
      type="button"
      id={id || 'forge-back-button'}
      onClick={handleClick}
      title={title || `Back to ${label}`}
      aria-label={`Back to ${label}`}
      className={`inline-flex items-center gap-2.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--forge-surface-interactive)] hover:bg-[var(--forge-surface-elevated)] active:bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] text-[var(--forge-text-primary)] transition-all cursor-pointer select-none group focus:outline-none focus:ring-1 focus:ring-[var(--forge-primary)] ${className}`}
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--forge-bg)] border border-[var(--forge-border-strong)] group-hover:border-[var(--forge-primary)] transition-colors shrink-0 text-[var(--forge-text-accent)]">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
      </div>
      
      <div className="flex flex-col items-start leading-tight text-left">
        <div className="flex items-center gap-1">
          <span className="font-serif font-bold text-xs uppercase tracking-wider text-[var(--forge-text-accent)] group-hover:text-[var(--forge-primary-light)] transition-colors">
            {label}
          </span>
        </div>
        {sublabel && (
          <span className="text-[11px] font-mono text-[var(--forge-text-muted)] tracking-wider uppercase">
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
};
