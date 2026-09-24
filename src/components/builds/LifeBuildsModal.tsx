import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Hammer,
  Cpu,
  Compass,
  Palette,
  BookOpen,
  Shield,
  Crown,
  Globe,
  Sparkles,
  Check,
  Plus,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PRESET_BUILDS } from '../../data/buildsAndSkillsData';
import { BuildId, LifeBuild } from '../../types';
import { useBackHandler } from '../../services/backButtonManager';

interface LifeBuildsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Hammer: <Hammer className="w-5 h-5 text-[var(--forge-text-accent,#D4AF37)]" />,
  Cpu: <Cpu className="w-5 h-5 text-[#38BDF8]" />,
  Compass: <Compass className="w-5 h-5 text-[#34D399]" />,
  Palette: <Palette className="w-5 h-5 text-[#F472B6]" />,
  BookOpen: <BookOpen className="w-5 h-5 text-[#A78BFA]" />,
  Shield: <Shield className="w-5 h-5 text-[#FBBF24]" />,
  Crown: <Crown className="w-5 h-5 text-[#F59E0B]" />,
  Globe: <Globe className="w-5 h-5 text-[#60A5FA]" />,
};

export const LifeBuildsModal: React.FC<LifeBuildsModalProps> = ({ isOpen, onClose }) => {
  const { activeBuilds, updateActiveBuilds } = useGame();

  const [primaryId, setPrimaryId] = useState<BuildId>(activeBuilds?.primaryBuildId || 'builder');
  const [secondaryIds, setSecondaryIds] = useState<BuildId[]>(activeBuilds?.secondaryBuildIds || ['artist']);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom build fields
  const [customTitle, setCustomTitle] = useState('');
  const [customTagline, setCustomTagline] = useState('');
  const [customFocus, setCustomFocus] = useState('');
  const [customBuilds, setCustomBuilds] = useState<LifeBuild[]>([]);

  useBackHandler(
    'life-builds-modal',
    100,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const allBuilds = [...PRESET_BUILDS, ...customBuilds];

  const handleSelectPrimary = (id: BuildId) => {
    setPrimaryId(id);
    // Remove from secondary if it was there
    setSecondaryIds((prev) => prev.filter((sId) => sId !== id));
  };

  const handleToggleSecondary = (id: BuildId) => {
    if (id === primaryId) return; // Cannot be both primary and secondary
    if (secondaryIds.includes(id)) {
      setSecondaryIds((prev) => prev.filter((sId) => sId !== id));
    } else {
      if (secondaryIds.length >= 2) {
        // Replace oldest or cap at 2
        setSecondaryIds([secondaryIds[1], id]);
      } else {
        setSecondaryIds([...secondaryIds, id]);
      }
    }
  };

  const handleSaveBuilds = async () => {
    await updateActiveBuilds(primaryId, secondaryIds);
    onClose();
  };

  const handleCreateCustomBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newBuild: LifeBuild = {
      id: `custom_${Date.now()}`,
      title: customTitle,
      tagline: customTagline || 'Custom forged life path.',
      icon: 'Sparkles',
      focusAreas: customFocus ? customFocus.split(',').map((f) => f.trim()) : ['Discipline', 'Growth'],
      focusStats: ['discipline', 'focus', 'knowledge'],
      xpMultiplier: 1.15,
      recommendedSkillIds: ['drawing', 'reading'],
      dailyTemplates: [
        { title: `${customTitle} Main Habit`, category: 'main', pillarId: 'purpose', primaryStatId: 'focus', xpReward: 35, difficultyLevel: 1 },
      ],
      weeklyMissions: [],
      monthlyGoals: [],
      isCustom: true,
    };

    setCustomBuilds([...customBuilds, newBuild]);
    setPrimaryId(newBuild.id);
    setShowCustomForm(false);
    setCustomTitle('');
    setCustomTagline('');
    setCustomFocus('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[var(--forge-surface,#0A0A0A)] border border-[var(--forge-border,#262626)] rounded-xl shadow-2xl overflow-hidden text-[var(--forge-text-primary,#E4E3E0)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border,#1A1A1A)] bg-[var(--forge-bg,#050505)]">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-[var(--forge-text-accent,#D4AF37)]" />
              <h2 className="text-lg font-bold text-[var(--forge-text-primary,white)] tracking-wide font-serif">Select Life Builds</h2>
            </div>
            <p className="text-xs text-[var(--forge-text-secondary,#8E9299)] mt-0.5">
              1 Primary Build + Up to 2 Secondary Builds
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--forge-text-secondary,#8E9299)] hover:text-white hover:bg-[var(--forge-surface-interactive,#1A1A1A)] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Active Summary Banner */}
          <div className="p-3 bg-[var(--forge-bg-elevated,#121212)] border border-[var(--forge-border,#262626)] rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-[var(--forge-text-secondary,#8E9299)]">Primary: </span>
              <span className="font-bold text-[var(--forge-text-accent,#D4AF37)] uppercase tracking-wider">
                {allBuilds.find((b) => b.id === primaryId)?.title || primaryId}
              </span>
            </div>
            <div>
              <span className="text-[var(--forge-text-secondary,#8E9299)]">Secondary: </span>
              <span className="font-semibold text-[var(--forge-text-primary,white)]">
                {secondaryIds.map((sId) => allBuilds.find((b) => b.id === sId)?.title).join(', ') || 'None'}
              </span>
            </div>
          </div>

          {/* Builds Grid */}
          <div className="space-y-3">
            {allBuilds.map((build) => {
              const isPrimary = primaryId === build.id;
              const isSecondary = secondaryIds.includes(build.id);

              return (
                <div
                  key={build.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPrimary
                      ? 'bg-[var(--forge-primary-muted,rgba(212,175,55,0.1))] border-[var(--forge-border-accent,#D4AF37)] shadow-[0_0_15px_var(--forge-primary-glow)]'
                      : isSecondary
                      ? 'bg-[#0B151C] border-[#38BDF8]/60'
                      : 'bg-[var(--forge-bg-elevated,#0E0E0E)] border-[var(--forge-border,#1E1E1E)] hover:border-[var(--forge-border-accent)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-lg bg-[var(--forge-surface,#181818)] border border-[var(--forge-border,#262626)]">
                        {ICON_MAP[build.icon] || <Sparkles className="w-5 h-5 text-[var(--forge-text-accent,#D4AF37)]" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-[var(--forge-text-primary,white)] text-base">{build.title}</h3>
                          {isPrimary && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-[var(--forge-primary-muted,rgba(212,175,55,0.2))] text-[var(--forge-text-accent,#D4AF37)] border border-[var(--forge-border-accent,rgba(212,175,55,0.4))] rounded-full">
                              Primary Build
                            </span>
                          )}
                          {isSecondary && (
                            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 rounded-full">
                              Secondary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--forge-text-secondary,#9E9E9E)] mt-0.5">{build.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSelectPrimary(build.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isPrimary
                            ? 'bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] shadow-md'
                            : 'bg-[var(--forge-surface-interactive,#1F1F1F)] text-[var(--forge-text-primary,#E4E3E0)] hover:brightness-125'
                        }`}
                      >
                        {isPrimary ? 'Primary Active' : 'Set Primary'}
                      </button>

                      {!isPrimary && (
                        <button
                          onClick={() => handleToggleSecondary(build.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSecondary
                              ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50'
                              : 'bg-[var(--forge-surface,#181818)] text-[var(--forge-text-secondary,#8E9299)] hover:text-white hover:bg-[var(--forge-surface-interactive)]'
                          }`}
                        >
                          {isSecondary ? 'Remove Sec' : '+ Secondary'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Focus Chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {build.focusAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] bg-[var(--forge-surface,#161616)] text-[var(--forge-text-secondary,#A3A3A3)] border border-[var(--forge-border,#262626)] rounded-md"
                      >
                        {area}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 text-[10px] bg-[var(--forge-primary-muted,rgba(212,175,55,0.1))] text-[var(--forge-text-accent,#D4AF37)] border border-[var(--forge-border-accent,rgba(212,175,55,0.2))] rounded-md font-medium">
                      +15% XP Bonus
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Build Toggle */}
          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              className="w-full py-3 border border-dashed border-[var(--forge-border,#262626)] rounded-xl text-xs font-semibold text-[var(--forge-text-secondary,#8E9299)] hover:text-white hover:border-[var(--forge-border-accent)] transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[var(--forge-text-accent,#D4AF37)]" />
              <span>Create Custom Life Build</span>
            </button>
          ) : (
            <form onSubmit={handleCreateCustomBuild} className="p-4 bg-[var(--forge-bg-elevated,#121212)] border border-[var(--forge-border,#262626)] rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-[var(--forge-text-primary,white)] uppercase tracking-wider">Create Custom Build</h4>
              <div>
                <label className="text-[11px] text-[var(--forge-text-secondary,#8E9299)] block mb-1">Build Title</label>
                <input
                  type="text"
                  placeholder="e.g., Vanguard, Polymath, Nomad"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--forge-bg,#0A0A0A)] border border-[var(--forge-border,#262626)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--forge-border-accent,#D4AF37)]"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--forge-text-secondary,#8E9299)] block mb-1">Tagline</label>
                <input
                  type="text"
                  placeholder="e.g., Master of modern digital creation."
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--forge-bg,#0A0A0A)] border border-[var(--forge-border,#262626)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--forge-border-accent,#D4AF37)]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--forge-text-secondary,#8E9299)] block mb-1">Focus Areas (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g., Drawing, Writing, Fitness"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--forge-bg,#0A0A0A)] border border-[var(--forge-border,#262626)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--forge-border-accent,#D4AF37)]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="px-3 py-1.5 bg-[var(--forge-surface-interactive,#1C1C1C)] text-[var(--forge-text-secondary,#8E9299)] rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] rounded-lg text-xs font-bold cursor-pointer"
                >
                  Save Custom Build
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--forge-border,#1A1A1A)] bg-[var(--forge-bg,#050505)] flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--forge-surface-interactive,#1A1A1A)] text-[var(--forge-text-secondary,#8E9299)] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveBuilds}
            className="px-5 py-2 bg-[var(--forge-button-bg,#D4AF37)] text-[var(--forge-button-text,#050505)] font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md hover:brightness-110"
          >
            <Check className="w-4 h-4" />
            <span>Apply & Regenerate Quests</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
