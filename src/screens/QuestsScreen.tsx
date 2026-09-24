import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { SkillQuestSection } from '../components/forge/SkillQuestSection';
import { QuestCard } from '../components/forge/QuestCard';
import { CategoryGrid, CategoryGridItem } from '../components/ui/CategoryGrid';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Flame,
  Swords,
  Sparkles,
  Trophy,
  Shield,
  Compass,
  Target,
  Clock,
  Zap,
} from 'lucide-react';

import { TodaysQuestsModal } from '../components/forge/TodaysQuestsModal';
import { playUISound } from '../services/soundManager';
import { NoForgePathHero } from '../components/forge/NoForgePathHero';

export type QuestFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'completed';

export const QuestsScreen: React.FC = () => {
  const {
    quests,
    skills,
    forgePath,
    dailyIntent,
    clearTodayIntent,
    completeQuest,
    uncompleteQuest,
    deleteQuest,
    startQuestExecution,
  } = useGame();

  const [selectedFilter, setSelectedFilter] = useState<QuestFilter>('all');
  const [isTodayModalOpen, setIsTodayModalOpen] = useState(false);

  const hasForgePath = Boolean(forgePath?.domain && forgePath.domain.trim().length > 0);

  const activeSkills = skills
    .filter((s) => s.active)
    .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999));

  // Fallback: If no active skills yet, take top 3 skills
  const displaySkills = activeSkills.length > 0 ? activeSkills : skills.slice(0, 3);

  const completedQuestsToday = quests.filter((q) => q.completedToday);

  if (!hasForgePath) {
    return (
      <div id="quests-screen" className="space-y-5 pb-24">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-[var(--forge-text-primary)] flex items-center gap-2">
            <Swords className="w-5 h-5 text-[var(--forge-text-accent)]" />
            The Forge
          </h1>
          <p className="text-[10px] text-[var(--forge-text-secondary)] mt-0.5 uppercase tracking-widest font-mono">
            Daily deliberate actions that forge real-world mastery.
          </p>
        </div>

        <NoForgePathHero />
      </div>
    );
  }

  // Filter a skill's quests based on the selected cadence filter
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
      return true; // 'all'
    });
  };

  // Quests not associated with any active skill (e.g. custom or unassigned)
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
    <div id="quests-screen" className="space-y-5 pb-24">
      {/* Header & Forge Path Info */}
      <div className="space-y-2.5">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-[var(--forge-text-primary)] flex items-center gap-2">
            <Swords className="w-5 h-5 text-[var(--forge-text-accent)]" />
            The Forge
          </h1>
          <p className="text-[10px] text-[var(--forge-text-secondary)] mt-0.5 uppercase tracking-widest font-mono">
            3 Persistent Skills • Daily, Weekly & Monthly Cadences
          </p>
        </div>

        {/* Forge Path Status Pill */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs shadow-xs">
          <div className="flex items-center gap-2 overflow-hidden pr-2">
            <Compass className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
            <span className="text-[10px] font-mono uppercase text-[var(--forge-text-secondary)] shrink-0">Path:</span>
            <span className="font-bold text-[var(--forge-text-primary)] truncate text-[11px]">
              {forgePath?.name || 'Creative Expression & Drawing'}
            </span>
            {forgePath?.focus && (
              <span className="text-[10px] text-[var(--forge-text-muted)] hidden sm:inline truncate">
                • {forgePath.focus}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playUISound('tap');
              window.dispatchEvent(
                new CustomEvent('forge_set_subview', { detail: { subView: 'path' } })
              );
            }}
            className="text-[10px] font-mono uppercase text-[var(--forge-text-accent)] hover:underline shrink-0 font-bold cursor-pointer"
          >
            Change Path
          </button>
        </div>
      </div>

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
          <div className="w-full max-w-full box-border p-4 sm:p-5 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-colors space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center shrink-0">
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
                className="forge-button-primary px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider shrink-0 whitespace-nowrap transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                ADAPT TODAY
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-full box-border p-3.5 sm:p-4 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] shadow-sm space-y-2">
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
                  className="text-[10px] font-mono font-bold uppercase text-[var(--forge-text-accent)] hover:underline cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={clearTodayIntent}
                  className="text-[10px] font-mono font-bold uppercase text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--forge-text-primary)] italic font-sans leading-relaxed">
              "{dailyIntent.userPrompt || dailyIntent.notes}"
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[9px] font-mono">
              {dailyIntent.availableMinutes && (
                <span className="px-2 py-0.5 rounded bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-accent)] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {dailyIntent.availableMinutes}m budget
                </span>
              )}
              {dailyIntent.energyPreference && (
                <span className="px-2 py-0.5 rounded bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-cyan-600 dark:text-cyan-300 capitalize flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {dailyIntent.energyPreference} energy
                </span>
              )}
              {dailyIntent.difficultyPreference && dailyIntent.difficultyPreference !== 'moderate' && (
                <span className="px-2 py-0.5 rounded bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-purple-600 dark:text-purple-300 capitalize">
                  🎯 {dailyIntent.difficultyPreference} difficulty
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quests Grouped by Skill */}
      <div className="space-y-6">
        {totalFilteredCount === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--forge-border)] rounded-xl bg-[var(--forge-surface)]">
            <Check className="w-8 h-8 text-emerald-500/70 mx-auto mb-2" />
            <p className="text-sm font-serif font-bold text-[var(--forge-text-primary)]">
              {selectedFilter === 'completed'
                ? 'No completed quests yet in this view.'
                : 'No quests match the selected cadence.'}
            </p>
            <p className="text-xs text-[var(--forge-text-secondary)] mt-1">
              Select "All" to view all Daily, Weekly, and Monthly quests for your 3 skills.
            </p>
          </div>
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
                  onStart={startQuestExecution}
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
                    onStart={startQuestExecution}
                    onDelete={deleteQuest}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Today's Quests Adaptation Modal */}
      <TodaysQuestsModal
        isOpen={isTodayModalOpen}
        onClose={() => setIsTodayModalOpen(false)}
      />
    </div>
  );
};
