import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Check, Wind, Heart, Moon, Shield, Sparkles, Clock, AlertTriangle, Award, X } from 'lucide-react';
import { playPhaseChime, playSessionEndBell, triggerHaptic } from '../services/breathingAudio';
import { calculateBreathingCompletionReward } from '../services/breathingRewardService';
import { useGame } from '../context/GameContext';
import { db } from '../db/database';
import { Card } from '../components/ui/Card';
import { BreathingVisual } from '../components/breathing/BreathingVisual';
import { BackButton } from '../components/ui/BackButton';
import { useBackHandler } from '../services/backButtonManager';

export type BreathingMode = 'box' | 'sigh' | '478' | 'resonance' | 'timer';

export interface BreathingModeDef {
  id: BreathingMode;
  name: string;
  tagline: string;
  recommendedFor: string;
  icon: React.ReactNode;
  phases: Array<{ name: string; durationSec: number; action: 'inhale' | 'hold' | 'exhale' }>;
}

const MODES: BreathingModeDef[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    tagline: 'Equal 4-phase rhythm for sharp focus & mental clarity.',
    recommendedFor: 'Focus, Calm, Performance',
    icon: <Wind className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />,
    phases: [
      { name: 'Inhale', durationSec: 4, action: 'inhale' },
      { name: 'Hold', durationSec: 4, action: 'hold' },
      { name: 'Exhale', durationSec: 4, action: 'exhale' },
      { name: 'Hold', durationSec: 4, action: 'hold' },
    ],
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    tagline: 'Two short inhales followed by one long slow exhale.',
    recommendedFor: 'Stress, Anxiety, Overwhelm',
    icon: <Heart className="w-4 h-4 text-[var(--forge-secondary,#06B6D4)]" />,
    phases: [
      { name: 'Inhale (Deep)', durationSec: 2, action: 'inhale' },
      { name: 'Inhale (Extra Top-up)', durationSec: 1.5, action: 'inhale' },
      { name: 'Exhale (Slow & Full)', durationSec: 6, action: 'exhale' },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Relaxing Breath',
    tagline: 'Deep tranquilizing breathwork to settle the nervous system.',
    recommendedFor: 'Before Sleep & Deep Rest',
    icon: <Moon className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />,
    phases: [
      { name: 'Inhale', durationSec: 4, action: 'inhale' },
      { name: 'Hold', durationSec: 7, action: 'hold' },
      { name: 'Exhale', durationSec: 8, action: 'exhale' },
    ],
  },
  {
    id: 'resonance',
    name: 'Resonance (5-5)',
    tagline: '6 breaths per minute for heart rate variability coherence.',
    recommendedFor: 'General Relaxation & Recovery',
    icon: <Sparkles className="w-4 h-4 text-[var(--forge-secondary,#10B981)]" />,
    phases: [
      { name: 'Inhale', durationSec: 5, action: 'inhale' },
      { name: 'Exhale', durationSec: 5, action: 'exhale' },
    ],
  },
  {
    id: 'timer',
    name: 'Mindfulness Meditation',
    tagline: 'Silent meditation timer with gentle start & end bell.',
    recommendedFor: 'Silent Meditation & Presence',
    icon: <Shield className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />,
    phases: [
      { name: 'Meditate', durationSec: 60, action: 'hold' },
    ],
  },
];

const DURATIONS = [1, 3, 5, 10, 15, 20, 30, 60, -1]; // -1 for Infinite

export type SessionState = 'idle' | 'preparing' | 'active' | 'paused' | 'completed' | 'abandoned';

interface BreathingScreenProps {
  onBack?: () => void;
  onSessionActiveChange?: (isActive: boolean) => void;
}

