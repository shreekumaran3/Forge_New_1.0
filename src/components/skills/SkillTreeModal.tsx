import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Check,
  Lock,
  Sparkles,
  ChevronDown,
  Award,
  Activity,
  ShieldCheck,
  Zap,
  Gauge,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { Skill, SkillMilestone } from '../../types';
import { getSkillXpNextLevel } from '../../services/xpService';
import { calculateSkillAPE, getSkillRoadmap } from '../../services/apeEngine';
import { useBackHandler } from '../../services/backButtonManager';

interface SkillTreeModalProps {
  skill: Skill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({ skill, isOpen, onClose }) => {
  const { toggleSkillMilestone, player, skills } = useGame();
  const [activeTab, setActiveTab] = useState<'tree' | 'ape' | 'roadmap'>('tree');
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  useBackHandler(
    'skill-tree-legacy-modal',
    100,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  // Body scroll lock with clean restoration
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !skill) return null;

  // Single Source of Truth: Always derive active skill from live GameContext skills
  const activeSkill = (skills ? skills.find((s) => s.id === skill.id) : null) || skill;

  const nextLevelXp = getSkillXpNextLevel(activeSkill.level);
  const remainingSkillXp = Math.max(0, nextLevelXp - activeSkill.currentXp);
  const xpPercent = Math.min(100, Math.round((activeSkill.currentXp / nextLevelXp) * 100));

  // Compute APE metrics and Roadmap
  const ape = calculateSkillAPE(activeSkill);
  const roadmap = getSkillRoadmap(activeSkill);

  // Group milestones by tier
  const tiers: Record<number, SkillMilestone[]> = {};
  activeSkill.milestones.forEach((m) => {
    if (!tiers[m.tier]) tiers[m.tier] = [];
    tiers[m.tier].push(m);
  });

  const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
  const completedCount = activeSkill.milestones.filter((m) => m.completed).length;

  const handleNodeClick = async (node: SkillMilestone, isEligible: boolean) => {
    if (pendingNodeId) return;

    // If completed, allow resetting/refunding
    if (node.completed) {
      setPendingNodeId(node.id);
      try {
        await toggleSkillMilestone(activeSkill.id, node.id);
      } catch (err) {
        console.error('Error resetting milestone:', err);
      } finally {
        setPendingNodeId(null);
      }
      return;
    }

    // If not completed, must strictly meet dual requirements
    if (!isEligible) return;

    setPendingNodeId(node.id);
    try {
      await toggleSkillMilestone(activeSkill.id, node.id);
    } catch (err) {
      console.error('Error toggling milestone:', err);
    } finally {
      setPendingNodeId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#070707] border border-[#242424] rounded-2xl shadow-2xl overflow-hidden text-left"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#141414] border border-[#2B2B2B] rounded-xl text-[#D4AF37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-lg font-bold text-[#E4E3E0] font-serif">{activeSkill.name}</h2>
                <span className="px-2 py-0.5 text-xs uppercase font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 rounded">
                  Level {activeSkill.level} • {activeSkill.rank}
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5 font-mono">
                {activeSkill.currentXp}/{nextLevelXp} Skill XP • Stage {ape.currentStage}: {ape.stageName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-5 py-2 bg-[#0A0A0A] border-b border-[#1A1A1A] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tree'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-[#8E9299] hover:text-white bg-[#121212]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Milestone Tree</span>
            </button>
            <button
              onClick={() => setActiveTab('ape')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ape'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-[#8E9299] hover:text-white bg-[#121212]'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>APE Engine</span>
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'roadmap'
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-[#8E9299] hover:text-white bg-[#121212]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>7-Stage Roadmap</span>
            </button>
          </div>
          <span className="text-[#8E9299] text-xs font-mono hidden sm:inline">
            Mastered: <strong className="text-[#D4AF37]">{completedCount}/{activeSkill.milestones.length}</strong>
          </span>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#050505] relative">
          {/* 1. MILESTONE TREE (Actionable Unlocks) */}
          {activeTab === 'tree' && (
            <div className="space-y-6">
              {tierKeys.map((tierNum, tierIndex) => (
                <div key={tierNum} className="space-y-3">
                  {/* Tier Label */}
                  <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-1.5">
                    <span className="text-xs uppercase font-bold tracking-wider text-[#D4AF37] font-serif">
                      Tier {tierNum}
                    </span>
                    <span className="text-xs text-[#737373] font-mono">
                      {tiers[tierNum].filter((m) => m.completed).length}/{tiers[tierNum].length} Mastered
                    </span>
                  </div>

                  {/* Nodes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {tiers[tierNum].map((node) => {
                      const isPending = pendingNodeId === node.id;
                      const reqLevel = node.requiredSkillLevel || Math.max(1, node.tier);

                      // Prerequisite check
                      const prereq = node.prerequisiteId
                        ? activeSkill.milestones.find((m) => m.id === node.prerequisiteId)
                        : null;
                      const prereqMet = !node.prerequisiteId || Boolean(prereq?.completed);

                      // Skill Level / Skill XP threshold
                      const levelMet = activeSkill.level >= reqLevel;

                      // Eligibility
                      const isReadyToUnlock = !node.completed && levelMet && prereqMet;
                      const isLockedLevel = !node.completed && !levelMet;
                      const isLockedPrereq = !node.completed && !prereqMet;

                      return (
                        <div
                          key={node.id}
                          className={`p-3.5 rounded-xl border transition-all relative text-left flex flex-col justify-between ${
                            isPending
                              ? 'bg-[#121212] border-[#D4AF37] opacity-80 animate-pulse'
                              : node.completed
                              ? 'bg-[#10130A] border-[#D4AF37]/80 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                              : isReadyToUnlock
                              ? 'bg-[#141208] border-[#D4AF37] hover:border-amber-400 shadow-[0_0_8px_rgba(212,175,55,0.15)]'
                              : 'bg-[#080808] border-[#161616] opacity-60'
                          }`}
                        >
                          {/* Node Header */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                                    node.completed
                                      ? 'bg-[#D4AF37] text-black'
                                      : isReadyToUnlock
                                      ? 'bg-amber-400 text-black'
                                      : 'bg-[#181818] text-[#555]'
                                  }`}
                                >
                                  {node.completed ? (
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  ) : isReadyToUnlock ? (
                                    <Zap className="w-3.5 h-3.5 fill-black" />
                                  ) : (
                                    <Lock className="w-3 h-3" />
                                  )}
                                </div>
                                <h4
                                  className={`text-sm font-bold font-serif ${
                                    node.completed
                                      ? 'text-[#D4AF37]'
                                      : isReadyToUnlock
                                      ? 'text-white'
                                      : 'text-[#888]'
                                  }`}
                                >
                                  {node.title}
                                </h4>
                              </div>
                            </div>

                            {node.description && (
                              <p className="text-xs text-[#8E9299] mt-1 line-clamp-2">
                                {node.description}
                              </p>
                            )}
                          </div>

                          {/* Action / Status Row */}
                          <div className="mt-3 pt-2 border-t border-[#181818] flex items-center justify-between text-xs">
                            {node.completed ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  MASTERED
                                </span>
                              </div>
                            ) : isReadyToUnlock ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-emerald-400 font-bold font-mono">
                                  Lvl {reqLevel} ✓
                                </span>
                                <button
                                  onClick={() => handleNodeClick(node, true)}
                                  className="px-2.5 py-1 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold font-mono rounded text-xs cursor-pointer shadow-sm"
                                >
                                  Unlock Milestone
                                </button>
                              </div>
                            ) : isLockedLevel ? (
                              <div className="flex items-center justify-between w-full text-rose-400/80">
                                <span>Requires Lvl {reqLevel}</span>
                                <span className="font-mono">{remainingSkillXp} XP to go</span>
                              </div>
                            ) : isLockedPrereq ? (
                              <div className="w-full text-amber-500/80 text-xs">
                                Requires prerequisite "{prereq?.title || 'Milestone'}"
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {tierIndex < tierKeys.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="p-0.5 rounded-full bg-[#121212] border border-[#222] text-[#666]">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 2. APE ENGINE (Calculates/feeds skill progression) */}
          {activeTab === 'ape' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#090C12] border border-cyan-900/40 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Adaptive Progression Engine (APE)
                  </span>
                  <span className="text-xs text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Calculates real-time training workload, consistency decay resilience, and stage gating.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Skill XP */}
                <div className="p-3.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E4E3E0] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Skill XP (Current / Lifetime)
                    </span>
                    <span className="font-mono text-[#D4AF37] font-bold">
                      {activeSkill.currentXp} / {activeSkill.lifetimeXp || activeSkill.currentXp}
                    </span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#D4AF37] h-full" style={{ width: `${xpPercent}%` }} />
                  </div>
                </div>

                {/* Consistency */}
                <div className="p-3.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E4E3E0] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Consistency
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{ape.consistency}%</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${ape.consistency}%` }} />
                  </div>
                </div>

                {/* Mastery */}
                <div className="p-3.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E4E3E0] flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      Mastery
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{ape.mastery}%</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: `${ape.mastery}%` }} />
                  </div>
                </div>

                {/* Capacity */}
                <div className="p-3.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E4E3E0] flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      Capacity
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">{ape.capacity} / 100</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full" style={{ width: `${ape.capacity}%` }} />
                  </div>
                </div>

                {/* Confidence */}
                <div className="p-3.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#E4E3E0] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Confidence & Comfort
                    </span>
                    <span className="font-mono text-purple-400 font-bold">{ape.confidence}%</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${ape.confidence}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. 7-STAGE ROADMAP (Long-term Mastery Journey) */}
          {activeTab === 'roadmap' && (
            <div className="space-y-3">
              <p className="text-xs text-[#8E9299]">
                7-stage long-term progression path. Mastery gates are unlocked by achieving concrete milestone thresholds.
              </p>

              <div className="space-y-2.5">
                {roadmap.map((stage) => {
                  const isCurrent = stage.stageNumber === ape.currentStage;
                  const isUnlocked = stage.stageNumber <= ape.currentStage;

                  return (
                    <div
                      key={stage.stageNumber}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-[#10130A] border-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.12)]'
                          : isUnlocked
                          ? 'bg-[#0A0A0A] border-[#1C1C1C]'
                          : 'bg-[#050505] border-[#141414] opacity-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold border shrink-0 ${
                              isCurrent
                                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                                : isUnlocked
                                ? 'bg-[#1A1A1A] text-[#D4AF37] border-[#333]'
                                : 'bg-[#121212] text-[#555] border-[#222]'
                            }`}
                          >
                            {stage.stageNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-bold font-serif ${isCurrent ? 'text-[#D4AF37]' : isUnlocked ? 'text-white' : 'text-[#777]'}`}>
                                Stage {stage.stageNumber}: {stage.title}
                              </h4>
                              {isCurrent && (
                                <span className="text-xs uppercase font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/40">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#8E9299] mt-0.5">{stage.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#181818] flex items-center justify-between text-xs">
                        <span className="text-[#8E9299]">
                          Mastery Gate: <span className="text-[#E4E3E0] font-semibold">{stage.masteryGateRequirement}</span>
                        </span>
                        <span className={`font-semibold ${isUnlocked ? 'text-emerald-400' : 'text-[#555]'}`}>
                          {isUnlocked ? 'Unlocked ✓' : 'Locked Gate'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
          <span className="text-xs text-[#8E9299] font-mono">
            {activeSkill.name} • Level {activeSkill.level}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
