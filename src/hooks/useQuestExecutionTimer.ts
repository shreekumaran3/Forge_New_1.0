import { useState, useEffect, useRef } from 'react';
import { QuestExecution } from '../types';
import { calculateQuestReward, formatTimeDisplay } from '../services/questExecutionService';

export interface QuestTimerState {
  elapsedSeconds: number;
  remainingSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  extensionElapsedSeconds: number;
  urgency: 'normal' | 'warning' | 'critical' | 'complete';
  timeFormatted: string;
  extensionTimeFormatted: string;
  currentReward: {
    playerXP: number;
    skillXP: number;
    multiplier: number;
    extensionMinutes: number;
    decayPercent: number;
  };
}

export function useQuestExecutionTimer(
  execution: QuestExecution | null,
  onTimerZeroReached?: () => void
): QuestTimerState {
  const [now, setNow] = useState<number>(Date.now());
  const hasTriggeredZeroRef = useRef(false);

  // Reset zero-trigger ref when a new execution or status starts
  useEffect(() => {
    hasTriggeredZeroRef.current = false;
  }, [execution?.executionId, execution?.status]);

  useEffect(() => {
    if (!execution || execution.status === 'COMPLETED' || execution.status === 'CANCELLED') {
      return;
    }

    const intervalId = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);

      if (execution.status === 'ACTIVE') {
        const elapsed = Math.floor((currentNow - execution.startedAt) / 1000);
        if (elapsed >= execution.durationSeconds && !hasTriggeredZeroRef.current) {
          hasTriggeredZeroRef.current = true;
          if (onTimerZeroReached) {
            onTimerZeroReached();
          }
        }
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [execution, onTimerZeroReached]);

  if (!execution) {
    return {
      elapsedSeconds: 0,
      remainingSeconds: 0,
      durationSeconds: 0,
      progressPercent: 0,
      extensionElapsedSeconds: 0,
      urgency: 'normal',
      timeFormatted: '00:00',
      extensionTimeFormatted: '+00:00',
      currentReward: {
        playerXP: 0,
        skillXP: 0,
        multiplier: 1.0,
        extensionMinutes: 0,
        decayPercent: 0,
      },
    };
  }

  const durationSeconds = execution.durationSeconds || 900;
  const elapsedSeconds = Math.max(0, Math.floor((now - execution.startedAt) / 1000));
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / durationSeconds) * 100));

  let extensionElapsedSeconds = 0;
  if (execution.status === 'EXTENSION') {
    const extStart = execution.extensionStartedAt || (execution.startedAt + durationSeconds * 1000);
    extensionElapsedSeconds = Math.max(0, Math.floor((now - extStart) / 1000));
  }

  let urgency: 'normal' | 'warning' | 'critical' | 'complete' = 'normal';
  if (remainingSeconds === 0) {
    urgency = 'complete';
  } else if (remainingSeconds <= 60) {
    urgency = 'critical';
  } else if (remainingSeconds <= 300) {
    urgency = 'warning';
  }

  const currentReward = calculateQuestReward(
    execution.basePlayerXP,
    execution.baseSkillXP,
    extensionElapsedSeconds
  );

  return {
    elapsedSeconds,
    remainingSeconds,
    durationSeconds,
    progressPercent,
    extensionElapsedSeconds,
    urgency,
    timeFormatted: formatTimeDisplay(remainingSeconds),
    extensionTimeFormatted: `+${formatTimeDisplay(extensionElapsedSeconds)}`,
    currentReward,
  };
}
