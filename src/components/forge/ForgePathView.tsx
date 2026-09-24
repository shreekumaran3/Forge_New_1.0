import React from 'react';
import { BackButton } from '../ui/BackButton';
import { ForgePathGuideContent } from './ForgePathGuideContent';
import { Compass } from 'lucide-react';

interface ForgePathViewProps {
  onBack: () => void;
}

export const ForgePathView: React.FC<ForgePathViewProps> = ({ onBack }) => {
  return (
    <div
      id="forge-path-view-root"
      className="flex flex-col h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-13.5rem)] overflow-hidden space-y-3 sm:space-y-4"
    >
      {/* Top Bar with Back button */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <BackButton
          onClick={onBack}
          label="Forge"
          sublabel="Home"
          id="forge-path-back-btn"
        />

        <div className="forge-pill forge-pill-accent px-3.5 py-1.5 text-xs font-mono font-bold ml-auto flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
          <span>Forge Path Guide</span>
        </div>
      </div>

      {/* Main Path Guide Content */}
      <ForgePathGuideContent onApplySuccess={onBack} isModal={false} />
    </div>
  );
};