export const BreathingScreen: React.FC<BreathingScreenProps> = ({ onBack, onSessionActiveChange }) => {
  const { grantXpToPlayerAndStats } = useGame();

  // Mode & Option selections
  const [selectedMode, setSelectedMode] = useState<BreathingMode>('box');
  const [selectedDurationMin, setSelectedDurationMin] = useState<number>(5); // Default 5 minutes
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Authoritative Session State
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);

  // Derive active session state
  const isSessionActive = sessionState !== 'idle';

  // Inform shell of session active status to lock viewport and hide bottom nav during active breathwork
  useEffect(() => {
    onSessionActiveChange?.(isSessionActive);
  }, [isSessionActive, onSessionActiveChange]);

  useEffect(() => {
    return () => {
      onSessionActiveChange?.(false);
    };
  }, [onSessionActiveChange]);

  // 5-Second Preparation Countdown State
  const [prepCountdown, setPrepCountdown] = useState<number>(5);

  // Active Timer counters
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(4);
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState<number>(0);

  // Completion & Abandonment UI states
  const [isAnimatingCompletion, setIsAnimatingCompletion] = useState<boolean>(false);
  const [earnedReward, setEarnedReward] = useState<{ xpEarned: number; focusXp: number; resilienceXp: number; durationMin: number } | null>(null);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState<boolean>(false);
  const [abandonBanner, setAbandonBanner] = useState<string | null>(null);

  // Detect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Screen Wake Lock Effect during Active/Paused Breathing Session
  useEffect(() => {
    const isActiveSession = sessionState === 'active' || sessionState === 'paused';

    if (!isActiveSession || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const requestWakeLock = async () => {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
      }
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (!isSubscribed) {
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) {
            wakeLockRef.current = null;
          }
        });
      } catch {
        wakeLockRef.current = null;
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else {
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(() => {});
          wakeLockRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [sessionState]);

  const currentModeDef = MODES.find((m) => m.id === selectedMode) || MODES[0];
  const currentPhase = currentModeDef.phases[currentPhaseIndex % currentModeDef.phases.length];
  const targetTotalSeconds = selectedDurationMin === -1 ? Infinity : selectedDurationMin * 60;

  // Format MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: User presses "START SESSION" -> Enters 'preparing' state (5s countdown)
  const handleStartSession = () => {
    const newSessionId = `breathing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newSessionId);
    setSessionState('preparing');
    setPrepCountdown(5);
    setRewardClaimed(false);
    setEarnedReward(null);
    setAbandonBanner(null);

    setCurrentPhaseIndex(0);
    setPhaseSecondsLeft(currentModeDef.phases[0].durationSec);
    setTotalSecondsElapsed(0);

    triggerHaptic([30, 30]);
  };

  // Cancel Preparation Countdown (Return to Setup, 0 XP, NOT abandoned)
  const handleCancelPreparation = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    setSessionState('idle');
    setPrepCountdown(5);
  };

  // 5-Second Countdown Effect during 'preparing' state
  useEffect(() => {
    if (sessionState === 'preparing') {
      prepTimerRef.current = setInterval(() => {
        setPrepCountdown((prev) => {
          if (prev <= 1) {
            // Countdown finished! Transition to ACTIVE session
            if (prepTimerRef.current) clearInterval(prepTimerRef.current);
            setSessionState('active');

            if (!isAudioMuted) {
              playPhaseChime(528, 1.2, 0.2);
            }
            triggerHaptic([40, 50, 40]);
            return 0;
          }

          // Haptic pulse for 4, 3, 2, 1
          triggerHaptic([25]);
          if (!isAudioMuted) {
            playPhaseChime(440, 0.3, 0.08);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    }

    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [sessionState, isAudioMuted]);

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    if (sessionState === 'active') {
      setSessionState('paused');
      triggerHaptic([20]);
    } else if (sessionState === 'paused') {
      setSessionState('active');
      triggerHaptic([30]);
    }
  };

  // Authoritative Completion Handler
  const handleCompleteSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rewardClaimed || sessionState === 'completed') return;

    setRewardClaimed(true);
    setSessionState('completed');
    setIsAnimatingCompletion(true);

    const reward = calculateBreathingCompletionReward({
      durationSec: totalSecondsElapsed,
      selectedDurationMin,
      modeId: selectedMode,
      isCompleted: true,
    });

    setEarnedReward(reward);

    // Audio & Haptic confirmation
    if (!isAudioMuted) {
      playSessionEndBell();
    }
    triggerHaptic([20, 30, 30]);

    // Grant Authoritative XP to Player, Focus/Resilience Stats, and Meditation Skill
    try {
      if (reward.xpEarned > 0) {
        await grantXpToPlayerAndStats({
          generalXp: reward.xpEarned,
          attributes: {
            focus: reward.focusXp,
            emotional_resilience: reward.resilienceXp,
          },
          skillId: 'meditation',
          title: `Completed ${reward.durationMin}-Min ${currentModeDef.name}`,
          category: 'breathing',
        });
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // Log in Recovery Logs
      await db.recoveryLogs.add({
        activityId: selectedMode,
        activityTitle: currentModeDef.name,
        category: 'mental',
        date: todayStr,
        durationMins: reward.durationMin,
        xpEarned: reward.xpEarned,
        completedAt: new Date().toISOString(),
      });

      // Log in Chronicle
      await db.chronicle.add({
        title: `Completed ${reward.durationMin}-Min ${currentModeDef.name}`,
        subtitle: 'Mindfulness & diaphragmatic breathwork practice.',
        category: 'milestone',
        date: todayStr,
        icon: 'Wind',
        xpReward: reward.xpEarned,
        details: `Restored baseline focus and built emotional resilience. Earned ${reward.xpEarned} XP.`,
      });

      // Update Meditation skill progression
      const medSkill = await db.skills.get('meditation');
      if (medSkill) {
        await db.skills.update('meditation', {
          todayProgressCount: (medSkill.todayProgressCount || 0) + 1,
          weeklyProgressCount: (medSkill.weeklyProgressCount || 0) + 1,
        });
      }
    } catch (err) {
      console.error('Failed to grant breathing completion rewards:', err);
    }

    // After completion animation delay (1.4s), finish animating completion
    setTimeout(() => {
      setIsAnimatingCompletion(false);
    }, 1400);
  };

  // Request Quit during Active Session
  const handleRequestQuit = () => {
    setIsQuitModalOpen(true);
  };

  // Confirm Abandonment (0 XP)
  const handleConfirmAbandon = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsQuitModalOpen(false);
    setAbandonBanner(null);
    setSessionState('abandoned');
    triggerHaptic([50]);
  };

  // Explicit Continue from Abandoned Session (Return to Setup, 0 XP)
  const handleContinueAbandoned = () => {
    setAbandonBanner(null);
    setSessionState('idle');
  };

  // Back Button Intercept
  const handleBackClick = () => {
    if (sessionState === 'completed' || sessionState === 'abandoned') {
      return; // Must use CONTINUE button on the result screens
    }
    if (sessionState === 'active' || sessionState === 'paused') {
      setIsQuitModalOpen(true);
    } else if (sessionState === 'preparing') {
      handleCancelPreparation();
    } else if (onBack) {
      onBack();
    }
  };

  // Android Hardware Back button handling for Guided Breathing
  // 1. If quit modal is open, close it (Priority 90)
  useBackHandler(
    'breathing-quit-modal',
    90,
    () => {
      setIsQuitModalOpen(false);
      return true;
    },
    isQuitModalOpen
  );

  // 2. Active session, preparing, or idle navigation to Forge (Priority 45)
  useBackHandler(
    'breathing-screen',
    45,
    () => {
      if (sessionState === 'completed' || sessionState === 'abandoned') {
        return true; // Consume event, don't dismiss completion or abandoned screen
      }
      handleBackClick();
      return true;
    },
    true
  );

  // Active Session Timer Tick Loop
  useEffect(() => {
    if (sessionState === 'active') {
      timerRef.current = setInterval(() => {
        setTotalSecondsElapsed((prev) => {
          const nextTotal = prev + 1;
          if (targetTotalSeconds !== Infinity && nextTotal >= targetTotalSeconds) {
            handleCompleteSession();
            return nextTotal;
          }
          return nextTotal;
        });

        setPhaseSecondsLeft((prev) => {
          if (prev <= 1) {
            // Advance to next phase
            const nextPhaseIdx = (currentPhaseIndex + 1) % currentModeDef.phases.length;
            const nextPhase = currentModeDef.phases[nextPhaseIdx];
            setCurrentPhaseIndex(nextPhaseIdx);

            if (!isAudioMuted) {
              const freq = nextPhase.action === 'inhale' ? 528 : nextPhase.action === 'exhale' ? 396 : 432;
              playPhaseChime(freq, 0.6, 0.12);
            }
            triggerHaptic([30, 40]);

            return nextPhase.durationSec;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState, currentPhaseIndex, selectedMode, targetTotalSeconds, isAudioMuted, rewardClaimed]);

  return (
    <div
      id="breathing-screen"
      className={`w-full flex flex-col relative ${
        isSessionActive
          ? 'flex-1 h-full min-h-0 overflow-hidden select-none touch-none overscroll-none'
          : 'space-y-6 pb-12'
      }`}
    >
      {/* 1. TOP NAVIGATION: Shared Header Alignment with App Shell */}
      <div className="flex items-center justify-between gap-3 w-full shrink-0">
        {onBack && (
          <BackButton
            onClick={handleBackClick}
            label="Forge"
            sublabel="Breath"
            id="breathing-back-btn"
          />
        )}

        <div className="flex items-center gap-2">
          {isSessionActive && (
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[var(--forge-text-accent,#D4AF37)] px-2.5 py-1 rounded-full bg-[var(--forge-primary-muted,rgba(212,175,55,0.1))] border border-[var(--forge-border-accent,rgba(212,175,55,0.3))]">
              {sessionState === 'preparing' ? 'Get Ready' : currentModeDef.name}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="p-2 min-h-[44px] min-w-[44px] bg-[var(--forge-surface-interactive,#121620)] hover:bg-[var(--forge-surface-elevated,#182030)] border border-[var(--forge-border,#222C3E)] hover:border-[var(--forge-border-accent,rgba(212,175,55,0.5))] rounded-lg text-[var(--forge-text-secondary,#8E9299)] hover:text-[var(--forge-text-accent,#D4AF37)] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title={isAudioMuted ? 'Unmute Bell Chimes' : 'Mute Bell Chimes'}
            aria-label={isAudioMuted ? 'Unmute Bell Chimes' : 'Mute Bell Chimes'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />}
          </button>
        </div>
      </div>

      {/* Abandonment Banner */}
      <AnimatePresence>
        {abandonBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs text-center font-mono uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 my-1"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{abandonBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. STAGE CONTAINER: Short intentional transition (200ms) between Selection and Session */}
      <AnimatePresence mode="wait">
        {isSessionActive ? (
          /* ACTIVE / PREPARING / COMPLETED SESSION VIEW - Strictly Fixed & Centered Below Header */
          <motion.div
            key="active-breathing-session"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden py-1 sm:py-2 select-none"
          >
            {sessionState === 'completed' ? (
              /* DEDICATED SESSION FINISHED SCREEN (Same visual language as Quest Session Finished) */
              <motion.div
                key="breathing-session-finished"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm sm:max-w-md mx-auto my-auto px-2"
              >
                <Card className="p-6 sm:p-8 border border-[var(--forge-border-accent)] bg-[var(--forge-surface)] text-center relative overflow-hidden shadow-xl space-y-6 rounded-2xl">
                  {/* Visual Identity Checkmark Badge */}
                  <div className="w-12 h-12 mx-auto rounded-full bg-[var(--forge-surface-subtle)] border border-[var(--forge-border-accent)] flex items-center justify-center">
                    <Check className="w-6 h-6 text-[var(--forge-text-accent)] stroke-[2.5]" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[var(--forge-text-accent)]">
                      SESSION FINISHED
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] leading-tight">
                      {currentModeDef.name}
                    </h2>
                    {earnedReward && earnedReward.durationMin > 0 && (
                      <p className="text-xs font-mono text-[var(--forge-text-secondary)]">
                        {earnedReward.durationMin} Min Completed
                      </p>
                    )}
                  </div>

                  {/* Primary Reward: +XP */}
                  <div className="py-4 px-6 rounded-2xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] max-w-xs mx-auto space-y-1.5">
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[var(--forge-text-accent)] tracking-tight">
                      +{earnedReward?.xpEarned || 0} XP
                    </div>
                    {earnedReward && (earnedReward.focusXp > 0 || earnedReward.resilienceXp > 0) && (
                      <div className="text-xs font-mono text-[var(--forge-text-secondary)] border-t border-[var(--forge-border)] pt-1.5 flex items-center justify-center gap-3">
                        {earnedReward.focusXp > 0 && <span>Focus +{earnedReward.focusXp}</span>}
                        {earnedReward.resilienceXp > 0 && <span>Resilience +{earnedReward.resilienceXp}</span>}
                      </div>
                    )}
                  </div>

                  {/* Sole Action: CONTINUE */}
                  <button
                    type="button"
                    id="breathing-continue-btn"
                    onClick={() => setSessionState('idle')}
                    className="w-full py-4 bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] text-sm font-bold tracking-wider uppercase rounded-xl shadow-md cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>CONTINUE</span>
                  </button>
                </Card>
              </motion.div>
            ) : sessionState === 'abandoned' ? (
              /* DEDICATED SESSION ENDED SCREEN (Zero XP, No rewards, Persistent until Continue) */
              <motion.div
                key="breathing-session-abandoned"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm sm:max-w-md mx-auto my-auto px-2"
              >
                <Card className="p-6 sm:p-8 border border-[var(--forge-border)] bg-[var(--forge-surface)] text-center relative overflow-hidden shadow-xl space-y-6 rounded-2xl">
                  {/* Restrained Alert/Warning Icon Badge */}
                  <div className="w-12 h-12 mx-auto rounded-full bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-500/90 stroke-[2]" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[var(--forge-text-secondary)]">
                      SESSION ENDED
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] leading-tight">
                      {currentModeDef.name}
                    </h2>
                    <p className="text-xs font-mono text-[var(--forge-text-secondary)]">
                      Elapsed: {formatTime(totalSecondsElapsed)}
                    </p>
                  </div>

                  {/* Zero XP Metric & Subtitle */}
                  <div className="py-4 px-6 rounded-2xl bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] max-w-xs mx-auto space-y-1.5">
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[var(--forge-text-secondary)] tracking-tight">
                      0 XP
                    </div>
                    <p className="text-xs font-mono text-[var(--forge-text-secondary)] opacity-80">
                      Session ended before completion.
                    </p>
                  </div>

                  {/* Sole Action: CONTINUE */}
                  <button
                    type="button"
                    id="breathing-abandon-continue-btn"
                    onClick={handleContinueAbandoned}
                    className="w-full py-4 bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] text-sm font-bold tracking-wider uppercase rounded-xl shadow-md cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>CONTINUE</span>
                  </button>
                </Card>
              </motion.div>
            ) : sessionState === 'preparing' ? (
              /* PREPARATION COUNTDOWN STAGE (5s COUNTDOWN) */
              <div className="w-full flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-6 max-w-sm mx-auto min-h-0 text-center">
                <div className="text-center space-y-1 shrink-0">
                  <span className="text-xs uppercase font-sans font-bold tracking-wider text-[var(--forge-gold)] bg-[var(--forge-surface-subtle)] px-3 py-1 rounded-full border border-[var(--forge-border)]">
                    Prepare • {currentModeDef.name}
                  </span>
                  <h2 className="font-sans text-base sm:text-lg font-bold text-[var(--forge-text-primary)] tracking-wide mt-2">
                    Settle Your Posture & Focus
                  </h2>
                </div>

                {/* Large Animated Countdown Circle */}
                <div className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 my-1 shrink-0">
                  {/* Soft Ambient Ring */}
                  <div className={`absolute inset-0 rounded-full border border-[var(--forge-border)] ${prefersReducedMotion ? '' : 'animate-pulse'}`} />

                  <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-[var(--forge-surface)] border-2 border-[var(--forge-gold)] flex flex-col items-center justify-center shadow-md relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={prepCountdown}
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.65 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1.1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.4 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="flex flex-col items-center text-center"
                      >
                        <span className="font-sans text-4xl sm:text-5xl font-black text-[var(--forge-gold)] tracking-tight">
                          {prepCountdown > 0 ? prepCountdown : 'BREATHE'}
                        </span>
                        <span className="text-xs uppercase font-sans tracking-wider text-[var(--forge-text-secondary)] mt-1 font-medium">
                          Get Ready
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Cancel Preparation Option */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelPreparation}
                    className="px-4 py-2 bg-[var(--forge-surface-interactive,#141414)] border border-[var(--forge-border,#262626)] hover:border-red-800/50 rounded-xl text-xs text-[var(--forge-text-secondary,#8E9299)] hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Preparation</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE / PAUSED STAGE */
              <div className="w-full flex-1 flex flex-col items-center justify-center space-y-3 sm:space-y-4 max-w-sm mx-auto min-h-0">
                {/* Geometric Nested Polygon Arch Breathing Visual (Video Reference Target) */}
                <div className="relative w-full flex items-center justify-center shrink-0">
                  <BreathingVisual
                    phaseAction={currentPhase.action}
                    phaseName={currentPhase.name}
                    phaseDurationSec={currentPhase.durationSec}
                    phaseSecondsLeft={phaseSecondsLeft}
                    totalSecondsElapsed={totalSecondsElapsed}
                    isPaused={sessionState === 'paused'}
                    isCompleted={false}
                    isTimerMode={selectedMode === 'timer'}
                    prefersReducedMotion={prefersReducedMotion}
                  />

                  {/* Floating XP Reward Burst on Completion */}
                  <AnimatePresence>
                    {isAnimatingCompletion && earnedReward && earnedReward.xpEarned > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: -45, scale: 1.15 }}
                        exit={{ opacity: 0, y: -60 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="absolute z-20 top-2 px-4 py-1.5 rounded-full bg-[var(--forge-surface-elevated,#141414)] border border-[var(--forge-border-accent,#D4AF37)] text-[var(--forge-text-accent,#D4AF37)] font-mono font-bold text-sm shadow-[0_0_20px_var(--forge-primary-glow,rgba(212,175,55,0.4))] flex items-center gap-1.5"
                      >
                        <Award className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />
                        <span>+{earnedReward.xpEarned} XP</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Progress Bar & Elapsed Time */}
                <div className="w-full max-w-xs space-y-1 text-center shrink-0 px-2">
                  <div className="flex justify-between text-[10px] text-[var(--forge-text-secondary,#8E9299)] font-mono">
                    <span>Elapsed: {formatTime(totalSecondsElapsed)}</span>
                    <span>
                      {selectedDurationMin === -1
                        ? 'Infinite Session'
                        : `Target: ${selectedDurationMin}m (${formatTime(Math.max(0, targetTotalSeconds - totalSecondsElapsed))} left)`}
                    </span>
                  </div>
                  {targetTotalSeconds !== Infinity && (
                    <div className="w-full bg-[var(--forge-progress-track,#1A1A1A)] h-1.5 rounded-full overflow-hidden border border-[var(--forge-border,#262626)]">
                      <div
                        className="bg-[var(--forge-primary,#D4AF37)] h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (totalSecondsElapsed / targetTotalSeconds) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="p-3.5 bg-[var(--forge-surface-interactive,#121212)] border border-[var(--forge-border-strong,#262626)] rounded-full text-white hover:border-[var(--forge-primary,#D4AF37)] transition-all cursor-pointer shadow-lg"
                    title={sessionState === 'paused' ? 'Resume Session' : 'Pause Session'}
                    aria-label={sessionState === 'paused' ? 'Resume Session' : 'Pause Session'}
                  >
                    {sessionState === 'paused' ? (
                      <Play className="w-5 h-5 text-[var(--forge-text-accent,#D4AF37)]" />
                    ) : (
                      <Pause className="w-5 h-5 text-amber-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestQuit}
                    className="px-5 py-2.5 bg-red-950/40 border border-red-800/40 rounded-full text-red-300 text-xs font-bold uppercase tracking-wider hover:bg-red-900/50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>End Session</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* SETUP / TYPE SELECTION STAGE */
          <motion.div
            key="breathing-selection-setup-stage"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 pt-1"
          >
            {/* Header Banner */}
            <div className="p-4 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-[var(--forge-gold)] font-bold px-2 py-0.5 bg-[var(--forge-surface-subtle)] border border-[var(--forge-border)] rounded-md">
                  Mindfulness & Calm
                </span>
              </div>
              <h1 className="font-sans text-xl font-bold tracking-tight text-[var(--forge-text-primary)] mt-2 flex items-center gap-2">
                <Wind className="w-5 h-5 text-[var(--forge-gold)]" />
                Guided Breathing
              </h1>
              <p className="text-xs text-[var(--forge-text-secondary)] mt-1.5 leading-relaxed">
                Return to the present moment. Calming the nervous system restores sustainable focus.
              </p>
            </div>

            {/* Mode Selector */}
            <div data-system-guide="breathing-modes" className="space-y-3">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-[var(--forge-gold)] block">
                1. Select Breathing Method
              </span>

              <div className="grid grid-cols-1 gap-2.5">
                {MODES.map((mode) => {
                  const isSelected = selectedMode === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                        isSelected
                          ? 'bg-[var(--forge-surface-elevated,#0E120A)] border-[var(--forge-primary,#D4AF37)] shadow-[0_0_12px_var(--forge-primary-glow)]'
                          : 'bg-[var(--forge-surface,#0A0A0A)] border-[var(--forge-border,#1A1A1A)] hover:border-[var(--forge-border-strong,#333)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg border ${isSelected ? 'bg-[var(--forge-primary-muted,rgba(212,175,55,0.2))] border-[var(--forge-primary,#D4AF37)]' : 'bg-[var(--forge-surface-interactive,#141414)] border-[var(--forge-border,#222)]'}`}>
                          {mode.icon}
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${isSelected ? 'text-[var(--forge-text-accent,#D4AF37)]' : 'text-[var(--forge-text-primary,#E4E3E0)]'}`}>
                            {mode.name}
                          </h3>
                          <p className="text-xs text-[var(--forge-text-secondary,#8E9299)] mt-0.5">{mode.tagline}</p>
                          <span className="inline-block text-[9px] uppercase font-mono text-[var(--forge-text-accent,#D4AF37)]/80 mt-1 bg-[var(--forge-primary-muted)] px-2 py-0.5 rounded border border-[var(--forge-border-accent)]">
                            Recommended: {mode.recommendedFor}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)] shrink-0 mt-1" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Duration Selector */}
            <div data-system-guide="breathing-duration" className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--forge-text-accent,#D4AF37)] block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                2. Select Duration
              </span>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {DURATIONS.map((dur) => {
                  const isSelected = selectedDurationMin === dur;
                  const label = dur === -1 ? '∞ Infinite' : `${dur} min`;
                  return (
                    <button
                      key={dur}
                      onClick={() => setSelectedDurationMin(dur)}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] border-[var(--forge-border-accent,#D4AF37)] shadow-[0_0_10px_var(--forge-primary-glow,rgba(212,175,55,0.3))]'
                          : 'bg-[var(--forge-surface,#0A0A0A)] border-[var(--forge-border,#1A1A1A)] text-[var(--forge-text-secondary,#8E9299)] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Session CTA */}
            <button
              data-system-guide="breathing-start-btn"
              onClick={handleStartSession}
              className="w-full py-3.5 bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] font-bold uppercase tracking-[0.2em] text-xs rounded-xl shadow-[0_0_20px_var(--forge-primary-glow,rgba(212,175,55,0.3))] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Session • {currentModeDef.name} ({selectedDurationMin === -1 ? 'Infinite' : `${selectedDurationMin}m`})</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM QUIT / ABANDON MODAL */}
      <AnimatePresence>
        {isQuitModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full max-w-sm bg-[var(--forge-surface-elevated,#0A0A0A)] border border-[var(--forge-border-strong,#262626)] rounded-2xl p-6 space-y-5 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-[var(--forge-text-primary,#E4E3E0)] uppercase tracking-wide">
                  End Session?
                </h3>
                <p className="text-xs text-[var(--forge-text-secondary,#8E9299)] mt-2">
                  You've been breathing for <span className="font-mono font-bold text-white">{formatTime(totalSecondsElapsed)}</span>.
                </p>
                <p className="text-xs text-red-300/80 mt-1.5 p-2 bg-red-950/20 border border-red-900/30 rounded-lg">
                  If you leave now, this session will be abandoned and you will receive <span className="font-bold">0 XP</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setIsQuitModalOpen(false)}
                  className="py-2.5 px-3 bg-[var(--forge-surface-interactive,#141414)] border border-[var(--forge-border,#222)] text-[var(--forge-text-primary,#E4E3E0)] hover:border-[var(--forge-primary,#D4AF37)] rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Continue
                </button>
                <button
                  onClick={handleConfirmAbandon}
                  className="py-2.5 px-3 bg-red-950/60 border border-red-800/50 text-red-200 hover:bg-red-900/80 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
