import React from 'react';
import { HelpCircle, ChevronRight, BookOpen } from 'lucide-react';
import { playUISound } from '../../services/soundManager';

interface SystemGuidesCardProps {
  onOpenGuides?: () => void;
  onSelectGuide?: (guideId: string) => void;
  arrow?: React.ReactNode;
}

/**
 * COMPACT SYSTEM GUIDES ENTRY CARD
 * 
 * Sits on Home (CharacterScreen) as a clean, single-row entry point
 * leading to the dedicated System Guides screen with all 37 guides.
 */
export const SystemGuidesCard: React.FC<SystemGuidesCardProps> = ({
  onOpenGuides,
  onSelectGuide,
  arrow,
}) => {
  const handleClick = () => {
    playUISound('tap');
    if (onOpenGuides) {
      onOpenGuides();
    } else {
      window.dispatchEvent(
        new CustomEvent('forge_set_root_tab', { detail: { tab: 'system-guides' } })
      );
    }
  };

  return (
    <div
      id="forge-system-guides-card"
      data-system-guide="system-guides-card"
      onClick={handleClick}
      className="p-4 sm:p-4.5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-all cursor-pointer shadow-xs group select-none flex items-center justify-between gap-3 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-xl bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
          <HelpCircle className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] group-hover:text-[var(--forge-text-accent)] transition-colors">
              System Guides
            </h2>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2 py-0.5 rounded border border-[var(--forge-border-accent)]">
              37 Guides
            </span>
          </div>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5 truncate">
            Browse interactive walkthroughs for every system across Forge.
          </p>
        </div>
      </div>

      {arrow || (
        <div className="w-8 h-8 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] group-hover:border-[var(--forge-border-accent)] text-[var(--forge-text-muted)] group-hover:text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 transition-colors">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );
};
