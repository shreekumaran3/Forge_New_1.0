import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Lock, Unlock, Plus, Calendar, Check, X, Sparkles, Send } from 'lucide-react';
import { MemoryCapsule, LegacyMilestone } from '../../types';
import { db } from '../../db/database';
import { Card } from '../ui/Card';
import { useBackHandler } from '../../services/backButtonManager';

interface MemoryCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  capsules: MemoryCapsule[];
  milestones: LegacyMilestone[];
}

export const MemoryCapsuleModal: React.FC<MemoryCapsuleModalProps> = ({
  isOpen,
  onClose,
  capsules,
  milestones,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [conditionType, setConditionType] = useState<MemoryCapsule['unlockConditionType']>('1_month');
  const [customMilestoneTitle, setCustomMilestoneTitle] = useState('');
  const [openedCapsule, setOpenedCapsule] = useState<MemoryCapsule | null>(null);

  useBackHandler(
    'memory-capsule-modal',
    100,
    () => {
      if (openedCapsule) {
        setOpenedCapsule(null);
      } else if (isCreating) {
        setIsCreating(false);
      } else {
        onClose();
      }
      return true;
    },
    isOpen
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const calculateUnlockDate = (type: MemoryCapsule['unlockConditionType']) => {
    const date = new Date();
    if (type === '1_month') date.setMonth(date.getMonth() + 1);
    else if (type === '3_months') date.setMonth(date.getMonth() + 3);
    else if (type === '1_year') date.setFullYear(date.getFullYear() + 1);
    else if (type === '5_years') date.setFullYear(date.getFullYear() + 5);
    return date.toISOString().split('T')[0];
  };

  const isCapsuleReadyToUnlock = (capsule: MemoryCapsule) => {
    if (capsule.isOpened) return false;

    if (capsule.unlockDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      return todayStr >= capsule.unlockDate;
    }

    if (capsule.unlockMilestoneTitle) {
      const found = milestones.find(
        (m) =>
          m.isUnlocked &&
          m.title.toLowerCase().includes(capsule.unlockMilestoneTitle!.toLowerCase())
      );
      if (found) return true;
    }

    return false;
  };

  const handleCreateCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const unlockDate = ['1_month', '3_months', '1_year', '5_years'].includes(conditionType)
      ? calculateUnlockDate(conditionType)
      : undefined;

    await db.memoryCapsules.add({
      title: title.trim(),
      message: message.trim(),
      createdAt: todayStr,
      unlockConditionType: conditionType,
      unlockDate,
      unlockMilestoneTitle: customMilestoneTitle.trim() || undefined,
      isOpened: false,
    });

    setTitle('');
    setMessage('');
    setCustomMilestoneTitle('');
    setIsCreating(false);
  };

  const handleOpenCapsule = async (capsule: MemoryCapsule) => {
    if (!capsule.id) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await db.memoryCapsules.update(capsule.id, {
      isOpened: true,
      openedAt: todayStr,
    });

    // Archive into Chronicle
    await db.chronicle.add({
      title: `Memory Capsule Opened: ${capsule.title}`,
      subtitle: `Message written on ${capsule.createdAt}`,
      category: 'capsule',
      date: todayStr,
      icon: 'Gift',
      details: capsule.message,
    });

    setOpenedCapsule(capsule);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-left max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--forge-text-accent)]" />
            <h3 className="font-serif text-lg font-bold text-[var(--forge-text-primary)]">Memory Capsules</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Capsule Modal Overlay if opened */}
        {openedCapsule ? (
          <div className="p-5 sm:p-6 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border-accent)] rounded-2xl space-y-4 text-center">
            <Sparkles className="w-8 h-8 text-[var(--forge-text-accent)] mx-auto animate-pulse" />
            <h4 className="font-serif text-xl font-bold text-[var(--forge-text-primary)]">{openedCapsule.title}</h4>
            <p className="text-xs text-[var(--forge-text-secondary)]">Written on {openedCapsule.createdAt}</p>

            <div className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl text-sm text-[var(--forge-text-primary)] leading-relaxed italic text-left whitespace-pre-wrap">
              &quot;{openedCapsule.message}&quot;
            </div>

            <p className="text-xs text-emerald-400 font-medium">
              ✓ Permanently archived into your Chronicle timeline.
            </p>

            <button
              type="button"
              onClick={() => setOpenedCapsule(null)}
              className="min-h-[40px] px-5 py-2.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer"
            >
              Back to Capsules
            </button>
          </div>
        ) : isCreating ? (
          /* Create Form */
          <form onSubmit={handleCreateCapsule} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                Capsule Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Message to my future self upon reaching peak milestone"
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                Unlock Trigger Condition
              </label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as any)}
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
              >
                <option value="1_month">Open in 1 Month</option>
                <option value="3_months">Open in 3 Months</option>
                <option value="1_year">Open in 1 Year</option>
                <option value="5_years">Open in 5 Years</option>
                <option value="project">Upon Project Completion</option>
                <option value="graduation">Upon Graduation</option>
                <option value="milestone">Upon Specific Milestone</option>
              </select>
            </div>

            {['project', 'graduation', 'milestone'].includes(conditionType) && (
              <div>
                <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                  Milestone or Project Name
                </label>
                <input
                  type="text"
                  value={customMilestoneTitle}
                  onChange={(e) => setCustomMilestoneTitle(e.target.value)}
                  placeholder="e.g., Mount Kinabalu Trek"
                  className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--forge-text-accent)] block mb-1">
                Message to Future Self *
              </label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What are your present hopes, fears, values, or wisdom you want your future self to remember?"
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="min-h-[40px] py-2 px-4 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] rounded-2xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="min-h-[40px] py-2 px-4 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] rounded-2xl text-xs font-bold border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Seal Memory Capsule</span>
              </button>
            </div>
          </form>
        ) : (
          /* List Capsules */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-[var(--forge-text-secondary)]">
                Sealed messages to your future self. They unlock when time passes or milestones are achieved.
              </p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="min-h-[36px] px-3.5 py-1.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Capsule</span>
              </button>
            </div>

            {capsules.length === 0 ? (
              <Card className="p-6 text-center space-y-2 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl">
                <Gift className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-60" />
                <h4 className="text-xs font-bold text-[var(--forge-text-primary)]">No Memory Capsules Created</h4>
                <p className="text-[11px] text-[var(--forge-text-secondary)]">
                  Write a message today to be opened in 1 month, 1 year, or upon completing a major milestone.
                </p>
              </Card>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {capsules.map((c) => {
                  const ready = isCapsuleReadyToUnlock(c);

                  return (
                    <Card
                      key={c.id}
                      className={`p-4 sm:p-5 relative border transition-all rounded-2xl ${
                        c.isOpened
                          ? 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-70'
                          : ready
                          ? 'bg-[var(--forge-surface)] border-[var(--forge-border-accent)] shadow-xs'
                          : 'bg-[var(--forge-surface)] border-[var(--forge-border)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] shrink-0">
                            {c.isOpened ? (
                              <Unlock className="w-4 h-4 text-emerald-400" />
                            ) : ready ? (
                              <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)] animate-bounce" />
                            ) : (
                              <Lock className="w-4 h-4 text-[var(--forge-text-accent)]" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                                {c.unlockConditionType.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-[var(--forge-text-secondary)] font-mono">
                                Sealed {c.createdAt}
                              </span>
                            </div>

                            <h4 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] mt-1">
                              {c.title}
                            </h4>

                            <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
                              {c.isOpened
                                ? `Opened on ${c.openedAt}`
                                : c.unlockDate
                                ? `Unlocks on ${c.unlockDate}`
                                : `Unlocks upon: ${c.unlockMilestoneTitle}`}
                            </p>
                          </div>
                        </div>

                        {ready && !c.isOpened && (
                          <button
                            type="button"
                            onClick={() => handleOpenCapsule(c)}
                            className="min-h-[36px] px-3.5 py-1.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all cursor-pointer shrink-0"
                          >
                            Open Capsule
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
