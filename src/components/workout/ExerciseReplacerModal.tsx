import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ExerciseDefinition, EquipmentType } from '../../types';
import { EXERCISE_LIBRARY, getExerciseAlternatives } from '../../data/exerciseLibrary';
import { RefreshCw, Check, Dumbbell, Shield, Sparkles } from 'lucide-react';

interface ExerciseReplacerModalProps {
  isOpen: boolean;
  currentExerciseName: string;
  currentExerciseId?: string;
  onClose: () => void;
  onSelectReplacement: (selected: ExerciseDefinition) => void;
}

export const ExerciseReplacerModal: React.FC<ExerciseReplacerModalProps> = ({
  isOpen,
  currentExerciseName,
  currentExerciseId,
  onClose,
  onSelectReplacement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const alternatives = currentExerciseId ? getExerciseAlternatives(currentExerciseId) : [];

  const filteredExercises = EXERCISE_LIBRARY.filter((ex) =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscleGroups.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Replace Exercise"
      subtitle={`Find an alternative for "${currentExerciseName}" using your home equipment.`}
    >
      <div className="space-[#4] space-y-4 text-left">
        {/* Recommended Alternatives */}
        {alternatives.length > 0 && !searchTerm && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-[#D4AF37] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Recommended Alternatives (Same Pattern / Muscle)
            </span>
            <div className="grid grid-cols-1 gap-2">
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => {
                    onSelectReplacement(alt);
                    onClose();
                  }}
                  className="p-3 rounded-lg border border-[#D4AF37]/30 bg-[#0E121B] hover:bg-[#161C2A] cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{alt.name}</h4>
                    <p className="text-[11px] text-gray-400">
                      {alt.category} • {alt.muscleGroups.join(', ')}
                    </p>
                  </div>
                  <Button variant="gold" size="sm">
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search All Library */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
            Search Exercise Library
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by exercise name, muscle group, category..."
            className="w-full px-3 py-2 text-xs bg-[#0D1017] border border-[#232A3B] rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => {
                onSelectReplacement(ex);
                onClose();
              }}
              className="p-2.5 rounded-lg border border-[#1A202C] bg-[#0A0D14] hover:bg-[#121722] cursor-pointer transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-gray-200">{ex.name}</p>
                <p className="text-[10px] text-gray-500">
                  {ex.category} • Equipment: {ex.equipment.join(', ')}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-[#D4AF37]">
                Choose
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
