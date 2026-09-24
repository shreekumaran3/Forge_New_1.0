import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { WorkoutTemplate, WorkoutExerciseTemplate, ExerciseDefinition } from '../../types';
import { ExerciseReplacerModal } from './ExerciseReplacerModal';
import { getExerciseById } from '../../data/exerciseLibrary';
import {
  Play,
  Clock,
  Dumbbell,
  Target,
  Flame,
  ChevronRight,
  Edit3,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

interface WorkoutOverviewModalProps {
  isOpen: boolean;
  template: WorkoutTemplate | null;
  onClose: () => void;
  onStartWorkout: (customizedTemplate: WorkoutTemplate) => void;
}

export const WorkoutOverviewModal: React.FC<WorkoutOverviewModalProps> = ({
  isOpen,
  template,
  onClose,
  onStartWorkout,
}) => {
  const [currentExercises, setCurrentExercises] = useState<WorkoutExerciseTemplate[]>([]);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // Sync state when template changes
  React.useEffect(() => {
    if (template) {
      setCurrentExercises([...template.exercises]);
    }
  }, [template]);

  if (!template) return null;

  const handleReplaceExercise = (index: number) => {
    setReplacingIndex(index);
  };

  const handleApplyReplacement = (newExDef: ExerciseDefinition) => {
    if (replacingIndex === null) return;
    const updated = [...currentExercises];
    const targetEx = updated[replacingIndex];

    updated[replacingIndex] = {
      ...targetEx,
      exerciseId: newExDef.id,
      name: newExDef.name,
      targetReps: newExDef.recommendedRepRange || targetEx.targetReps || '10',
      targetDurationSec: newExDef.recommendedDurationSec || targetEx.targetDurationSec,
      restSec: newExDef.defaultRestSec,
    };

    setCurrentExercises(updated);
    setReplacingIndex(null);
  };

  const handleRemoveExercise = (index: number) => {
    if (currentExercises.length <= 1) return;
    setCurrentExercises(currentExercises.filter((_, i) => i !== index));
  };

  const handleLaunchSession = () => {
    onStartWorkout({
      ...template,
      exercises: currentExercises,
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={template.name}
        subtitle={template.trainingFocus || template.category}
      >
        <div className="space-y-5 text-left">
          {/* Metadata Cards Header */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0B0E14] border border-[#1F2533] p-3 rounded-xl flex flex-col items-center justify-center text-center">
              <Clock className="w-4 h-4 text-[#D4AF37] mb-1" />
              <span className="text-[10px] uppercase font-mono text-gray-400">Duration</span>
              <span className="text-xs font-bold text-white mt-0.5">
                ~{template.estimatedDurationMins} min
              </span>
            </div>

            <div className="bg-[#0B0E14] border border-[#1F2533] p-3 rounded-xl flex flex-col items-center justify-center text-center">
              <Dumbbell className="w-4 h-4 text-[#D4AF37] mb-1" />
              <span className="text-[10px] uppercase font-mono text-gray-400">Exercises</span>
              <span className="text-xs font-bold text-white mt-0.5">
                {currentExercises.length} Movements
              </span>
            </div>

            <div className="bg-[#0B0E14] border border-[#1F2533] p-3 rounded-xl flex flex-col items-center justify-center text-center">
              <Flame className="w-4 h-4 text-[#D4AF37] mb-1" />
              <span className="text-[10px] uppercase font-mono text-gray-400">Reward</span>
              <span className="text-xs font-bold text-[#D4AF37] mt-0.5">
                +{template.xpReward} XP
              </span>
            </div>
          </div>

          {/* Exercise Lineup Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300">
                Exercise Lineup ({currentExercises.length})
              </span>
              <span className="text-[10px] text-gray-500">Tap ↺ to swap movement</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {currentExercises.map((ex, idx) => {
                const exDef = getExerciseById(ex.exerciseId);
                return (
                  <div
                    key={`${ex.id}_${idx}`}
                    className="p-3 bg-[#0B0E14] border border-[#1D2332] rounded-xl flex items-center justify-between hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1A202C] text-[#D4AF37] font-mono text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          {ex.targetSets} sets • {ex.targetReps ? `${ex.targetReps} reps` : `${ex.targetDurationSec || 60}s`}
                          {ex.targetWeightKg ? ` @ ${ex.targetWeightKg}kg` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReplaceExercise(idx)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#D4AF37] hover:bg-[#1A202C] transition-colors"
                        title="Swap Exercise"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      {currentExercises.length > 1 && (
                        <button
                          onClick={() => handleRemoveExercise(idx)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove Exercise"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DOMINANT START WORKOUT BUTTON */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={handleLaunchSession}
              variant="gold"
              size="lg"
              className="w-full py-4 text-base font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-[1.01] transition-transform"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START WORKOUT</span>
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Exercise Replacer Sub-Modal */}
      {replacingIndex !== null && (
        <ExerciseReplacerModal
          isOpen={replacingIndex !== null}
          currentExerciseName={currentExercises[replacingIndex]?.name || ''}
          currentExerciseId={currentExercises[replacingIndex]?.exerciseId}
          onClose={() => setReplacingIndex(null)}
          onSelectReplacement={handleApplyReplacement}
        />
      )}
    </>
  );
};
