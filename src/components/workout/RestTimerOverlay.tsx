import React, { useEffect } from 'react';
import { Button } from '../ui/Button';
import { Play, Pause, FastForward, Plus, Minus, Timer } from 'lucide-react';

interface RestTimerOverlayProps {
  secondsRemaining: number;
  maxSeconds: number;
  isPaused: boolean;
  nextExerciseName?: string;
  nextSetNumber?: number;
  onAdjustSeconds: (delta: number) => void;
  onTogglePause: () => void;
  onSkip: () => void;
}

export const RestTimerOverlay: React.FC<RestTimerOverlayProps> = ({
  secondsRemaining,
  maxSeconds,
  isPaused,
  nextExerciseName,
  nextSetNumber,
  onAdjustSeconds,
  onTogglePause,
  onSkip,
}) => {
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(Math.max(0, totalSec) / 60);
    const secs = Math.max(0, totalSec) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPct = maxSeconds > 0 ? Math.max(0, Math.min(100, ((maxSeconds - secondsRemaining) / maxSeconds) * 100)) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-[#D4AF37]/40 bg-[#0B0E14] p-6 text-center shadow-[0_0_40px_rgba(212,175,55,0.2)] space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
          <Timer className="w-5 h-5 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest">
            REST INTERVAL
          </span>
        </div>

        {/* Big Countdown Timer */}
        <div className="relative py-4 flex flex-col items-center justify-center">
          <div className="text-6xl font-extrabold font-mono text-white tracking-tighter drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            {formatTime(secondsRemaining)}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#1A1F2C] rounded-full overflow-hidden mt-6 border border-[#2D3344]">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] transition-all duration-300 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Next Up Preview */}
        {nextExerciseName && (
          <div className="bg-[#121620] border border-[#262C3A] rounded-xl p-3 text-left">
            <span className="text-[10px] font-mono uppercase text-[#8E9299]">NEXT UP</span>
            <p className="text-sm font-bold text-white mt-0.5 truncate">{nextExerciseName}</p>
            {nextSetNumber && (
              <p className="text-xs text-[#D4AF37] font-mono mt-0.5">Set {nextSetNumber}</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => onAdjustSeconds(-15)}
            variant="ghost"
            size="sm"
            className="border border-[#262C3A] text-gray-300 hover:text-white"
            title="Minus 15 seconds"
          >
            <Minus className="w-4 h-4 mr-1" />
            15s
          </Button>

          <Button
            onClick={onTogglePause}
            variant="gold"
            size="md"
            className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-lg"
          >
            {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
          </Button>

          <Button
            onClick={() => onAdjustSeconds(15)}
            variant="ghost"
            size="sm"
            className="border border-[#262C3A] text-gray-300 hover:text-white"
            title="Plus 15 seconds"
          >
            <Plus className="w-4 h-4 mr-1" />
            15s
          </Button>
        </div>

        {/* Skip Rest Button */}
        <div>
          <Button
            onClick={onSkip}
            variant="ghost"
            size="sm"
            className="w-full border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 flex items-center justify-center gap-2"
          >
            <span>Skip Rest</span>
            <FastForward className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
