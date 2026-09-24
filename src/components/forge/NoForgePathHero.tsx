import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { playUISound } from '../../services/soundManager';
import heroLandscape from '../../assets/images/forge_journey_hero_1789112451315.jpg';

interface NoForgePathHeroProps {
  onOpenForgePath?: () => void;
  className?: string;
}

/**
 * Celestial sword-like star sigil with restrained warm-gold glow & rune ring
 */
const CelestialSigil: React.FC = () => (
  <div className="relative flex items-center justify-center select-none pointer-events-none">
    {/* Vertical atmospheric rays of light */}
    <div className="absolute -top-16 bottom-0 w-px bg-gradient-to-b from-transparent via-amber-300/70 to-transparent" />
    <div className="absolute -top-12 bottom-2 w-6 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent blur-sm" />

    {/* SVG Star Compass Emblem */}
    <svg
      viewBox="0 0 120 120"
      className="w-24 h-24 sm:w-28 sm:h-28 text-amber-300 relative z-10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id="forgeSigilGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur stdDeviation="7" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="sigilRadial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Outer concentric rune circle */}
      <circle
        cx="60"
        cy="60"
        r="32"
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeDasharray="2 4"
        strokeOpacity="0.6"
      />
      <circle
        cx="60"
        cy="60"
        r="28"
        stroke="#FDE68A"
        strokeWidth="1.5"
        strokeOpacity="0.75"
        filter="url(#forgeSigilGlow)"
      />

      {/* Diagonal rays (secondary) */}
      <line x1="42" y1="42" x2="78" y2="78" stroke="#FBBF24" strokeWidth="1.2" strokeOpacity="0.7" />
      <line x1="78" y1="42" x2="42" y2="78" stroke="#FBBF24" strokeWidth="1.2" strokeOpacity="0.7" />

      {/* Horizontal blade */}
      <path
        d="M24 60 L60 56 L96 60 L60 64 Z"
        fill="url(#sigilRadial)"
        stroke="#FDE68A"
        strokeWidth="1"
        filter="url(#forgeSigilGlow)"
      />

      {/* Vertical celestial sword/blade */}
      <path
        d="M60 14 L65 52 L67 60 L65 68 L60 106 L55 68 L53 60 L55 52 Z"
        fill="url(#sigilRadial)"
        stroke="#FEF08A"
        strokeWidth="1.2"
        filter="url(#forgeSigilGlow)"
      />

      {/* Center glowing core diamond */}
      <polygon
        points="60,49 67,60 60,71 53,60"
        fill="#FFFFFF"
        stroke="#F59E0B"
        strokeWidth="1.5"
        filter="url(#forgeSigilGlow)"
      />
      <circle cx="60" cy="60" r="2.5" fill="#FEF3C7" />
    </svg>
  </div>
);

/**
 * Large Cinematic Hero Card displayed on Quests view when no Forge Path has been defined yet.
 */
export const NoForgePathHero: React.FC<NoForgePathHeroProps> = ({
  onOpenForgePath,
  className = '',
}) => {
  const handleCreateForgePath = () => {
    playUISound('tap');
    if (onOpenForgePath) {
      onOpenForgePath();
    } else {
      window.dispatchEvent(
        new CustomEvent('forge_set_subview', { detail: { subView: 'path' } })
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative w-full overflow-hidden rounded-3xl border border-[var(--forge-border-accent)]/35 bg-[#090B14] shadow-2xl ${className}`}
      data-testid="no-forge-path-hero"
    >
      {/* Subtle outer border illumination */}
      <div
        className="absolute -inset-px rounded-3xl pointer-events-none bg-gradient-to-b from-amber-400/25 via-purple-500/15 to-amber-500/10 opacity-70"
        aria-hidden="true"
      />

      {/* Inner Content Container */}
      <div className="relative rounded-[23px] overflow-hidden min-h-[470px] sm:min-h-[510px] flex flex-col items-center justify-between p-6 sm:p-8 text-center">
        {/* Cinematic Alpine Background Artwork */}
        <img
          src={heroLandscape}
          alt="Atmospheric alpine landscape"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          loading="eager"
        />

        {/* Ambient Dark Gradient Overlays for High Contrast & Text Legibility */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#090b14]/35 via-[#090b14]/50 to-[#090b14]/95 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-radial from-transparent via-[#090b14]/30 to-[#090b14]/75 pointer-events-none"
          aria-hidden="true"
        />

        {/* Soft Purple/Indigo Atmospheric Glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-600/18 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Restrained Warm-Gold Focal Glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-amber-400/22 blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Very Sparse Tiny Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <span className="absolute top-[20%] left-[24%] w-1 h-1 rounded-full bg-amber-200/60 blur-[0.5px]" />
          <span className="absolute top-[28%] left-[76%] w-1 h-1 rounded-full bg-purple-200/50 blur-[0.5px]" />
          <span className="absolute top-[36%] left-[34%] w-1.5 h-1.5 rounded-full bg-amber-300/50 blur-[0.5px]" />
          <span className="absolute top-[44%] left-[68%] w-1 h-1 rounded-full bg-amber-100/60 blur-[0.5px]" />
          <span className="absolute top-[24%] left-[54%] w-1.5 h-1.5 rounded-full bg-amber-200/70 blur-[0.5px]" />
          <span className="absolute top-[32%] left-[16%] w-1 h-1 rounded-full bg-purple-300/50 blur-[0.5px]" />
        </div>

        {/* Top Spacer / Sigil Placement Area */}
        <div className="relative z-10 pt-4 sm:pt-6">
          <CelestialSigil />
        </div>

        {/* Bottom Copy and Primary CTA */}
        <div className="relative z-10 flex flex-col items-center mt-6 max-w-md mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Your Journey Awaits
          </h2>

          <p className="text-sm sm:text-base text-zinc-300/90 font-sans text-center leading-relaxed mt-2.5 max-w-xs sm:max-w-sm drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            Forge your path to begin building your quest roster.
          </p>

          {/* Create Forge Path CTA */}
          <button
            type="button"
            onClick={handleCreateForgePath}
            id="create-forge-path-cta-btn"
            aria-label="Create Forge Path"
            className="group relative mt-7 inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-serif font-bold text-sm tracking-wide shadow-[0_0_24px_rgba(139,92,246,0.4),0_0_8px_rgba(217,175,55,0.2)] border border-indigo-400/40 hover:border-indigo-300/70 active:scale-98 transition-all duration-200 cursor-pointer min-h-[48px]"
          >
            <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            </div>
            <span className="whitespace-nowrap font-bold">Create Forge Path</span>
            <ArrowRight className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* Subtle bottom diamond star ornament */}
          <div className="mt-5 text-amber-300/40 text-xs select-none" aria-hidden="true">
            ✦
          </div>
        </div>
      </div>
    </motion.div>
  );
};
