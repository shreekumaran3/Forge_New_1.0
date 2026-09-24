import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Sparkles,
  Target,
  Shield,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Skill, PillarId, StatId } from '../../types';
import { addCustomSkill, getActiveSkills, MAX_ACTIVE_SKILLS } from '../../services/skillService';
import { playUISound } from '../../services/soundManager';
import { useBackHandler } from '../../services/backButtonManager';

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillAdded?: (skill: Skill) => void;
}

const CATEGORY_PRESETS = [
  { label: 'Practical Craft', pillar: 'wisdom' as PillarId, stat: 'knowledge' as StatId },
  { label: 'Creative Expression', pillar: 'wisdom' as PillarId, stat: 'creativity' as StatId },
  { label: 'Physical Mastery', pillar: 'strength' as PillarId, stat: 'strength' as StatId },
  { label: 'Cognitive & Focus', pillar: 'wisdom' as PillarId, stat: 'focus' as StatId },
  { label: 'Communication & Speech', pillar: 'wisdom' as PillarId, stat: 'communication' as StatId },
  { label: 'Financial Stewardship', pillar: 'wisdom' as PillarId, stat: 'financial_literacy' as StatId },
];

export const AddSkillModal: React.FC<AddSkillModalProps> = ({
  isOpen,
  onClose,
  onSkillAdded,
}) => {
  const [name, setName] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [shouldActivate, setShouldActivate] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Android back button dismissal
  useBackHandler(
    'add-skill-modal',
    90,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  // Lock body scroll while open and check active skills count
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    getActiveSkills().then((active) => {
      setActiveCount(active.length);
      setShouldActivate(active.length < MAX_ACTIVE_SKILLS);
    });

    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    setName('');
    setDescription('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a skill name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const chosenCategory = CATEGORY_PRESETS[categoryIndex];
      const newSkill = await addCustomSkill({
        name: trimmed,
        category: chosenCategory.label,
        pillarId: chosenCategory.pillar,
        primaryStatId: chosenCategory.stat,
        description: description.trim() || undefined,
        active: activeCount < MAX_ACTIVE_SKILLS && shouldActivate,
      });

      playUISound('fanfare');
      if (onSkillAdded) {
        onSkillAdded(newSkill);
      }
      handleClose();
    } catch (err) {
      console.error('Failed to create skill:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create skill.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isRosterFull = activeCount >= MAX_ACTIVE_SKILLS;
  const currentCategory = CATEGORY_PRESETS[categoryIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] rounded-3xl shadow-2xl z-10 p-6 sm:p-7 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)]">
                  Add Persistent Skill
                </h2>
              </div>
              <p className="text-xs text-[var(--forge-text-secondary)]">
                Create a persistent skill with 5 progression stages and 3 deterministic quest cadences.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-elevated)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Skill Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)]">
                Skill Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Public Speaking, Guitar, Chess, Python..."
                required
                maxLength={40}
                className="w-full px-4 py-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] focus:border-[var(--forge-border-focus)] focus:outline-hidden text-sm font-medium text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-muted)] transition-colors"
                autoFocus
              />
            </div>

            {/* Category Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)]">
                Domain / Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORY_PRESETS.map((cat, idx) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategoryIndex(idx)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono text-left border transition-all cursor-pointer ${
                      categoryIndex === idx
                        ? 'border-[var(--forge-border-accent)] bg-amber-500/10 text-amber-300 font-bold shadow-xs'
                        : 'border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)]">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder={`Mastery and deliberate real-world practice of ${name.trim() || 'this skill'}...`}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] focus:border-[var(--forge-border-focus)] focus:outline-hidden text-xs text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-muted)] transition-colors resize-none"
              />
            </div>

            {/* Active Focus Status Card */}
            <div className="p-4 rounded-2xl border border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Focus Roster</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[var(--forge-text-muted)] font-bold">
                  {activeCount} / {MAX_ACTIVE_SKILLS} Active
                </span>
              </div>

              {isRosterFull ? (
                <p className="text-[11px] text-[var(--forge-text-muted)] font-mono leading-relaxed">
                  All 3 active focus slots are currently occupied. This skill will be created as{' '}
                  <span className="text-amber-300 font-semibold">Inactive</span> in your persistent collection. You can activate it at any time by deactivating another skill.
                </p>
              ) : (
                <label className="flex items-center gap-3 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shouldActivate}
                    onChange={(e) => setShouldActivate(e.target.checked)}
                    className="w-4 h-4 rounded-md border-[var(--forge-border)] text-amber-500 focus:ring-amber-500 bg-[var(--forge-surface)] cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[var(--forge-text-primary)]">
                    Activate immediately (Slot {activeCount + 1} of {MAX_ACTIVE_SKILLS})
                  </span>
                </label>
              )}
            </div>

            {/* Deterministic Quests Preview Card */}
            <div className="p-4 rounded-2xl border border-[var(--forge-border)]/60 bg-[var(--forge-surface-elevated)]/50 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deterministic Quest Architecture</span>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono text-[var(--forge-text-secondary)]">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400">1. Daily Sharpening</span>
                  <span>25 min • Deliberate Practice</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400">2. Weekly Skill Check</span>
                  <span>50 min • Applied Benchmark</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-400">3. Monthly Monument</span>
                  <span>90 min • Landmark Masterwork</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-mono text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-elevated)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="forge-button-primary px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isSubmitting ? (
                  <span>Forging...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Skill</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
