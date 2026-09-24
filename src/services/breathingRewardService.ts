/**
 * KEEP WALKING - Breathing System 2.0 Authoritative Reward Service
 * Calculates XP rewards for completed breathing and mindfulness sessions.
 * 
 * Strict Rule:
 * - Completed session = Granted XP based on duration
 * - Abandoned / Quit session = 0 XP
 */

export interface BreathingRewardParams {
  durationSec: number;
  selectedDurationMin: number; // -1 for infinite
  modeId: string;
  isCompleted: boolean;
}

export interface BreathingRewardResult {
  xpEarned: number;
  isCompleted: boolean;
  focusXp: number;
  resilienceXp: number;
  durationMin: number;
}

/**
 * Single authoritative reward calculation function for breathing sessions.
 */
export function calculateBreathingCompletionReward(params: BreathingRewardParams): BreathingRewardResult {
  const { durationSec, isCompleted } = params;

  // Strict Rule: Abandoned / Incomplete = 0 XP
  if (!isCompleted || durationSec < 30) {
    return {
      xpEarned: 0,
      isCompleted: false,
      focusXp: 0,
      resilienceXp: 0,
      durationMin: Math.floor(durationSec / 60),
    };
  }

  const durationMin = Math.max(1, Math.round(durationSec / 60));

  // Duration-based XP tier scaling
  let baseXp = 0;
  if (durationMin <= 1) baseXp = 15;
  else if (durationMin <= 3) baseXp = 30;
  else if (durationMin <= 5) baseXp = 50;
  else if (durationMin <= 10) baseXp = 85;
  else if (durationMin <= 15) baseXp = 120;
  else if (durationMin <= 20) baseXp = 150;
  else if (durationMin <= 30) baseXp = 200;
  else baseXp = Math.min(300, 200 + Math.floor((durationMin - 30) * 3)); // Capped scaling

  // Attribute distribution: ~60% Focus, ~40% Emotional Resilience
  const focusXp = Math.round(baseXp * 0.6);
  const resilienceXp = Math.round(baseXp * 0.4);

  return {
    xpEarned: baseXp,
    isCompleted: true,
    focusXp,
    resilienceXp,
    durationMin,
  };
}
