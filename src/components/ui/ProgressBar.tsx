import React from 'react';
import { motion } from 'motion/react';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  subLabel?: string;
  color?: 'gold' | 'secondary' | 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  showValues?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  subLabel,
  color = 'gold',
  showValues = true,
  size = 'md',
  id,
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const colorGradients = {
    gold: 'bg-gradient-to-r from-[var(--forge-primary,#D4AF37)] to-[var(--forge-secondary,#F59E0B)] shadow-[0_0_8px_var(--forge-primary-glow)]',
    secondary: 'bg-[var(--forge-secondary,#F59E0B)] shadow-[0_0_8px_var(--forge-secondary-glow)]',
    blue: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]',
    emerald: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
  }[color];

  return (
    <div id={id} className="w-full space-y-1.5">
      {(label || showValues) && (
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-[var(--forge-text-secondary,#8E9299)]">
          {label && <span className="font-semibold text-[var(--forge-text-secondary,#8E9299)]">{label}</span>}
          {subLabel && <span className="text-[var(--forge-text-secondary,#8E9299)] text-[10px]">{subLabel}</span>}
          {showValues && (
            <span className="font-mono text-[10px] text-[var(--forge-text-accent,#D4AF37)] ml-auto">
              {Math.round(value)} / {Math.round(max)} XP
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-[var(--forge-progress-track,#1A1A1A)] rounded-full overflow-hidden ${heightClasses} relative`}>
        <motion.div
          className={`h-full ${colorGradients} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        />
      </div>
    </div>
  );
};
