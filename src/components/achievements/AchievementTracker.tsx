import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { Achievement } from '../../types';
import { Card } from '../ui/Card';
import { useGame } from '../../context/GameContext';
import { Award, CheckCircle2, Lock, Sparkles, Trophy, Zap } from 'lucide-react';
import { playUISound } from '../../services/soundManager';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first_workout',
    title: 'First Heavy Iron',
    description: 'Complete and log your first workout session.',
    icon: 'Dumbbell',
    category: 'workout',
    unlocked: false,
    progress: 0,
    reqTarget: 1,
    reqCurrent: 0,
    xpReward: 100,
  },
  {
    id: 'ach_7_streak',
    title: 'Unwavering Momentum',
    description: 'Maintain a 7-day active daily streak.',
    icon: 'Flame',
    category: 'streak',
    unlocked: false,
    progress: 0,
    reqTarget: 7,
    reqCurrent: 0,
    xpReward: 150,
  },
  {
    id: 'ach_level_5',
    title: 'Sovereign Aspirant',
    description: 'Reach Character Level 5.',
    icon: 'Shield',
    category: 'level',
    unlocked: false,
    progress: 0,
    reqTarget: 5,
    reqCurrent: 0,
    xpReward: 200,
  },
  {
    id: 'ach_5_journal',
    title: 'The Reflective Mind',
    description: 'Write and save 5 personal journal entries.',
    icon: 'BookOpen',
    category: 'journal',
    unlocked: false,
    progress: 0,
    reqTarget: 5,
    reqCurrent: 0,
    xpReward: 100,
  },
  {
    id: 'ach_10_quests',
    title: 'Taskmaster',
    description: 'Complete 10 daily quests.',
    icon: 'Check',
    category: 'xp',
    unlocked: false,
    progress: 0,
    reqTarget: 10,
    reqCurrent: 0,
    xpReward: 150,
  },
];

export const AchievementTracker: React.FC = () => {
  const { player, grantXpToPlayerAndStats } = useGame();
  const achievements = useLiveQuery(() => db.achievements.toArray()) || [];
  const workoutLogsCount = useLiveQuery(() => db.workoutLogs.count()) || 0;
  const journalEntriesCount = useLiveQuery(() => db.journalEntries.count()) || 0;
  const questLogsCount = useLiveQuery(() => db.questLogs.count()) || 0;

  // Initialize and evaluate achievements
  useEffect(() => {
    const evaluate = async () => {
      try {
        const existing = await db.achievements.toArray();
        if (existing.length === 0) {
          await db.achievements.bulkPut(INITIAL_ACHIEVEMENTS);
          return;
        }

        if (!player) return;

        const todayStr = new Date().toISOString().split('T')[0];

        for (const ach of existing) {
          if (ach.unlocked) continue;

          let cur = 0;
          if (ach.id === 'ach_first_workout') cur = workoutLogsCount;
          else if (ach.id === 'ach_7_streak') cur = player.currentStreak || 1;
          else if (ach.id === 'ach_level_5') cur = player.level || 1;
          else if (ach.id === 'ach_5_journal') cur = journalEntriesCount;
          else if (ach.id === 'ach_10_quests') cur = questLogsCount;

          const isNowUnlocked = cur >= ach.reqTarget;

          if (isNowUnlocked || cur !== ach.reqCurrent) {
            await db.achievements.update(ach.id, {
              reqCurrent: cur,
              progress: Math.min(100, Math.round((cur / ach.reqTarget) * 100)),
              unlocked: isNowUnlocked,
              unlockedAt: isNowUnlocked ? todayStr : undefined,
            });

            if (isNowUnlocked) {
              playUISound('achievement');
              // Award XP through central progression engine
              await grantXpToPlayerAndStats({
                generalXp: ach.xpReward,
                title: ach.title,
                category: ach.category,
              });

              await db.chronicle.add({
                title: `Achievement Unlocked: ${ach.title}`,
                subtitle: ach.description,
                category: 'landmark',
                date: todayStr,
                icon: 'Trophy',
                xpReward: ach.xpReward,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error evaluating achievements:', err);
      }
    };

    evaluate();
  }, [player, workoutLogsCount, journalEntriesCount, questLogsCount]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent,#D4AF37)] flex items-center gap-2 font-serif">
          <Trophy className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />
          Achievements & Trophies
        </h2>
        <p className="text-[10px] text-[var(--forge-text-secondary,#8E9299)]">
          Earned through real-life actions, workouts, and consistency.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((ach) => (
          <Card
            key={ach.id}
            className={`space-y-2 border transition-all ${
              ach.unlocked
                ? 'bg-[#0D120D] border-emerald-500/40'
                : 'bg-[var(--forge-surface,#080808)] border-[var(--forge-border,#1C1C1C)] opacity-75'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg border ${
                    ach.unlocked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[var(--forge-bg-elevated,#121212)] border-[var(--forge-border,#222)] text-[var(--forge-text-secondary,#8E9299)]'
                  }`}
                >
                  {ach.unlocked ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>

                <div>
                  <h3 className="font-serif font-bold text-xs text-[var(--forge-text-primary,white)]">{ach.title}</h3>
                  <span className="text-[10px] text-[var(--forge-text-secondary,#8E9299)]">{ach.description}</span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-[var(--forge-text-accent,#D4AF37)] shrink-0">+{ach.xpReward} XP</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--forge-text-secondary,#8E9299)]">
                <span>Progress</span>
                <span>
                  {ach.reqCurrent} / {ach.reqTarget} ({ach.progress}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--forge-bg-elevated,#121212)] rounded-full overflow-hidden border border-[var(--forge-border,#222)]">
                <div
                  className={`h-full transition-all duration-300 ${
                    ach.unlocked ? 'bg-emerald-500' : 'bg-[var(--forge-primary,#D4AF37)]'
                  }`}
                  style={{ width: `${ach.progress}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
