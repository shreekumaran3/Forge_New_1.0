import React, { useState } from 'react';
import { Compass, Sparkles, ChevronRight, CheckCircle2, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { AIMentorMessage } from '../../types';

interface AIMentorCardProps {
  messages: AIMentorMessage[];
  onAction?: (actionType: string) => void;
}

export const AIMentorCard: React.FC<AIMentorCardProps> = ({ messages, onAction }) => {
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [customAdvice, setCustomAdvice] = useState<string | null>(null);

  if (!messages || messages.length === 0) return null;

  const currentMsg = messages[activeMessageIndex] || messages[0];

  const handleNext = () => {
    setActiveMessageIndex((prev) => (prev + 1) % messages.length);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'streak':
        return <TrendingUp className="w-5 h-5 text-amber-400" />;
      case 'unlock':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'quest_evolution':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Compass className="w-5 h-5 text-indigo-400" />;
    }
  };

  const generateQuickReflection = () => {
    const reflections = [
      "Focus today on steady execution over speed. Greatness is built in quiet consistency.",
      "You have completed your primary physical routines. Remember to hydrate and stretch.",
      "Consider reading 15 minutes before sleep to sharpen your wisdom stat.",
      "Your current streak is strong. Take a moment to acknowledge your discipline.",
    ];
    const randomIndex = Math.floor(Math.random() * reflections.length);
    setCustomAdvice(reflections[randomIndex]);
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-sm">
            {getMessageIcon(currentMsg.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400">
                AI Mentor Guide
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300">
                RPG Companion
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-100">
              Quiet Wisdom & Evolution
            </h4>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={handleNext}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 border border-slate-700"
          >
            <span>Next ({activeMessageIndex + 1}/{messages.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 mb-3">
        "{customAdvice || currentMsg.text}"
      </p>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={generateQuickReflection}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Ask Mentor Guidance</span>
        </button>

        {currentMsg.actionLabel && currentMsg.actionType && (
          <button
            onClick={() => onAction && onAction(currentMsg.actionType!)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1 shadow-md shadow-indigo-900/30"
          >
            <span>{currentMsg.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
