import React, { useEffect, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBackHandler } from '../../services/backButtonManager';
import { playUISound } from '../../services/soundManager';
import { useTheme } from '../../theme/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  id,
  maxWidthClass = 'max-w-lg',
}) => {
  const [mounted, setMounted] = useState(false);
  const autoId = useId();
  const modalId = id || `modal-${autoId}`;
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';

  // Automatically register Android Back button dismissal (Priority 100)
  useBackHandler(
    modalId,
    100,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock with clean restoration
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          id={id}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden pointer-events-auto"
        >
          {/* Theme-Aware Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              playUISound('uiBubble');
              onClose();
            }}
            className={`fixed inset-0 z-[100] cursor-pointer ${
              isLight ? 'bg-[#202522]/50 backdrop-blur-xs' : 'bg-black/80 backdrop-blur-xs'
            }`}
            aria-hidden="true"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-[101] w-[calc(100vw-24px)] ${maxWidthClass} overflow-hidden rounded-2xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border-strong)] ${
              isLight
                ? 'shadow-[0_12px_36px_rgba(40,35,30,0.16)]'
                : 'shadow-[0_20px_60px_rgba(0,0,0,0.85)]'
            } p-5 sm:p-6 text-[var(--forge-text-primary)] max-h-[calc(100dvh-32px)] flex flex-col`}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between pb-3.5 border-b border-[var(--forge-border)] mb-4 shrink-0">
                <div className="pr-4">
                  {title && (
                    <h3 className="font-serif text-sm tracking-[0.15em] sm:tracking-[0.2em] font-bold uppercase text-[var(--forge-text-accent)]">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playUISound('uiBubble');
                    onClose();
                  }}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Body with independent scrolling if content exceeds viewport */}
            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

