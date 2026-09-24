import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';

interface BreathingVisualProps {
  phaseAction: 'inhale' | 'hold' | 'exhale';
  phaseName: string;
  phaseDurationSec: number;
  phaseSecondsLeft: number;
  totalSecondsElapsed: number;
  isPaused: boolean;
  isCompleted: boolean;
  isTimerMode?: boolean;
  prefersReducedMotion: boolean;
}

/**
 * Generates an organic closed wavy SVG path with symmetrical lobes around center (140, 140)
 */
function createOrganicWavePath(r0: number, amp: number, lobes: number = 6, points: number = 72): string {
  const segments: string[] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = r0 + amp * Math.cos(lobes * angle);
    const x = 140 + r * Math.cos(angle);
    const y = 140 + r * Math.sin(angle);
    segments.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return segments.join(' ') + ' Z';
}

/**
 * 3-Layer Forge Breathing Visual (Orbital Rings + Pulsing Middle Wave Ring + Glowing Core)
 * Supports both Basalt Dark (molten gold/fire) and Sand Light (muted olive/bronze/ochre) modes.
 */
export const BreathingVisual: React.FC<BreathingVisualProps> = ({
  phaseAction,
  phaseName,
  phaseDurationSec,
  phaseSecondsLeft,
  totalSecondsElapsed,
  isPaused,
  isCompleted,
  isTimerMode = false,
  prefersReducedMotion,
}) => {
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';

  // Format MM:SS for timer mode
  const formattedTime = useMemo(() => {
    const mins = Math.floor(totalSecondsElapsed / 60);
    const secs = totalSecondsElapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [totalSecondsElapsed]);

  // Primary wave path and secondary inner echo wave path
  const primaryWavePath = useMemo(() => createOrganicWavePath(78, 10.5, 6, 72), []);
  const echoWavePath = useMemo(() => createOrganicWavePath(68, 8, 6, 72), []);

  // Determine expansion state based on breathing state
  const isExpanded = useMemo(() => {
    if (isCompleted) return true;
    if (isTimerMode) return true;
    if (phaseAction === 'inhale') return true;
    if (phaseAction === 'hold') {
      const lower = phaseName.toLowerCase();
      return lower.includes('after inhale') || !lower.includes('after exhale');
    }
    return false;
  }, [phaseAction, phaseName, isCompleted, isTimerMode]);

  // Authoritative duration for the CSS transition
  const durationSec = prefersReducedMotion ? 0 : isPaused ? 0 : Math.max(0.3, phaseDurationSec);

  // Easing curve: Organic breath curve
  const organicEase = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

  // Theme-aware palette configuration
  const palette = useMemo(() => {
    if (isLight) {
      return {
        radialGlow: 'radial-gradient(circle, rgba(169,120,53,0.18) 0%, rgba(78,90,66,0.10) 45%, rgba(0,0,0,0) 70%)',
        coreStop0: '#FFFFFF',
        coreStop35: '#FDFBF7',
        coreStop65: '#C8A870',
        coreStop85: '#765522',
        coreGlowColor: '#765522',
        coreGlowOpacity: 0.45,
        coreRimStroke: '#5C4217',
        coreNucleusDot: '#FFFFFF',
        waveFillStop0: '#A97835',
        waveFillStop0Opacity: 0.22,
        waveFillStop60: '#667055',
        waveFillStop60Opacity: 0.12,
        primaryWaveStroke: '#765522',
        secondaryWaveStroke: '#4E5A42',
        wavePeakBeads: '#353D2E',
        outerRingStroke: '#765522',
        outerRingOpacity: 0.45,
        outerCardinalNodes: '#4E5A42',
        outerSecondaryBeads: '#765522',
        innerDashedRingStroke: '#667055',
        innerFloatingNodes: '#765522',
      };
    }
    return {
      radialGlow: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(245,158,11,0.08) 40%, rgba(0,0,0,0) 70%)',
      coreStop0: '#FFFFFF',
      coreStop35: '#FFFBEB',
      coreStop65: '#FDE68A',
      coreStop85: '#D4AF37',
      coreGlowColor: '#D4AF37',
      coreGlowOpacity: 0.65,
      coreRimStroke: '#FFFBEB',
      coreNucleusDot: '#FFFFFF',
      waveFillStop0: '#F59E0B',
      waveFillStop0Opacity: 0.25,
      waveFillStop60: '#D4AF37',
      waveFillStop60Opacity: 0.12,
      primaryWaveStroke: '#D4AF37',
      secondaryWaveStroke: '#FDE68A',
      wavePeakBeads: '#FFFBEB',
      outerRingStroke: '#D4AF37',
      outerRingOpacity: 0.4,
      outerCardinalNodes: '#FFFBEB',
      outerSecondaryBeads: '#D4AF37',
      innerDashedRingStroke: '#F59E0B',
      innerFloatingNodes: '#FDE68A',
    };
  }, [isLight]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[340px] mx-auto select-none py-2">
      {/* Dynamic Keyframes for GPU-accelerated rotation */}
      <style>{`
        @keyframes forgeOrbitCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes forgeOrbitCCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>

      {/* Main Visual Container */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Ambient Subtle Radial Glow Backdrop */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: palette.radialGlow,
            transform: `scale(${isExpanded ? 1.3 : 0.8})`,
            opacity: isExpanded ? 0.9 : 0.35,
            transitionProperty: 'transform, opacity',
            transitionDuration: `${durationSec}s`,
            transitionTimingFunction: organicEase,
            willChange: 'transform, opacity',
          }}
        />

        {/* Master SVG Canvas */}
        <svg
          viewBox="0 0 280 280"
          className="w-full h-full overflow-visible relative z-10"
          aria-hidden="true"
        >
          <defs>
            {/* Core Nucleus Radiant Gradient */}
            <radialGradient id="forgeCoreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={palette.coreStop0} stopOpacity="1" />
              <stop offset="35%" stopColor={palette.coreStop35} stopOpacity="0.95" />
              <stop offset="65%" stopColor={palette.coreStop65} stopOpacity="0.85" />
              <stop offset="85%" stopColor={palette.coreStop85} stopOpacity="0.75" />
              <stop offset="100%" stopColor={palette.coreStop85} stopOpacity="0.0" />
            </radialGradient>

            {/* Middle Wavy Ring Fill Gradient */}
            <radialGradient id="forgeWaveFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={palette.waveFillStop0} stopOpacity={palette.waveFillStop0Opacity} />
              <stop offset="60%" stopColor={palette.waveFillStop60} stopOpacity={palette.waveFillStop60Opacity} />
              <stop offset="100%" stopColor={palette.waveFillStop60} stopOpacity="0.0" />
            </radialGradient>

            {/* Subtle Core Glow Filter */}
            <filter id="forgeCoreGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={palette.coreGlowColor} floodOpacity={palette.coreGlowOpacity} />
            </filter>
          </defs>

          {/* ========================================================================= */}
          {/* LAYER C: OUTER RINGS (Slow Alternating Continuous Rotation)               */}
          {/* ========================================================================= */}

          {/* Outer Ring 1: Largest Outer Orbital (Clockwise Rotation) */}
          <g
            style={{
              transformOrigin: '140px 140px',
              animation: prefersReducedMotion ? 'none' : 'forgeOrbitCW 45s linear infinite',
              animationPlayState: isPaused || isCompleted ? 'paused' : 'running',
              willChange: 'transform',
            }}
          >
            {/* Outer Perimeter Thin Ring */}
            <circle
              cx="140"
              cy="140"
              r="124"
              fill="none"
              stroke={palette.outerRingStroke}
              strokeWidth="1"
              strokeOpacity={palette.outerRingOpacity}
            />

            {/* Cardinal Orbital Accent Nodes */}
            <circle cx="140" cy="16" r="2.5" fill={palette.outerCardinalNodes} opacity="0.85" />
            <circle cx="264" cy="140" r="2.5" fill={palette.outerCardinalNodes} opacity="0.85" />
            <circle cx="140" cy="264" r="2.5" fill={palette.outerCardinalNodes} opacity="0.85" />
            <circle cx="16" cy="140" r="2.5" fill={palette.outerCardinalNodes} opacity="0.85" />

            {/* Diagonal Secondary Tiny Beads */}
            <circle cx="227" cy="53" r="1.5" fill={palette.outerSecondaryBeads} opacity="0.6" />
            <circle cx="227" cy="227" r="1.5" fill={palette.outerSecondaryBeads} opacity="0.6" />
            <circle cx="53" cy="227" r="1.5" fill={palette.outerSecondaryBeads} opacity="0.6" />
            <circle cx="53" cy="53" r="1.5" fill={palette.outerSecondaryBeads} opacity="0.6" />

            {/* Subtle Directional Arrow Markers on Orbit */}
            <path
              d="M 136 12 L 140 16 L 136 20"
              fill="none"
              stroke={palette.outerRingStroke}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
            <path
              d="M 144 268 L 140 264 L 144 260"
              fill="none"
              stroke={palette.outerRingStroke}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
          </g>

          {/* Outer Ring 2: Inner Orbital Track (Counter-Clockwise Rotation) */}
          <g
            style={{
              transformOrigin: '140px 140px',
              animation: prefersReducedMotion ? 'none' : 'forgeOrbitCCW 30s linear infinite',
              animationPlayState: isPaused || isCompleted ? 'paused' : 'running',
              willChange: 'transform',
            }}
          >
            {/* Inner Orbital Thin Ring */}
            <circle
              cx="140"
              cy="140"
              r="104"
              fill="none"
              stroke={palette.innerDashedRingStroke}
              strokeWidth="1"
              strokeDasharray="4 6"
              strokeOpacity="0.45"
            />

            {/* Orbital Floating Nodes */}
            <circle cx="213" cy="67" r="2.2" fill={palette.innerFloatingNodes} opacity="0.8" />
            <circle cx="67" cy="213" r="2.2" fill={palette.innerFloatingNodes} opacity="0.8" />
            <circle cx="67" cy="67" r="2.2" fill={palette.innerFloatingNodes} opacity="0.8" />
            <circle cx="213" cy="213" r="2.2" fill={palette.innerFloatingNodes} opacity="0.8" />
          </g>

          {/* ========================================================================= */}
          {/* LAYER B: MIDDLE WAVE RING (The Authoritative Breathing Pulse Indicator)  */}
          {/* ========================================================================= */}
          <g
            style={{
              transformOrigin: '140px 140px',
              transform: `scale(${isExpanded ? 1.16 : 0.65})`,
              opacity: isExpanded ? 0.98 : 0.55,
              transitionProperty: 'transform, opacity',
              transitionDuration: `${durationSec}s`,
              transitionTimingFunction: organicEase,
              willChange: 'transform, opacity',
            }}
          >
            {/* Translucent Wave Body Gradient Fill */}
            <path
              d={primaryWavePath}
              fill="url(#forgeWaveFillGrad)"
            />

            {/* Primary Glowing Organic Wave Stroke */}
            <path
              d={primaryWavePath}
              fill="none"
              stroke={palette.primaryWaveStroke}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={isExpanded ? 0.95 : 0.6}
            />

            {/* Secondary Inner Echo Harmonic Wave Stroke */}
            <path
              d={echoWavePath}
              fill="none"
              stroke={palette.secondaryWaveStroke}
              strokeWidth="1"
              strokeOpacity={isExpanded ? 0.8 : 0.4}
              strokeDasharray="2 3"
            />

            {/* Delicate Wave Peak Accent Beads */}
            {[0, 60, 120, 180, 240, 300].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const r = 78 + 10.5;
              const x = 140 + Math.cos(rad) * r;
              const y = 140 + Math.sin(rad) * r;
              return (
                <circle
                  key={deg}
                  cx={x}
                  cy={y}
                  r={isExpanded ? 2.5 : 1.8}
                  fill={palette.wavePeakBeads}
                  opacity={isExpanded ? 0.95 : 0.6}
                />
              );
            })}
          </g>

          {/* ========================================================================= */}
          {/* LAYER A: CENTRAL CORE (Luminous Living Anchor)                            */}
          {/* ========================================================================= */}
          <g
            style={{
              transformOrigin: '140px 140px',
              transform: `scale(${isExpanded ? 1.15 : 0.85})`,
              opacity: isExpanded ? 1 : 0.82,
              transitionProperty: 'transform, opacity',
              transitionDuration: `${durationSec}s`,
              transitionTimingFunction: organicEase,
              willChange: 'transform, opacity',
            }}
          >
            {/* Luminous Core Orb Gradient */}
            <circle
              cx="140"
              cy="140"
              r="28"
              fill="url(#forgeCoreGrad)"
              filter="url(#forgeCoreGlow)"
            />

            {/* Core Perimeter Rim */}
            <circle
              cx="140"
              cy="140"
              r="28"
              fill="none"
              stroke={palette.coreRimStroke}
              strokeWidth="1.25"
              strokeOpacity={isExpanded ? 0.95 : 0.75}
            />

            {/* Core Brilliant Nucleus Dot */}
            <circle
              cx="140"
              cy="140"
              r="6.5"
              fill={palette.coreNucleusDot}
              opacity={0.98}
            />
          </g>
        </svg>
      </div>

      {/* Authoritative Breathing Guidance & Second Counter */}
      <div className="mt-4 text-center space-y-1.5 z-10 min-h-[72px] flex flex-col items-center justify-center">
        {isCompleted ? (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="w-9 h-9 rounded-full bg-[var(--forge-surface-subtle)] border border-[var(--forge-gold)] flex items-center justify-center text-[var(--forge-gold)] mb-1 shadow-sm">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-sans text-sm font-bold text-[var(--forge-text-primary)] uppercase tracking-wider">
              Session Complete
            </span>
          </div>
        ) : (
          <>
            {/* Primary Action Guidance: BREATHE IN / HOLD / BREATHE OUT */}
            <div className="flex items-center justify-center gap-2">
              <span
                className="font-sans text-2xl sm:text-3xl font-extrabold tracking-widest text-[var(--forge-text-primary)] uppercase transition-opacity duration-300"
              >
                {isPaused
                  ? 'PAUSED'
                  : isTimerMode
                  ? 'MEDITATE'
                  : phaseAction === 'inhale'
                  ? 'BREATHE IN'
                  : phaseAction === 'exhale'
                  ? 'BREATHE OUT'
                  : 'HOLD'}
              </span>
            </div>

            {/* Second Counter / Phase Name Readout */}
            <div className="flex items-center justify-center gap-2">
              <span className="font-sans text-sm sm:text-base font-bold text-[var(--forge-gold)]">
                {isTimerMode ? formattedTime : `${phaseSecondsLeft}s`}
              </span>
              <span className="text-xs uppercase font-sans tracking-wider text-[var(--forge-text-secondary)]">
                • {isTimerMode ? 'PRESENCE' : phaseName}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
