import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Sparkles,
  Lock,
  ChevronRight,
  Layers,
  Search,
  CheckCircle2,
  Award,
  BookOpen,
  Palette,
  Cpu,
  Shield,
  Compass,
  Flame,
  MessageSquare,
  Crown,
  PenTool,
  Utensils,
  Coins,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Skill } from '../types';
import { getSkillXpNextLevel } from '../services/xpService';
import { getSkillRankConfig, getSkillRankTitle } from '../services/masteryService';
import { SkillTreeModal } from '../components/skills/SkillTreeModal';
import { LifeBuildsModal } from '../components/builds/LifeBuildsModal';

const ICON_MAP: Record<string, React.ReactNode> = {
  Palette: <Palette className="w-5 h-5 text-[#F472B6]" />,
  Cpu: <Cpu className="w-5 h-5 text-[#38BDF8]" />,
  BookOpen: <BookOpen className="w-5 h-5 text-[#A78BFA]" />,
  Shield: <Shield className="w-5 h-5 text-[#FBBF24]" />,
  Compass: <Compass className="w-5 h-5 text-[#34D399]" />,
  Flame: <Flame className="w-5 h-5 text-[#F97316]" />,
  MessageSquare: <MessageSquare className="w-5 h-5 text-[#60A5FA]" />,
  Crown: <Crown className="w-5 h-5 text-[#F59E0B]" />,
  Sparkles: <Sparkles className="w-5 h-5 text-[#D4AF37]" />,
  Layers: <Layers className="w-5 h-5 text-[#E879F9]" />,
  PenTool: <PenTool className="w-5 h-5 text-[#38BDF8]" />,
  Utensils: <Utensils className="w-5 h-5 text-[#34D399]" />,
  Coins: <Coins className="w-5 h-5 text-[#FBBF24]" />,
};

