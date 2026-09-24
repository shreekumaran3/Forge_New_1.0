import React from 'react';
import { Skill, Quest } from '../../types';
import { QuestCard } from './QuestCard';
import {
  Palette,
  PenTool,
  Flame,
  Utensils,
  Coins,
  Sparkles,
  Target,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';

interface SkillQuestSectionProps {
  skill: Skill;
  quests: Quest[];
  onComplete: (questId: number) => Promise<void> | void;
  onUncomplete: (questId: number) => Promise<void> | void;
  onStart: (questId: number) => Promise<any> | any;
  onDelete?: (questId: number) => Promise<void> | void;
}

export const getSkillIcon = (skillId: string, skillName: string) => {
  const s = (skillId + ' ' + skillName).toLowerCase();
  if (s.includes('draw') || s.includes('art') || s.includes('sketch')) return Palette;
  if (s.includes('writ') || s.includes('author') || s.includes('prose')) return PenTool;
  if (s.includes('fit') || s.includes('workout') || s.includes('train') || s.includes('strength')) return Flame;
  if (s.includes('cook') || s.includes('culinary') || s.includes('chef')) return Utensils;
  if (s.includes('financ') || s.includes('money') || s.includes('budget') || s.includes('invest')) return Coins;
  return Target;
};

// Fixed quest type display order: Daily Sharpening -> Weekly Skill Check -> Monthly Monument
const QUEST_TYPE_ORDER: Record<string, number> = {
  daily_sharpening: 1,
  weekly_skill_check: 2,
  monthly_monument: 3,
};

export const SkillQuestSection: React.FC<SkillQuestSectionProps> = ({
  skill,
  quests,
  onComplete,
  onUncomplete,
  onStart,
  onDelete,
}) => {
  const IconComponent = getSkillIcon(skill.id, skill.name);

  // Sort quests by canonical quest type order
  const sortedQuests = [...quests].sort((a, b) => {
    const orderA = a.questType ? QUEST_TYPE_ORDER[a.questType] || 99 : 99;
    const orderB = b.questType ? QUEST_TYPE_ORDER[b.questType] || 99 : 99;
    return orderA - orderB;
  });

  const practiceHours = ((skill.totalPracticeSeconds || 0) / 3600).toFixed(1);

  return (
    <section className="space-y-3.5 pt-2">
      {/* Skill Group Header */}
      <div className="flex items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center shrink-0 shadow-xs">
            <IconComponent className="w-5 h-5 text-[var(--forge-text-accent)]" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-base sm:text-lg font-extrabold uppercase tracking-widest text-[var(--forge-text-primary)] truncate">
              {skill.name}
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--forge-text-secondary)] mt-0.5">
              <span className="text-[var(--forge-text-accent)] font-semibold">
                Band {skill.currentStage || 1}
              </span>
              <span>•</span>
              <span>Level {skill.level || 1}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--forge-text-accent)]" />
                {practiceHours} hrs practiced
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--forge-text-secondary)] bg-[var(--forge-surface)] px-2.5 py-1 rounded-full border border-[var(--forge-border)]">
            {quests.filter((q) => q.completedToday).length}/{quests.length} Done
          </span>
        </div>
      </div>

      {/* Quests for this Skill */}
      <div className="space-y-3">
        {sortedQuests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onStart={onStart}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
};
