import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { WorkoutTemplate, WorkoutExerciseTemplate, ExerciseDefinition } from '../../types';
import { EXERCISE_LIBRARY } from '../../data/exerciseLibrary';
import { Plus, Trash2, Edit3, Dumbbell } from 'lucide-react';

interface WorkoutEditorModalProps {
  isOpen: boolean;
  initialTemplate?: WorkoutTemplate | null;
  onClose: () => void;
  onSaveTemplate: (template: WorkoutTemplate) => void;
}

export const WorkoutEditorModal: React.FC<WorkoutEditorModalProps> = ({
  isOpen,
  initialTemplate,
  onClose,
  onSaveTemplate,
}) => {
  const [name, setName] = useState(initialTemplate?.name || '');
  const [category, setCategory] = useState(initialTemplate?.category || 'Custom Routine');
  const [trainingFocus, setTrainingFocus] = useState(initialTemplate?.trainingFocus || '');
  const [exercises, setExercises] = useState<WorkoutExerciseTemplate[]>(
    initialTemplate?.exercises || [
      {
        id: `ex_${Date.now()}`,
        exerciseId: 'push_ups',
        name: 'Push-Ups',
        targetSets: 3,
        targetReps: '10-15',
        restSec: 60,
      },
    ]
  );
  const [showAddPicker, setShowAddPicker] = useState(false);

  const handleAddExerciseFromLib = (exDef: ExerciseDefinition) => {
    setExercises([
      ...exercises,
      {
        id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        exerciseId: exDef.id,
        name: exDef.name,
        targetSets: 3,
        targetReps: exDef.recommendedRepRange || '10',
        targetDurationSec: exDef.recommendedDurationSec,
        restSec: exDef.defaultRestSec,
      },
    ]);
    setShowAddPicker(false);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleUpdateExerciseField = (
    index: number,
    field: keyof WorkoutExerciseTemplate,
    val: any
  ) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: val };
    setExercises(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || exercises.length === 0) return;

    onSaveTemplate({
      id: initialTemplate?.id,
      name: name.trim(),
      category: category.trim(),
      trainingFocus: trainingFocus.trim(),
      exercises,
      estimatedDurationMins: Math.max(15, exercises.length * 6),
      xpReward: 100 + exercises.length * 5,
      createdAt: initialTemplate?.createdAt || new Date().toISOString(),
      isCustom: true,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTemplate ? 'Edit Workout Template' : 'New Custom Routine'}
      subtitle="Design a training routine tailored to your home setup."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="text-xs font-mono uppercase text-gray-400">Routine Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Upper Body Hypertrophy"
            className="w-full mt-1 px-3 py-2 text-xs bg-[#0B0E14] border border-[#232A3B] rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Strength"
              className="w-full mt-1 px-3 py-2 text-xs bg-[#0B0E14] border border-[#232A3B] rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-gray-400">Training Focus</label>
            <input
              type="text"
              value={trainingFocus}
              onChange={(e) => setTrainingFocus(e.target.value)}
              placeholder="e.g. Chest & Triceps"
              className="w-full mt-1 px-3 py-2 text-xs bg-[#0B0E14] border border-[#232A3B] rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-gray-300 font-bold">
              Exercises ({exercises.length})
            </span>
            <Button
              type="button"
              onClick={() => setShowAddPicker(true)}
              variant="ghost"
              size="sm"
              className="text-[#D4AF37]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Exercise
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {exercises.map((ex, idx) => (
              <div
                key={`${ex.id}_${idx}`}
                className="p-3 bg-[#0B0E14] border border-[#1E2536] rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(idx)}
                      className="text-gray-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <label className="text-gray-400 block font-mono">Sets</label>
                    <input
                      type="number"
                      value={ex.targetSets}
                      onChange={(e) =>
                        handleUpdateExerciseField(idx, 'targetSets', parseInt(e.target.value, 10) || 1)
                      }
                      className="w-full mt-0.5 px-2 py-1 bg-[#121620] border border-[#262D3E] rounded text-white text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block font-mono">Reps / Time</label>
                    <input
                      type="text"
                      value={ex.targetReps || '10'}
                      onChange={(e) => handleUpdateExerciseField(idx, 'targetReps', e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 bg-[#121620] border border-[#262D3E] rounded text-white text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block font-mono">Weight (kg)</label>
                    <input
                      type="number"
                      value={ex.targetWeightKg || 0}
                      onChange={(e) =>
                        handleUpdateExerciseField(idx, 'targetWeightKg', parseFloat(e.target.value) || 0)
                      }
                      className="w-full mt-0.5 px-2 py-1 bg-[#121620] border border-[#262D3E] rounded text-white text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="gold" size="sm">
            Save Routine
          </Button>
        </div>
      </form>

      {/* Add Exercise Modal */}
      {showAddPicker && (
        <Modal
          isOpen={showAddPicker}
          onClose={() => setShowAddPicker(false)}
          title="Add Exercise to Routine"
        >
          <div className="max-h-64 overflow-y-auto space-y-2 text-left custom-scrollbar">
            {EXERCISE_LIBRARY.map((exDef) => (
              <div
                key={exDef.id}
                onClick={() => handleAddExerciseFromLib(exDef)}
                className="p-2.5 bg-[#0B0E14] border border-[#1E2536] hover:border-[#D4AF37] rounded-xl cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{exDef.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {exDef.category} • {exDef.muscleGroups.join(', ')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-[#D4AF37]">
                  + Add
                </Button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </Modal>
  );
};
