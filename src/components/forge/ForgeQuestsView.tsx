import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { Button } from '../ui/Button';
import { QuestCard } from './QuestCard';
import { SkillQuestSection } from './SkillQuestSection';
import { CategoryGrid, CategoryGridItem } from '../ui/CategoryGrid';
import { BackButton } from '../ui/BackButton';
import {
  Check,
  Flame,
  Swords,
  Sparkles,
  Trophy,
  Compass,
  Zap,
  Calendar,
  Clock,
} from 'lucide-react';

import { TodaysQuestsModal } from './TodaysQuestsModal';
import { playUISound } from '../../services/soundManager';
import { NoForgePathHero } from './NoForgePathHero';

interface ForgeQuestsViewProps {
  onBack?: () => void;
  tourStepId?: string;
  onOpenExecution?: (executionId?: string) => void;
  onOpenForgePath?: () => void;
}

export type QuestFilterCadence = 'all' | 'daily' | 'weekly' | 'monthly' | 'completed';

export const ForgeQuestsView: React.FC<ForgeQuestsViewProps> = ({
  onBack,
  tourStepId,
  onOpenExecution,
  onOpenForgePath,
}) => {
  const {
    quests,
    skills,
    forgePath,
    dailyIntent,
    clearTodayIntent,
    activeExecution,
    startQuestExecution,
    completeQuest,
    uncompleteQuest,
    deleteQuest,
  } = useGame();

  const [isTodayModalOpen, setIsTodayModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<QuestFilterCadence>('all');

  const hasForgePath = Boolean(forgePath?.domain && forgePath.domain.trim().length > 0);

  // Auto-switch to active quests when tutorial requires quests
  React.useEffect(() => {
    if (tourStepId === 'tutorial-quest' || tourStepId === 'quests-roster') {
      setSelectedFilter('all');
    }
  }, [tourStepId]);

  const activeSkills = skills
    .filter((s) => s.active)
    .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999));

  const displaySkills = activeSkills.length > 0 ? activeSkills : skills.slice(0, 3);
  const completedQuestsToday = quests.filter((q) => q.completedToday);

  const handleStartQuest = async (questId: number) => {
    try {
      const exec = await startQuestExecution(questId);
      if (onOpenExecution) {
        onOpenExecution(exec.executionId);
      }
    } catch (err) {
      console.error('Failed to start quest execution:', err);
    }
  };

  if (!hasForgePath) {
    return (
      <div id="forge-quests-view" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <BackButton
              onClick={onBack}
              label="Forge"
              sublabel="Quests"
              id="forge-quests-back-btn"
            />
          ) : (
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--forge-text-primary)]">
              Quests
            </h1>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-mono text-[var(--forge-text-secondary)] ml-auto shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            <span>Today</span>
          </div>
        </div>

        <NoForgePathHero onOpenForgePath={onOpenForgePath} />
      </div>
    );
  }

  // Filter a skill's quests based on selected cadence
  const getFilteredQuestsForSkill = (skillId: string) => {
    const rawId = skillId.replace(/^skill_/, '');
    const skillQuests = quests.filter(
      (q) => q.skillId === skillId || q.skillId === rawId
    );

    return skillQuests.filter((q) => {
      if (selectedFilter === 'completed') {
        return Boolean(q.completedToday);
      }
      if (selectedFilter === 'daily') {
        return q.questType === 'daily_sharpening';
      }
      if (selectedFilter === 'weekly') {
        return q.questType === 'weekly_skill_check';
      }
      if (selectedFilter === 'monthly') {
        return q.questType === 'monthly_monument';
      }
      return true;
    });
  };

  const otherQuests = quests.filter((q) => {
    const belongsToActive = displaySkills.some(
      (s) => q.skillId === s.id || q.skillId === s.id.replace(/^skill_/, '')
    );
    if (belongsToActive) return false;
    if (selectedFilter === 'completed') return Boolean(q.completedToday);
    if (selectedFilter === 'daily') return q.questType === 'daily_sharpening';
    if (selectedFilter === 'weekly') return q.questType === 'weekly_skill_check';
    if (selectedFilter === 'monthly') return q.questType === 'monthly_monument';
    return true;
  });

  const totalFilteredCount =
    displaySkills.reduce((acc, s) => acc + getFilteredQuestsForSkill(s.id).length, 0) +
    otherQuests.length;

  return (
    <div id="forge-quests-view" className="space-y-6">
      {/* Top Bar with Back button & Date control */}
      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <BackButton
            onClick={onBack}
            label="Forge"
            sublabel="Quests"
            id="forge-quests-back-btn"
          />
        )}

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-mono text-[var(--forge-text-secondary)] ml-auto shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
          <span>Today</span>
        </div>
      </div>

      {/* ACTIVE MISSION IN PROGRESS WIDGET BANNER */}
      {activeExecution && activeExecution.status !== 'COMPLETED' && activeExecution.status !== 'CANCELLED' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[var(--forge-surface-elevated)] to-[var(--forge-surface)] border-2 border-[var(--forge-border-accent)] shadow-md flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-[var(--forge-text-accent)] animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="forge-pill forge-pill-accent text-[10px] mb-0.5">
                Active Mission In Progress
              </span>
              <h4 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] truncate">
                {activeExecution.questTitle}
              </h4>
              <p className="text-xs text-[var(--forge-text-secondary)] font-mono">
                {activeExecution.status === 'EXTENSION' ? '⚡ Overtime Training Mode' : 'Training active'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenExecution && onOpenExecution(activeExecution.executionId)}
            className="forge-button-primary px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider shrink-0"
          >
            Resume Mission
          </button>
        </motion.div>
      )}

      {/* Structured 5-Item Category Grid */}
      <div className="space-y-3">
        <CategoryGrid variant="primary" cols={5}>
          <CategoryGridItem
            id="all"
            label="All"
            count={quests.length}
            icon={<Swords className="w-3.5 h-3.5 text-[#D4AF37]" />}
            isActive={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          />
          <CategoryGridItem
            id="daily"
            label="Daily"
            icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
            isActive={selectedFilter === 'daily'}
            onClick={() => setSelectedFilter('daily')}
          />
          <CategoryGridItem
            id="weekly"
            label="Weekly"
            icon={<Compass className="w-3.5 h-3.5 text-cyan-400" />}
            isActive={selectedFilter === 'weekly'}
            onClick={() => setSelectedFilter('weekly')}
          />
          <CategoryGridItem
            id="monthly"
            label="Monthly"
            icon={<Trophy className="w-3.5 h-3.5 text-purple-400" />}
            isActive={selectedFilter === 'monthly'}
            onClick={() => setSelectedFilter('monthly')}
          />
          <CategoryGridItem
            id="completed"
            label="Done"
            count={completedQuestsToday.length}
            icon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
            isActive={selectedFilter === 'completed'}
            onClick={() => setSelectedFilter('completed')}
          />
        </CategoryGrid>

        {/* Today's Adaptation Card placed directly below Category Grid */}
        {!dailyIntent ? (
          <div 
            data-system-guide="todays-adaptation"
            className="w-full max-w-full box-border p-4 sm:p-5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-colors space-y-3 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
              </div>
              <h3 className="font-serif text-sm sm:text-base font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
                ADAPT TODAY
              </h3>
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)] font-sans leading-relaxed flex-1 min-w-0">
                Tell Forge what you can realistically do today.
              </p>
              <button
                type="button"
                onClick={() => setIsTodayModalOpen(true)}
                className="forge-button-secondary px-3.5 sm:px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider shrink-0 whitespace-nowrap active:scale-95"
              >
                ADAPT TODAY
              </button>
            </div>
          </div>
        ) : (
          <div 
            data-system-guide="todays-adaptation"
            className="w-full max-w-full box-border p-3.5 sm:p-4 rounded-2xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border-accent)] shadow-sm space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--forge-text-accent)] animate-pulse" />
                <span className="font-serif text-xs font-bold uppercase tracking-wider text-[var(--forge-text-accent)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Active Adaptation
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTodayModalOpen(true)}
                  className="text-xs font-mono font-bold uppercase text-[var(--forge-text-accent)] hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={clearTodayIntent}
                  className="text-xs font-mono font-bold uppercase text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--forge-text-primary)] italic font-sans leading-relaxed">
              "{dailyIntent.userPrompt || dailyIntent.notes}"
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono">
              {dailyIntent.availableMinutes && (
                <span className="forge-pill text-amber-300">
                  <Clock className="w-3 h-3" /> {dailyIntent.availableMinutes}m budget
                </span>
              )}
              {dailyIntent.energyPreference && (
                <span className="forge-pill text-cyan-300 capitalize">
                  <Zap className="w-3 h-3" /> {dailyIntent.energyPreference} energy
                </span>
              )}
              {dailyIntent.difficultyPreference && dailyIntent.difficultyPreference !== 'moderate' && (
                <span className="forge-pill text-purple-300 capitalize">
                  🎯 {dailyIntent.difficultyPreference} difficulty
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quests Grouped by Skill */}
      <div data-forge-tour="active-quests" data-system-guide="quests-roster" className="space-y-6">
        <AnimatePresence mode="popLayout">
          {totalFilteredCount === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 text-center border border-dashed border-[var(--forge-border)] rounded-3xl bg-[var(--forge-surface)]"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-base font-serif font-bold text-[var(--forge-text-primary)]">
                {selectedFilter === 'completed'
                  ? 'No completed quests yet in this view.'
                  : 'No quests match the selected cadence.'}
              </p>
              <p className="text-xs text-[var(--forge-text-secondary)] mt-1 max-w-sm mx-auto">
                Select "All" to view all Daily, Weekly, and Monthly quests for your active skills.
              </p>
            </motion.div>
          ) : (
            <>
              {displaySkills.map((skill) => {
                const skillQuests = getFilteredQuestsForSkill(skill.id);
                if (skillQuests.length === 0) return null;

                return (
                  <SkillQuestSection
                    key={skill.id}
                    skill={skill}
                    quests={skillQuests}
                    onComplete={completeQuest}
                    onUncomplete={uncompleteQuest}
                    onStart={handleStartQuest}
                    onDelete={deleteQuest}
                  />
                );
              })}

              {otherQuests.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] px-1">
                    Additional Quests
                  </h3>
                  {otherQuests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      onComplete={completeQuest}
                      onUncomplete={uncompleteQuest}
                      onStart={handleStartQuest}
                      onDelete={deleteQuest}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Today's Quests Adaptation Modal */}
      <TodaysQuestsModal
        isOpen={isTodayModalOpen}
        onClose={() => setIsTodayModalOpen(false)}
      />
    </div>
  );
};
