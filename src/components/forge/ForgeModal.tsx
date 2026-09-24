import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Sparkles, X } from 'lucide-react';
import { ForgeNotificationData } from '../../types';
import { useBackHandler } from '../../services/backButtonManager';
import { playUISound } from '../../services/soundManager';

interface ForgeModalProps {
  notification: ForgeNotificationData | null;
  onDismiss: () => void;
  id?: string;
}

export const ForgeModal: React.FC<ForgeModalProps> = ({ notification, onDismiss, id }) => {
  useBackHandler(
    'forge-notification-modal',
    100,
    () => {
      onDismiss();
      return true;
    },
    Boolean(notification)
  );

  if (!notification) return null;

  return (
    <AnimatePresence>
      <div id={id || 'forge-modal'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
          className="relative w-full max-w-sm rounded-sm bg-[#0A0A0A] border border-[#D4AF37]/40 p-6 shadow-[0_0_30px_rgba(212,175,55,0.15)] text-center overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={() => {
              playUISound('uiBubble');
              onDismiss();
            }}
            className="absolute top-3 right-3 p-1 rounded-sm text-[#8E9299] hover:text-white bg-[#050505] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Header */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] mb-4">
            <Flame className="w-7 h-7" />
          </div>

          {/* Identity Forged Banner */}
          <h2 className="font-serif text-lg font-bold tracking-[0.25em] text-[#D4AF37] uppercase">
            {notification.identityTag}
          </h2>

          <p className="text-xs text-[#8E9299] mt-1 italic">
            "{notification.questTitle}"
          </p>

          {/* Stat Growth */}
          <div className="mt-4 py-2 px-3 bg-[#050505] border border-[#1A1A1A] rounded-sm inline-flex items-center gap-2 text-xs text-[#E4E3E0]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{notification.statName} Empowered</span>
            <span className="font-mono text-[#D4AF37] font-bold ml-1">+{notification.xpEarned} XP</span>
          </div>

          {/* Action button */}
          <button
            onClick={() => {
              playUISound('uiBubble');
              onDismiss();
            }}
            className="mt-6 w-full py-3 rounded-sm bg-[#D4AF37] text-black font-bold text-xs tracking-[0.2em] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Keep Walking
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
