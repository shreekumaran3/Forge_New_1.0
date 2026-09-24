import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import {
  WorkoutTemplate,
  WorkoutExerciseCompleted,
  WorkoutSetCompleted,
  ActiveWorkoutSession,
} from '../../types';
import { getExerciseById } from '../../data/exerciseLibrary';
import { getPreviousExerciseLog, calculateNextTarget, TargetCalculationResult, calculateWorkoutCompletionReward } from '../../services/workoutProgression';
import { RestTimerOverlay } from './RestTimerOverlay';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Pause,
  Play,
  X,
  Info,
  Award,
  TrendingUp,
  FastForward,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface FullScreenWorkoutModeProps {
  session: ActiveWorkoutSession;
  onUpdateSession: (updatedSession: ActiveWorkoutSession) => void;
  onFinishWorkout: (completedSession: ActiveWorkoutSession) => void;
  onAbandonWorkout: () => void;
}

export const FullScreenWorkoutMode: React.FC<FullScreenWorkoutModeProps> = ({
  session,
  onUpdateSession,
  onFinishWorkout,
  onAbandonWorkout,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [previousLog, setPreviousLog] = useState<WorkoutExerciseCompleted | null>(null);
  const [progressionTarget, setProgressionTarget] = useState<TargetCalculationResult | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const currentExercise = session.exercises[session.currentExerciseIndex];
  const exDef = currentExercise ? getExerciseById(currentExercise.exerciseId) : undefined;

  // Local timer state to prevent triggering heavy parent re-renders every 1 second
  const [localElapsedSec, setLocalElapsedSec] = useState(session.elapsedSec);
  const [localRestSec, setLocalRestSec] = useState<number | null>(session.restTimerSec);

  const localElapsedRef = useRef(localElapsedSec);
  localElapsedRef.current = localElapsedSec;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Sync when session prop changes from outside
  useEffect(() => {
    setLocalElapsedSec(session.elapsedSec);
  }, [session.elapsedSec]);

  useEffect(() => {
    setLocalRestSec(session.restTimerSec);
  }, [session.restTimerSec]);

  // Stopwatch for overall workout duration (local 1s tick)
  useEffect(() => {
    if (session.isPaused) return;
    const interval = setInterval(() => {
      setLocalElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session.isPaused]);

  // Countdown timer for Rest Overlay (local 1s tick)
  useEffect(() => {
    if (!session.isResting || localRestSec === null || session.isPaused) return;

    if (localRestSec <= 0) {
      // Rest finished -> Sync to parent session state
      onUpdateSession({
        ...sessionRef.current,
        elapsedSec: localElapsedRef.current,
        isResting: false,
        restTimerSec: null,
      });
      return;
    }

    const interval = setInterval(() => {
      setLocalRestSec((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.isResting, session.isPaused, localRestSec, onUpdateSession]);

  // Fetch previous performance & compute progression target when exercise changes
  useEffect(() => {
    if (currentExercise) {
      getPreviousExerciseLog(currentExercise.name).then((res) => {
        const pLog = res ? res.log : null;
        setPreviousLog(pLog);
        const exTpl = session.template.exercises.find((e) => e.name.toLowerCase() === currentExercise.name.toLowerCase()) || {
          id: currentExercise.exerciseId,
          name: currentExercise.name,
          targetSets: currentExercise.sets.length,
          targetWeightKg: currentExercise.sets[0]?.targetWeightKg || 0,
        };
        const target = calculateNextTarget(exTpl, pLog, res?.overallRpe);
        setProgressionTarget(target);
      });
    }
  }, [currentExercise?.name]);

  if (!currentExercise) return null;

  const formatElapsedTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle set completion and trigger rest timer
  const handleToggleSet = (setIndex: number) => {
    const updatedExercises = [...session.exercises];
    const targetSet = updatedExercises[session.currentExerciseIndex].sets[setIndex];
    const newCompleted = !targetSet.completed;
    targetSet.completed = newCompleted;

    let isResting = session.isResting;
    let restTimerSec = session.restTimerSec;
    let restTimerMaxSec = session.restTimerMaxSec;

    // Trigger rest timer if set just completed
    if (newCompleted) {
      const defaultRest = exDef?.defaultRestSec || 60;
      isResting = true;
      restTimerSec = defaultRest;
      restTimerMaxSec = defaultRest;
    }

    onUpdateSession({
      ...session,
      exercises: updatedExercises,
      currentSetIndex: setIndex,
      isResting,
      restTimerSec,
      restTimerMaxSec,
    });
  };

  // Update set metric (reps, weight, duration)
  const handleUpdateMetric = (
    setIndex: number,
    field: 'reps' | 'weightKg' | 'durationSec',
    value: number
  ) => {
    const updatedExercises = [...session.exercises];
    updatedExercises[session.currentExerciseIndex].sets[setIndex][field] = Math.max(0, value);
    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // Add extra set
  const handleAddSet = () => {
    const updatedExercises = [...session.exercises];
    const currentSets = updatedExercises[session.currentExerciseIndex].sets;
    const lastSet = currentSets[currentSets.length - 1];

    currentSets.push({
      setNumber: currentSets.length + 1,
      reps: lastSet?.reps || 10,
      weightKg: lastSet?.weightKg || 0,
      durationSec: lastSet?.durationSec || 0,
      completed: false,
    });

    onUpdateSession({
      ...session,
      exercises: updatedExercises,
    });
  };

  // Skip Rest
  const handleSkipRest = () => {
    onUpdateSession({
      ...session,
      isResting: false,
      restTimerSec: null,
    });
  };

  // Rest Timer adjustment
  const handleAdjustRest = (delta: number) => {
    if (session.restTimerSec === null) return;
    const newSec = Math.max(0, session.restTimerSec + delta);
    onUpdateSession({
      ...session,
      restTimerSec: newSec,
      restTimerMaxSec: Math.max(session.restTimerMaxSec || newSec, newSec),
    });
  };

  const handleNextExercise = () => {
    if (session.currentExerciseIndex < session.exercises.length - 1) {
      onUpdateSession({
        ...session,
        currentExerciseIndex: session.currentExerciseIndex + 1,
        currentSetIndex: 0,
        isResting: false,
        restTimerSec: null,
      });
    }
  };

  const handlePrevExercise = () => {
    if (session.currentExerciseIndex > 0) {
      onUpdateSession({
        ...session,
        currentExerciseIndex: session.currentExerciseIndex - 1,
        currentSetIndex: 0,
        isResting: false,
        restTimerSec: null,
      });
    }
  };

  const completedSetsCount = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSetsCount = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <div className="fixed inset-0 z-40 bg-[#080A0F] text-white flex flex-col overflow-hidden animate-fadeIn">
      
      {/* REST TIMER OVERLAY */}
      {session.isResting && session.restTimerSec !== null && (
        <RestTimerOverlay
          secondsRemaining={localRestSec ?? 0}
          maxSeconds={session.restTimerMaxSec || 60}
          isPaused={session.isPaused}
          nextExerciseName={
            session.currentSetIndex < currentExercise.sets.length - 1
              ? currentExercise.name
              : session.exercises[session.currentExerciseIndex + 1]?.name
          }
          nextSetNumber={
            session.currentSetIndex < currentExercise.sets.length - 1
              ? session.currentSetIndex + 2
              : 1
          }
          onAdjustSeconds={handleAdjustRest}
          onTogglePause={() => onUpdateSession({ ...session, isPaused: !session.isPaused })}
          onSkip={handleSkipRest}
        />
      )}

      {/* TOP HUD HEADER */}
      <div className="sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#1A202C] px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#D4AF37]">
            {session.template.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1 bg-[#121620] px-2 py-0.5 rounded border border-[#232A3B]">
              <Clock className="w-3 h-3 text-[#D4AF37]" />
              {formatElapsedTime(localElapsedSec)}
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Sets: {completedSetsCount}/{totalSetsCount}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onFinishWorkout(session)}
            variant="gold"
            size="sm"
            className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>FINISH</span>
          </Button>

          <button
            onClick={() => setShowAbandonConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="End Session"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PROGRESS BAR OVERALL */}
      <div className="w-full bg-[#121620] h-1">
        <div
          className="bg-[#D4AF37] h-full transition-all duration-300"
          style={{
            width: `${((session.currentExerciseIndex + 1) / session.exercises.length) * 100}%`,
          }}
        />
      </div>

      {/* MAIN WORKOUT STAGE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-5 custom-scrollbar pb-24">
        
        {/* CURRENT EXERCISE HEADER CARD */}
        <div className="bg-[#0D111A] border border-[#1E2536] rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30 uppercase">
                  Ex {session.currentExerciseIndex + 1} / {session.exercises.length}
                </span>
                {exDef?.category && (
                  <span className="text-[10px] font-mono text-gray-400 uppercase">
                    {exDef.category}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold font-serif text-white mt-1">
                {currentExercise.name}
              </h2>
            </div>

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
              title="Toggle Instructions"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Muscle / Equipment Badges */}
          {exDef && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {exDef.muscleGroups.map((m) => (
                <span key={m} className="text-[10px] bg-[#161C28] text-gray-300 px-2 py-0.5 rounded-full border border-[#232A3B]">
                  {m}
                </span>
              ))}
              {exDef.equipment.map((eq) => (
                <span key={eq} className="text-[10px] bg-[#161C28] text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/20 uppercase">
                  {eq.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Previous Performance Hint */}
          {previousLog && (
            <div className="bg-[#121722] border border-[#232A3B] p-2.5 rounded-xl text-xs text-gray-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <div>
                <span className="font-mono text-[10px] uppercase text-[#D4AF37] font-bold block">
                  Last Session History:
                </span>
                <span className="text-[11px] text-gray-300">
                  {previousLog.sets.map((s) => `${s.reps || s.durationSec || 0}${s.weightKg ? `x${s.weightKg}kg` : ''}`).join(' • ')}
                </span>
              </div>
            </div>
          )}

          {/* Progression Target Hint */}
          {progressionTarget?.hintNote && (
            <div className="bg-[#1A170A] border border-[#D4AF37]/40 p-2.5 rounded-xl text-xs text-[#D4AF37] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
              <div>
                <span className="font-mono text-[10px] uppercase font-bold block">
                  Progression Target:
                </span>
                <span className="text-[11px] text-gray-200">
                  {progressionTarget.hintNote}
                </span>
              </div>
            </div>
          )}

          {/* Instructions Drawer */}
          {showInstructions && exDef && (
            <div className="mt-3 p-3 bg-[#0A0C12] border border-[#232A3B] rounded-xl text-xs space-y-2 animate-fadeIn">
              <span className="font-mono font-bold text-[#D4AF37] uppercase text-[10px] block">
                Execution Guide:
              </span>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-[11px]">
                {exDef.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* SETS TRACKING TABLE */}
        <div className="bg-[#0D111A] border border-[#1E2536] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A202C]">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
              Set Log
            </span>
            <Button onClick={handleAddSet} variant="ghost" size="sm" className="text-[#D4AF37]">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Set
            </Button>
          </div>

          {/* Table Headers */}
          <div className="grid grid-cols-12 gap-2 text-[10px] font-mono text-gray-400 uppercase font-bold text-center border-b border-[#1A202C]/60 pb-2">
            <span className="col-span-2 text-left">SET</span>
            <span className="col-span-4">REPS / TIME</span>
            <span className="col-span-4">WEIGHT (KG)</span>
            <span className="col-span-2 text-right">DONE</span>
          </div>

          {/* Set Rows */}
          <div className="space-y-2">
            {currentExercise.sets.map((set, setIdx) => {
              const isTimed = exDef?.defaultUnit === 'seconds' || set.durationSec !== undefined;

              return (
                <div
                  key={setIdx}
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl transition-colors ${
                    set.completed
                      ? 'bg-[#122216] border border-emerald-500/30'
                      : 'bg-[#121620] border border-[#1F2533]'
                  }`}
                >
                  {/* Set Index */}
                  <div className="col-span-2 text-left font-mono font-bold text-xs text-gray-300 flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-[#1C2333] text-center leading-5 text-[11px]">
                      {set.setNumber}
                    </span>
                  </div>

                  {/* Reps / Time Input */}
                  <div className="col-span-4 flex items-center justify-center">
                    {isTimed ? (
                      <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg px-2 py-1">
                        <input
                          type="number"
                          value={set.durationSec || 0}
                          onChange={(e) =>
                            handleUpdateMetric(setIdx, 'durationSec', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                        />
                        <span className="text-[10px] font-mono text-gray-500">sec</span>
                      </div>
                    ) : (
                      <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg px-2 py-1">
                        <input
                          type="number"
                          value={set.reps || 0}
                          onChange={(e) =>
                            handleUpdateMetric(setIdx, 'reps', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                        />
                        <span className="text-[10px] font-mono text-gray-500">reps</span>
                      </div>
                    )}
                  </div>

                  {/* Weight Input */}
                  <div className="col-span-4 flex items-center justify-center">
                    <div className="flex items-center bg-[#0B0E14] border border-[#232A3B] rounded-lg px-2 py-1">
                      <input
                        type="number"
                        value={set.weightKg || 0}
                        onChange={(e) =>
                          handleUpdateMetric(setIdx, 'weightKg', parseFloat(e.target.value) || 0)
                        }
                        className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                      />
                      <span className="text-[10px] font-mono text-gray-500">kg</span>
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleToggleSet(setIdx)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        set.completed
                          ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-105'
                          : 'bg-[#1A202C] text-gray-400 border border-[#2D3548] hover:border-[#D4AF37]'
                      }`}
                    >
                      <Check className={`w-5 h-5 ${set.completed ? 'stroke-[3]' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM EXERCISE SWITCHER BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0B0E14] border-t border-[#1A202C] p-3 px-4 flex items-center justify-between">
        <Button
          onClick={handlePrevExercise}
          disabled={session.currentExerciseIndex === 0}
          variant="ghost"
          size="sm"
          className="text-gray-300 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Prev
        </Button>

        <span className="text-xs font-mono font-bold text-[#D4AF37]">
          {session.currentExerciseIndex + 1} of {session.exercises.length}
        </span>

        <Button
          onClick={handleNextExercise}
          disabled={session.currentExerciseIndex === session.exercises.length - 1}
          variant="ghost"
          size="sm"
          className="text-gray-300 disabled:opacity-30"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* ABANDON / QUIT CONFIRMATION DIALOG */}
      {showAbandonConfirm && (() => {
        const rewardCalc = calculateWorkoutCompletionReward(session);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-[#0E121B] border border-[#232A3B] rounded-2xl p-5 space-y-4 text-center">
              <h3 className="text-base font-bold text-white font-serif">End Active Workout?</h3>
              
              <div className="bg-[#121620] border border-[#1E2536] p-3 rounded-xl space-y-1.5 text-left text-xs">
                <div className="flex justify-between text-gray-300 font-mono">
                  <span>Completed Workload:</span>
                  <span className="text-white font-bold">{completedSetsCount} / {totalSetsCount} sets</span>
                </div>
                <div className="flex justify-between text-gray-300 font-mono">
                  <span>Progress:</span>
                  <span className={rewardCalc.isMeaningfulEffort ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                    {Math.round(rewardCalc.completionRatio * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-300 font-mono pt-1 border-t border-[#1E2536]">
                  <span>Earned XP:</span>
                  <span className="text-[#D4AF37] font-bold">+{rewardCalc.xpAward} XP</span>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                {rewardCalc.isMeaningfulEffort
                  ? "Record the work you've completed and earn partial XP based on your progress."
                  : "Below minimum threshold for workout XP."}
              </p>

              <div className="space-y-2 pt-1">
                {rewardCalc.isMeaningfulEffort ? (
                  <Button
                    onClick={() => {
                      setShowAbandonConfirm(false);
                      onFinishWorkout(session);
                    }}
                    variant="gold"
                    size="sm"
                    className="w-full font-bold"
                  >
                    Save Completed Sets (+{rewardCalc.xpAward} XP)
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setShowAbandonConfirm(false);
                      onFinishWorkout(session);
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full text-amber-400 border border-amber-500/30 hover:bg-amber-500/10"
                  >
                    Record Log (0 XP)
                  </Button>
                )}

                <Button
                  onClick={() => {
                    setShowAbandonConfirm(false);
                    onAbandonWorkout();
                  }}
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:bg-red-500/10"
                >
                  Discard & Abandon (No XP)
                </Button>

                <Button
                  onClick={() => setShowAbandonConfirm(false)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-gray-400"
                >
                  Resume Session
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
