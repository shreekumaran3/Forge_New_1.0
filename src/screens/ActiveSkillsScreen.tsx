import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { BackButton } from '../components/ui/BackButton';
import { ProgressBar } from '../components/ui/ProgressBar';
import { activateSkill, deactivateSkill, reorderActiveSkills } from '../services/skillService';
import { getSkillXpNextLevel } from '../services/xpService';
import { playUISound } from '../services/soundManager';
import { Skill } from '../types';
import { AddSkillModal } from '../components/skills/AddSkillModal';
import {
  Target,
  GripVertical,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react';

interface ActiveSkillsScreenProps {
  onBack: () => void;
}

export const ActiveSkillsScreen: React.FC<ActiveSkillsScreenProps> = ({ onBack }) => {
  const { skills = [] } = useGame();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [draggedSkillId, setDraggedSkillId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Derive active and inactive skills directly from persistent Skill records
  const activeSkills: Skill[] = skills
    .filter((s) => Boolean(s.active))
    .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999));

  const inactiveSkills: Skill[] = skills
    .filter((s) => !s.active)
    .sort((a, b) => a.name.localeCompare(b.name));

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Handle Activating an Inactive Skill
  const handleActivate = async (skillId: string) => {
    if (isProcessing) return;

    if (activeSkills.length >= 3) {
      playUISound('tap');
      showFeedback('Maximum 3 Active Skills. Deactivate one before activating another.');
      return;
    }

    setIsProcessing(true);
    playUISound('tap');
    try {
      const res = await activateSkill(skillId);
      if (!res.success && res.reason) {
        showFeedback(res.reason);
      }
    } catch (err) {
      console.error('Failed to activate skill:', err);
      showFeedback('Failed to activate skill. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Deactivating an Active Skill
  const handleDeactivate = async (skillId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    playUISound('tap');
    try {
      await deactivateSkill(skillId);
    } catch (err) {
      console.error('Failed to deactivate skill:', err);
      showFeedback('Failed to deactivate skill. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and Drop Handlers for Active Skills Reordering
  const handleDragStart = (e: React.DragEvent, skillId: string) => {
    setDraggedSkillId(skillId);
    e.dataTransfer.effectAllowed = 'move';
    // Set transparent drag ghost or data
    e.dataTransfer.setData('text/plain', skillId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedSkillId(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (!draggedSkillId || isProcessing) return;

    const currentIndex = activeSkills.findIndex((s) => s.id === draggedSkillId);
    if (currentIndex === -1 || currentIndex === dropIndex) {
      setDraggedSkillId(null);
      return;
    }

    // Calculate new ordered IDs
    const newItems = [...activeSkills];
    const [moved] = newItems.splice(currentIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    const orderedIds = newItems.map((s) => s.id);

    setIsProcessing(true);
    playUISound('tap');
    try {
      await reorderActiveSkills(orderedIds);
    } catch (err) {
      console.error('Failed to reorder active skills:', err);
      showFeedback('Failed to reorder active skills.');
    } finally {
      setDraggedSkillId(null);
      setIsProcessing(false);
    }
  };

  // Accessible Move Up / Move Down Priority controls
  const handleMovePriority = async (currentIndex: number, direction: 'up' | 'down') => {
    if (isProcessing) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeSkills.length) return;

    const newItems = [...activeSkills];
    const [moved] = newItems.splice(currentIndex, 1);
    newItems.splice(targetIndex, 0, moved);
    const orderedIds = newItems.map((s) => s.id);

    setIsProcessing(true);
    playUISound('tap');
    try {
      await reorderActiveSkills(orderedIds);
    } catch (err) {
      console.error('Failed to swap priority:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="active-skills-screen-root" className="space-y-6 pb-24">
      {/* 1. SCREEN HEADER */}
      <div className="flex items-center justify-between gap-3">
        <BackButton
          onClick={onBack}
          label="Forge"
          sublabel="Home"
          id="active-skills-back-btn"
        />

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="forge-button-primary px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            id="add-skill-header-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Skill</span>
          </button>

          <div className="forge-pill forge-pill-accent px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            <span>{activeSkills.length} / 3 Active</span>
          </div>
        </div>
      </div>

      {/* Screen Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] tracking-tight">
          ACTIVE SKILLS
        </h1>
        <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)]">
          Choose up to 3 skills to focus on right now.
        </p>
      </div>

      {/* Feedback Banner (e.g. 3 active skills limit rejection) */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5 shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium leading-relaxed">{feedbackMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State if player has no persistent skills yet */}
      {skills.length === 0 ? (
        <div className="forge-card p-8 rounded-xl text-center space-y-3 border border-[var(--forge-border)] bg-[var(--forge-surface)]">
          <div className="w-12 h-12 rounded-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center justify-center mx-auto text-[var(--forge-text-muted)]">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)]">
              NO SKILLS YET
            </h3>
            <p className="text-xs text-[var(--forge-text-secondary)] max-w-sm mx-auto leading-relaxed">
              Your Forge Path will establish the skills you can develop.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* SECTION 1: ACTIVE SKILLS (Priority 1, 2, 3) */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold">
                  Active Focus ({activeSkills.length} / 3)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[var(--forge-text-muted)]">
                Priority 1 is highest
              </span>
            </div>

            {activeSkills.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--forge-border)] text-center text-xs text-[var(--forge-text-muted)] font-mono">
                No active skills currently selected. Tap any skill below to activate it.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSkills.map((skill, index) => {
                  const isDragged = draggedSkillId === skill.id;
                  const isDropTarget = dragOverIndex === index;
                  const priority = skill.activePriority ?? index + 1;
                  const nextXp = getSkillXpNextLevel(skill.level);
                  const xpPercent = Math.min(100, Math.round((skill.currentXp / nextXp) * 100));

                  const priorityLabel =
                    priority === 1
                      ? 'PRIORITY 1 • PRIMARY FOCUS'
                      : priority === 2
                      ? 'PRIORITY 2 • SECONDARY FOCUS'
                      : 'PRIORITY 3 • SUPPORT FOCUS';

                  const priorityBadgeStyle =
                    priority === 1
                      ? 'text-amber-300 bg-amber-500/15 border-amber-500/30 shadow-xs'
                      : priority === 2
                      ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                      : 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30';

                  const cardBorder =
                    priority === 1
                      ? 'border-amber-500/30 bg-amber-500/[0.03]'
                      : priority === 2
                      ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                      : 'border-cyan-500/25 bg-cyan-500/[0.02]';

                  const progressColor = priority === 1 ? 'gold' : priority === 2 ? 'emerald' : 'blue';

                  return (
                    <motion.div
                      key={skill.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, skill.id)}
                      onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e as unknown as React.DragEvent, index)}
                      className={`relative p-4 rounded-xl border transition-all select-none space-y-3 ${
                        isDragged ? 'opacity-40 scale-[0.99]' : 'opacity-100'
                      } ${
                        isDropTarget
                          ? 'border-emerald-400 bg-emerald-500/10'
                          : cardBorder
                      }`}
                    >
                      {/* Top Bar: Priority Badge + Domain + Controls */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Drag Handle */}
                          <div
                            title="Drag to reorder priority"
                            className="p-1 -ml-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] cursor-grab active:cursor-grabbing shrink-0"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Priority Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${priorityBadgeStyle}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                priority === 1
                                  ? 'bg-amber-400'
                                  : priority === 2
                                  ? 'bg-emerald-400'
                                  : 'bg-cyan-400'
                              }`}
                            />
                            {priorityLabel}
                          </span>

                          {skill.domain && (
                            <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider">
                              {skill.domain}
                            </span>
                          )}
                        </div>

                        {/* Controls: Priority Reorder Arrows + Deactivate Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              title="Increase priority"
                              disabled={index === 0 || isProcessing}
                              onClick={() => handleMovePriority(index, 'up')}
                              className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-elevated)] disabled:opacity-20 transition-colors"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Decrease priority"
                              disabled={index === activeSkills.length - 1 || isProcessing}
                              onClick={() => handleMovePriority(index, 'down')}
                              className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-elevated)] disabled:opacity-20 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(skill.id)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 rounded-md text-xs font-mono font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors"
                          >
                            Deactivate
                          </button>
                        </div>
                      </div>

                      {/* Main Skill Info: Name & Stage */}
                      <div className="space-y-1">
                        <h3 className="font-serif text-lg font-bold text-[var(--forge-text-primary)] tracking-tight">
                          {skill.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs font-mono text-[var(--forge-text-secondary)]">
                          <span>
                            Stage {skill.currentStage || 1} of {skill.totalStages || 5}
                            {skill.stageName ? ` • ${skill.stageName}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Option 1: Progress Bar Component */}
                      <div className="pt-2 border-t border-[var(--forge-border)]/50 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[var(--forge-text-secondary)] font-medium">
                            Level {skill.level} Progress
                          </span>
                          <span className="text-[var(--forge-text-accent)] font-bold">
                            {skill.currentXp} / {nextXp} XP ({xpPercent}%)
                          </span>
                        </div>

                        <ProgressBar
                          value={skill.currentXp}
                          max={nextXp}
                          color={progressColor}
                          size="sm"
                          showValues={false}
                        />

                        {skill.stagePurpose && (
                          <p className="text-[11px] text-[var(--forge-text-secondary)]/80 italic line-clamp-1 pt-0.5">
                            {skill.stagePurpose}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: INACTIVE SKILLS */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold">
                Inactive Skills ({inactiveSkills.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-[11px] font-mono font-semibold text-[var(--forge-text-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Skill</span>
                </button>
                <span className="text-[11px] font-mono text-[var(--forge-text-muted)]">
                  • Tap to activate
                </span>
              </div>
            </div>

            {inactiveSkills.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--forge-border)] text-center text-xs text-[var(--forge-text-muted)] font-mono">
                All skills are currently active in your focus roster.
              </div>
            ) : (
              <div className="space-y-2.5">
                {inactiveSkills.map((skill) => {
                  const nextXp = getSkillXpNextLevel(skill.level);
                  const xpPercent = Math.min(100, Math.round((skill.currentXp / nextXp) * 100));

                  return (
                    <motion.div
                      key={skill.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleActivate(skill.id)}
                      className="p-4 rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)] hover:bg-[var(--forge-surface-elevated)] hover:border-[var(--forge-border-focus)] transition-all cursor-pointer group select-none space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium text-[var(--forge-text-muted)] bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                              Inactive
                            </span>
                            {skill.domain && (
                              <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider">
                                {skill.domain}
                              </span>
                            )}
                          </div>

                          <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)] group-hover:text-[var(--forge-text-accent)] transition-colors truncate">
                            {skill.name}
                          </h3>

                          <p className="text-xs text-[var(--forge-text-secondary)] font-mono">
                            Stage {skill.currentStage || 1} / {skill.totalStages || 5} • Level {skill.level}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(skill.id);
                          }}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-[var(--forge-text-primary)] bg-[var(--forge-surface-elevated)] hover:bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] group-hover:border-emerald-500/40 transition-colors shrink-0"
                        >
                          Activate
                        </button>
                      </div>

                      {/* Progress Bar in Inactive Card */}
                      <div className="pt-1.5 border-t border-[var(--forge-border)]/40 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--forge-text-secondary)]">
                          <span>Progress to Level {skill.level + 1}</span>
                          <span>{skill.currentXp} / {nextXp} XP ({xpPercent}%)</span>
                        </div>
                        <ProgressBar
                          value={skill.currentXp}
                          max={nextXp}
                          color="secondary"
                          size="sm"
                          showValues={false}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Explicit Add Persistent Skill Action Card */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full p-3.5 rounded-xl border border-dashed border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] bg-[var(--forge-surface)]/50 hover:bg-[var(--forge-surface-elevated)] transition-all flex items-center justify-center gap-2 text-xs font-mono font-medium text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Another Persistent Skill</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Skill Creation Modal */}
      <AddSkillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSkillAdded={(newSkill) =>
          showFeedback(`Created "${newSkill.name}" with Daily, Weekly, and Monthly quests.`)
        }
      />
    </div>
  );
};
