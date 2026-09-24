import { PlayerProfile, QuestLog, Skill, PlayerStatState, AIMentorMessage, HealthLog } from '../types';

export function generateMentorAdvice(
  player: PlayerProfile,
  skills: Skill[],
  recentLogs: QuestLog[],
  stats: PlayerStatState[],
  healthLog?: HealthLog | null
): AIMentorMessage[] {
  const messages: AIMentorMessage[] = [];
  const now = new Date().toISOString();

  if (healthLog) {
    if (healthLog.stepCount && healthLog.stepCount >= 10000) {
      messages.push({
        id: 104,
        text: `10,000 steps logged today. Your physical consistency is building a strong foundation.`,
        type: 'encouragement',
        createdAt: now,
        isRead: false,
      });
    }
  }

  // Check streak encouragement
  if (player.currentStreak >= 3) {
    messages.push({
      id: 1,
      text: `You've maintained momentum for ${player.currentStreak} consecutive days. Ordinary daily actions are building an unshakeable foundation.`,
      type: 'streak',
      createdAt: now,
      isRead: false,
    });
  }

  // Low level skill callout
  const lowSkill = skills.find((s) => s.level <= 2);
  if (lowSkill) {
    messages.push({
      id: 2,
      text: `Your skill "${lowSkill.name}" is currently Level ${lowSkill.level}. Focus a single quest here today to accelerate mastery.`,
      type: 'encouragement',
      createdAt: now,
      isRead: false,
    });
  }

  // Stat imbalance suggestion
  if (stats.length > 0) {
    const sortedStats = [...stats].sort((a, b) => a.level - b.level);
    const lowestStat = sortedStats[0];
    if (lowestStat && lowestStat.level < 5) {
      messages.push({
        id: 3,
        text: `Stat focus: ${lowestStat.statId.toUpperCase()} is your lowest attribute at Level ${lowestStat.level}. Complete relevant quests to maintain character balance.`,
        type: 'warning',
        createdAt: now,
        isRead: false,
      });
    }
  }

  return messages;
}
