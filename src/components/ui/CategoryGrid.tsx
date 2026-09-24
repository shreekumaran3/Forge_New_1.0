import React, { createContext, useContext } from 'react';
import { motion } from 'motion/react';
import { motionTokens } from '../../constants/animation';
import { playUISound } from '../../services/soundManager';

type CategoryGridVariant = 'primary' | 'compact';

interface CategoryGridContextType {
  variant: CategoryGridVariant;
}

const CategoryGridContext = createContext<CategoryGridContextType>({
  variant: 'primary',
});

export interface CategoryGridProps {
  variant?: CategoryGridVariant;
  cols?: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'auto';
  className?: string;
  children: React.ReactNode;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  variant = 'primary',
  cols,
  className = '',
  children,
}) => {
  let gridColsClass = '';
  if (cols) {
    if (cols === 2) gridColsClass = 'grid-cols-2';
    else if (cols === 3) gridColsClass = 'grid-cols-2 sm:grid-cols-3';
    else if (cols === 4) gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    else if (cols === 5) gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';
    else if (cols === 6) gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6';
    else if (cols === 7) gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7';
    else if (cols === 8) gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8';
    else gridColsClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';
  } else {
    gridColsClass =
      variant === 'primary'
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6';
  }

  const gapClass = variant === 'primary' ? 'gap-2.5' : 'gap-2';

  return (
    <CategoryGridContext.Provider value={{ variant }}>
      <div className={`grid ${gridColsClass} ${gapClass} w-full ${className}`}>
        {children}
      </div>
    </CategoryGridContext.Provider>
  );
};

export interface CategoryGridItemProps {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  count?: number | string;
  badge?: string;
  isActive: boolean;
  onClick: () => void;
  color?: string;
  variant?: CategoryGridVariant;
  className?: string;
}

export const CategoryGridItem: React.FC<CategoryGridItemProps> = ({
  label,
  icon,
  count,
  badge,
  isActive,
  onClick,
  color,
  variant: itemVariant,
  className = '',
}) => {
  const parentContext = useContext(CategoryGridContext);
  const variant = itemVariant || parentContext.variant;

  const activeClasses =
    color ||
    'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-semibold shadow-xs border border-[var(--forge-border-accent)]';
  const inactiveClasses =
    'bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] hover:border-[var(--forge-border-accent)]';

  const isCompact = variant === 'compact';

  return (
    <motion.button
      whileTap={motionTokens.buttonTap}
      onClick={() => {
        playUISound('uiBubble');
        onClick();
      }}
      className={`w-full ${
        isCompact ? 'min-h-[44px] px-3.5 py-2' : 'min-h-[48px] px-4 py-2.5'
      } rounded-2xl text-xs font-sans font-medium transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
        isActive ? activeClasses : inactiveClasses
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        <span className="font-sans font-semibold tracking-normal text-xs whitespace-nowrap truncate">
          {label}
        </span>
      </div>
      {count !== undefined && count !== null && (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 ${
            isActive
              ? 'bg-black/20 text-current border border-black/10'
              : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] border border-[var(--forge-border)]'
          }`}
        >
          {count}
        </span>
      )}
      {badge && (
        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
          {badge}
        </span>
      )}
    </motion.button>
  );
};
