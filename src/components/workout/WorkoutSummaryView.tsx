import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ActiveWorkoutSession, PersonalRecord } from '../../types';
import { Award, Check, Clock, Dumbbell, Flame, Sparkles, Trophy, Star, AlertCircle } from 'lucide-react';
import { calculatePotentialPRs, calculatePotentialMilestones, calculateWorkoutCompletionReward } from '../../services/workoutProgression';

interface WorkoutSummaryViewProps {
  session: ActiveWorkoutSession;
  onSaveAndExit: (overallRpe: number, notes: string) => void;
  onDiscard?: () => void;
}

export const WorkoutSummaryView: React.FC<WorkoutSummaryViewProps> = ({
  session,
  onSaveAndExit,
  onDiscard,
}) => {
  const [overallRpe, setOverallRpe] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');
  const [prsAchieved, setPrsAchieved] = useState<PersonalRecord[]>([]);
  const [milestonesUnlocked, setMilestonesUnlocked] = useState<Array<{ title: string; description: string }>>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const reward = calculateWorkoutCompletionReward(session);

  useEffect(() => {
    let isMounted = true;
    async function runChecks() {
      // Preview potential PRs without saving to DB
      const prs = reward.isMeaningfulEffort ? await calculatePotentialPRs(session) : [];
      // Preview potential milestones without saving to DB
      const milestones = reward.isMeaningfulEffort ? await calculatePotentialMilestones(session) : [];
      if (isMounted) {
        setPrsAchieved(prs);
        setMilestonesUnlocked(milestones);
      }
    }
    runChecks();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const totalRepsCount = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).reduce((sAcc, s) => sAcc + (s.reps || 0), 0),
    0
  );

  const durationMins = Math.max(1, Math.round(session.elapsedSec / 60));

  const handleSaveClick = () => {
    if (isSaving) return;
    setIsSaving(true);
    onSaveAndExit(overallRpe, notes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07090E] text-white flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md bg-[#0C0F17] border border-[#D4AF37]/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.2)] space-y-5 text-center">
        
        {/* Completion Header Banner */}
        <div className="space-y-2">
          {reward.completionState === 'completed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(212,175,55,0.3)] animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D4AF37]">
                WORKOUT COMPLETE (100% WORKLOAD)
              </span>
            </>
          )}

          {reward.completionState === 'partially_completed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Award className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                WORKOUT PARTIALLY COMPLETED
              </span>
            </>
          )}

          {reward.completionState === 'abandoned' && (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-800/50 border border-gray-600 text-gray-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                SESSION ABANDONED
              </span>
            </>
          )}

          <h2 className="text-2xl font-bold font-serif text-white">
            {session.template.name}
          </h2>
          <p className="text-xs text-gray-400">
            {reward.completionState === 'completed'
              ? session.template.trainingFocus || session.template.category
              : reward.completionState === 'partially_completed'
              ? 'Progress counts. Partial training work saved.'
              : 'Below minimum threshold for workout XP.'}
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="bg-[#111522] border border-[#1E2638] p-3 rounded-xl space-y-1.5 text-left">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300">Completion Progress</span>
            <span className={reward.completionState === 'completed' ? 'text-[#D4AF37] font-bold' : 'text-amber-400 font-bold'}>
              {reward.completedSetsCount} / {reward.totalPlannedSetsCount} sets ({Math.round(reward.completionRatio * 100)}%)
            </span>
          </div>
          <div className="w-full bg-[#1A202C] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                reward.completionState === 'completed'
                  ? 'bg-[#D4AF37]'
                  : reward.completionState === 'partially_completed'
                  ? 'bg-amber-400'
                  : 'bg-gray-600'
              }`}
              style={{ width: `${Math.round(reward.completionRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* PR Achievements Banner */}
        {prsAchieved.length > 0 && (
          <div className="bg-[#1A1608] border border-[#D4AF37]/60 p-3 rounded-xl text-left space-y-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] animate-pulse">
            <div className="flex items-center gap-2 text-[#D4AF37] font-mono font-bold text-xs uppercase">
              <Trophy className="w-4 h-4" />
              <span>NEW PERSONAL RECORD{prsAchieved.length > 1 ? 'S' : ''}!</span>
            </div>
            <div className="space-y-1">
              {prsAchieved.map((pr) => (
                <div key={pr.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-200">{pr.title}</span>
                  <span className="font-mono font-bold text-[#D4AF37]">{pr.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones Unlocked Banner */}
        {milestonesUnlocked.length > 0 && (
          <div className="bg-[#131B2E] border border-blue-500/50 p-3 rounded-xl text-left space-y-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <div className="flex items-center gap-2 text-blue-400 font-mono font-bold text-xs uppercase">
              <Star className="w-4 h-4" />
              <span>MILESTONE{milestonesUnlocked.length > 1 ? 'S' : ''} UNLOCKED!</span>
            </div>
            <div className="space-y-1">
              {milestonesUnlocked.map((m, idx) => (
                <div key={idx} className="text-xs">
                  <p className="font-bold text-white">{m.title}</p>
                  <p className="text-[11px] text-gray-400">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-[#111522] border border-[#1E2638] p-3 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#D4AF37]" /> Duration
            </span>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {durationMins} <span className="text-xs text-gray-400 font-normal">mins</span>
            </p>
          </div>

          <div className="bg-[#111522] border border-[#1E2638] p-3 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-[#D4AF37]" /> Sets Logged
            </span>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {reward.completedSetsCount} / {reward.totalPlannedSetsCount}
            </p>
          </div>

          <div className="bg-[#111522] border border-[#1E2638] p-3 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Total Reps
            </span>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {totalRepsCount} <span className="text-xs text-gray-400 font-normal">reps</span>
            </p>
          </div>

          <div className="bg-[#111522] border border-[#1E2638] p-3 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#D4AF37]" /> Earned XP
            </span>
            <p className="text-lg font-bold font-mono text-[#D4AF37] mt-1">
              +{reward.xpAward} XP
            </p>
          </div>
        </div>

        {/* Effort Rating Selector (RPE 1-10) */}
        <div className="space-y-2 text-left bg-[#111522] border border-[#1E2638] p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-gray-300">
              Session Effort Rating (RPE 1-10)
            </span>
            <span className="text-xs font-mono font-bold text-[#D4AF37]">
              RPE {overallRpe} / 10
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setOverallRpe(num)}
                className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
                  overallRpe === num
                    ? 'bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                    : 'bg-[#181E2B] text-gray-400 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Workout Notes */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-mono text-gray-400 uppercase">
            Workout Reflection & Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record feeling, pump, form notes, or progression reminders..."
            rows={2}
            className="w-full bg-[#111522] border border-[#1E2638] rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleSaveClick}
            disabled={isSaving}
            variant="gold"
            size="lg"
            className="w-full py-3.5 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.3)] disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              {isSaving
                ? 'SAVING RECORD...'
                : reward.completionState === 'completed'
                ? `CLAIM FULL XP (+${reward.xpAward} XP)`
                : reward.completionState === 'partially_completed'
                ? `SAVE COMPLETED SETS (+${reward.xpAward} XP)`
                : 'RECORD SESSION (0 XP)'}
            </span>
          </Button>

          {onDiscard && (
            <Button
              onClick={onDiscard}
              disabled={isSaving}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors py-2"
            >
              Discard Session (No XP or Records Saved)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