export const SkillsScreen: React.FC = () => {
  const { skills, activeBuilds, unlockSkill } = useGame();

  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isBuildsModalOpen, setIsBuildsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  const unlockedSkills = skills.filter((s) => s.unlocked);
  const lockedSkills = skills.filter((s) => !s.unlocked);

  const categories = ['all', ...Array.from(new Set(skills.map((s) => s.category)))];

  const filteredUnlocked = unlockedSkills.filter((skill) => {
    const matchesQuery = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategoryFilter === 'all' || skill.category === activeCategoryFilter;
    return matchesQuery && matchesCategory;
  });

  const totalMilestonesCompleted = skills.reduce(
    (acc, s) => acc + s.milestones.filter((m) => m.completed).length,
    0
  );

  const handleOpenSkillTree = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsTreeModalOpen(true);
  };

  return (
    <div id="skills-screen" className="pb-28 px-4 pt-6 max-w-md mx-auto sm:max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[var(--forge-text-accent)]" />
            <h1 className="text-xl font-bold text-[var(--forge-text-primary)] tracking-wide">Skills & Skill Trees</h1>
          </div>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
            Master real-world abilities through visual progression trees
          </p>
        </div>

        <button
          onClick={() => setIsBuildsModalOpen(true)}
          className="forge-button-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
          <span>Life Builds</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl mb-5 grid grid-cols-3 gap-2 text-center shadow-xs">
        <div>
          <div className="text-lg font-bold text-[var(--forge-text-primary)]">{unlockedSkills.length}</div>
          <div className="text-[10px] text-[var(--forge-text-secondary)] uppercase tracking-wider font-mono">Active Skills</div>
        </div>
        <div className="border-x border-[var(--forge-border)]">
          <div className="text-lg font-bold text-[var(--forge-text-accent)]">{totalMilestonesCompleted}</div>
          <div className="text-[10px] text-[var(--forge-text-secondary)] uppercase tracking-wider font-mono">Milestones</div>
        </div>
        <div>
          <div className="text-lg font-bold text-sky-500 dark:text-sky-400">{lockedSkills.length}</div>
          <div className="text-[10px] text-[var(--forge-text-secondary)] uppercase tracking-wider font-mono">Discovery Locked</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--forge-text-muted)] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search active skills or milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl text-xs text-[var(--forge-text-primary)] placeholder-[var(--forge-text-muted)] focus:outline-none focus:border-[var(--forge-border-accent)]"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategoryFilter === cat
                  ? 'bg-[var(--forge-primary)] text-[var(--forge-primary-contrast)] shadow-xs'
                  : 'bg-[var(--forge-surface)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border border-[var(--forge-border)]'
              }`}
            >
              {cat === 'all' ? 'All Skills' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Active Skills List */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold tracking-widest text-[var(--forge-text-accent)] font-mono">
            Active Mastered Skills ({filteredUnlocked.length})
          </h2>
        </div>

        {filteredUnlocked.length === 0 ? (
          <div className="p-8 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl text-center text-xs text-[var(--forge-text-muted)]">
            No skills match your search query.
          </div>
        ) : (
          filteredUnlocked.map((skill) => {
            const nextLevelXp = getSkillXpNextLevel(skill.level);
            const xpPercent = Math.min(100, Math.round((skill.currentXp / nextLevelXp) * 100));
            const completedCount = skill.milestones.filter((m) => m.completed).length;

            return (
              <motion.div
                key={skill.id}
                whileHover={{ y: -2 }}
                onClick={() => handleOpenSkillTree(skill)}
                className="p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] rounded-2xl transition-all cursor-pointer space-y-3 shadow-xs"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl">
                      {ICON_MAP[skill.iconName] || <Sparkles className="w-5 h-5 text-[var(--forge-text-accent)]" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-[var(--forge-text-primary)]">{skill.name}</h3>
                        {(() => {
                          const rankConfig = getSkillRankConfig(skill.level);
                          return (
                            <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-full flex items-center space-x-1 border ${rankConfig.badgeBg} ${rankConfig.textColor} ${rankConfig.borderColor}`}>
                              <Award className="w-3 h-3" />
                              <span>{rankConfig.title}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">{skill.category}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--forge-text-primary)]">Lvl {skill.level}</span>
                    <div className="text-[10px] text-[var(--forge-text-muted)] mt-0.5 font-mono">
                      {completedCount}/{skill.milestones.length} Nodes
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-[var(--forge-text-secondary)] mb-1 font-mono">
                    <span>XP Progress</span>
                    <span>{skill.currentXp} / {nextLevelXp} XP</span>
                  </div>
                  <div className="w-full bg-[var(--forge-surface-interactive)] h-2 rounded-full overflow-hidden border border-[var(--forge-border)]">
                    <div
                      className="bg-[var(--forge-primary)] h-full transition-all duration-300"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>

                {/* Next Milestone & Action */}
                <div className="pt-2 border-t border-[var(--forge-border)] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-[var(--forge-text-secondary)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                    <span>Next: <strong className="text-[var(--forge-text-primary)] font-semibold">{skill.nextMilestoneTitle}</strong></span>
                  </div>

                  <div className="flex items-center space-x-1 text-[var(--forge-text-accent)] font-semibold hover:translate-x-0.5 transition-transform">
                    <span>Skill Tree</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Discovery / Locked Skills Section */}
      {lockedSkills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-bold tracking-widest text-sky-500 dark:text-sky-400 font-mono">
              Unlocking Next (Discovery Skills)
            </h2>
          </div>

          <div className="space-y-3">
            {lockedSkills.map((lockedSkill) => {
              const req = lockedSkill.discoveryRequirement;
              const reqPercent = req
                ? Math.min(100, Math.round((req.currentCount / req.targetCount) * 100))
                : 0;

              return (
                <div
                  key={lockedSkill.id}
                  className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl text-[var(--forge-text-muted)]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--forge-text-primary)]">{lockedSkill.name}</h3>
                        <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">{lockedSkill.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => unlockSkill(lockedSkill.id)}
                      className="forge-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Unlock Now
                    </button>
                  </div>

                  {req && (
                    <div className="bg-[var(--forge-surface-interactive)] p-3 rounded-lg border border-[var(--forge-border)]">
                      <div className="flex items-center justify-between text-[11px] text-[var(--forge-text-secondary)] mb-1 font-mono">
                        <span>Unlock Requirement: {req.description}</span>
                        <span className="font-bold text-sky-500 dark:text-sky-400">{req.currentCount} / {req.targetCount}</span>
                      </div>
                      <div className="w-full bg-[var(--forge-surface)] h-1.5 rounded-full overflow-hidden border border-[var(--forge-border)]">
                        <div
                          className="bg-sky-500 dark:bg-sky-400 h-full transition-all duration-300"
                          style={{ width: `${reqPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <SkillTreeModal
        skill={selectedSkill}
        isOpen={isTreeModalOpen}
        onClose={() => setIsTreeModalOpen(false)}
      />

      <LifeBuildsModal
        isOpen={isBuildsModalOpen}
        onClose={() => setIsBuildsModalOpen(false)}
      />
    </div>
  );
};
