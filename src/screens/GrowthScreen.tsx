import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { getSkillXpNextLevel, PILLARS_CONFIG, STATS_CONFIG } from '../services/xpService';
import { calculateUnifiedPillars } from '../services/pillarService';
import { getSkillRankInfo } from '../services/masteryService';
import { PRESET_BUILDS } from '../data/buildsAndSkillsData';
import { Skill, StatId } from '../types';
import { SkillTreeModal } from '../components/skills/SkillTreeModal';
import { LifeBuildsModal } from '../components/builds/LifeBuildsModal';
import { calculateSkillAPE } from '../services/apeEngine';
import {
  calculateMasteryBandsState,
  formatPracticeHours,
} from '../services/masteryBandService';
import { CategoryGrid, CategoryGridItem } from '../components/ui/CategoryGrid';
import { Zap, Sprout, Award, ChevronRight, Target, Shield, Compass, Sparkles, Layers, Lock, Cpu, Palette, BookOpen, Flame, Crown, ShieldCheck, Gauge } from 'lucide-react';

export const GrowthScreen: React.FC = () => {
  const { skills, stats, activeBuilds, player } = useGame();
  const destinies = useLiveQuery(() => db.destinies.toArray(), []) || [];
  const questLogs = useLiveQuery(() => db.questLogs.orderBy('completedAt').reverse().limit(100).toArray(), []) || [];

  const [activeTab, setActiveTab] = useState<'skills' | 'stats' | 'builds' | 'destinies' | 'pillars'>('skills');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isBuildsModalOpen, setIsBuildsModalOpen] = useState(false);

  const primaryBuild = PRESET_BUILDS.find((b) => b.id === activeBuilds?.primaryBuildId) || PRESET_BUILDS[0];

  const bandsOverview = React.useMemo(() => calculateMasteryBandsState(skills || []), [skills]);

  // Memoized APE calculation map to prevent recalculating on every render cycle
  const skillApeMap = React.useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateSkillAPE>> = {};
    for (const skill of skills) {
      map[skill.id] = calculateSkillAPE(skill, questLogs);
    }
    return map;
  }, [skills, questLogs]);

  const handleOpenSkillTree = (skill: Skill) => {
    setSelectedSkill(skill);
    setIsTreeModalOpen(true);
  };

  return (
    <div id="growth-screen" className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-[var(--forge-text-primary)] flex items-center gap-2">
            <Sprout className="w-5 h-5 text-[var(--forge-text-accent)]" />
            Growth Hub
          </h1>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
            Skills, Skill Trees, Mastery Paths, Life Builds, & Destinies
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-[var(--forge-surface)] border ${bandsOverview.highestBand.borderColor} rounded-xl shadow-xs ${bandsOverview.highestBand.textColor} font-mono text-xs font-bold`}>
          <Zap className="w-4 h-4 fill-current" />
          <span>BAND {bandsOverview.highestUnlockedBand} • {formatPracticeHours(bandsOverview.totalPracticeHours)}</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs Grid */}
      <CategoryGrid variant="primary" cols={5}>
        <CategoryGridItem
          id="skills"
          label="Skill Trees"
          icon={<Zap className="w-4 h-4 text-[var(--forge-text-accent)]" />}
          isActive={activeTab === 'skills'}
          onClick={() => setActiveTab('skills')}
        />
        <CategoryGridItem
          id="destinies"
          label="Destinies"
          icon={<Target className="w-4 h-4 text-amber-500" />}
          isActive={activeTab === 'destinies'}
          onClick={() => setActiveTab('destinies')}
        />
        <CategoryGridItem
          id="builds"
          label="Life Builds"
          icon={<Sparkles className="w-4 h-4 text-purple-400" />}
          isActive={activeTab === 'builds'}
          onClick={() => setActiveTab('builds')}
        />
        <CategoryGridItem
          id="stats"
          label="Primary Stats"
          icon={<Shield className="w-4 h-4 text-cyan-400" />}
          isActive={activeTab === 'stats'}
          onClick={() => setActiveTab('stats')}
        />
        <CategoryGridItem
          id="pillars"
          label="Five Pillars"
          icon={<Layers className="w-4 h-4 text-[var(--forge-text-accent)]" />}
          isActive={activeTab === 'pillars'}
          onClick={() => setActiveTab('pillars')}
        />
      </CategoryGrid>

      {/* SKILL TREES TAB */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--forge-text-secondary)] font-mono">
            <span>Active Real-World Skills ({skills.filter((s) => s.unlocked).length})</span>
            <span className="text-[var(--forge-text-accent)] font-semibold">Tap skill to open Visual Tree</span>
          </div>

          <div className="space-y-3">
            {skills.map((skill) => {
              const rankInfo = getSkillRankInfo(skill.level);
              const nextXp = getSkillXpNextLevel(skill.level);
              const completedNodes = skill.milestones.filter((m) => m.completed).length;

              const ape = skillApeMap[skill.id] || calculateSkillAPE(skill, questLogs);

              return (
                <Card
                  key={skill.id}
                  onClick={() => handleOpenSkillTree(skill)}
                  className={`p-4 border transition-all cursor-pointer hover:border-[var(--forge-border-accent)] ${
                    skill.unlocked ? 'bg-[var(--forge-surface)] border-[var(--forge-border)]' : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold font-serif text-[var(--forge-text-primary)]">{skill.name}</h3>
                        <span className="text-xs uppercase font-bold text-[var(--forge-text-accent)] px-2 py-0.5 bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] rounded">
                          {rankInfo.rank}
                        </span>
                        <span className="text-xs uppercase font-bold text-cyan-600 dark:text-cyan-400 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded">
                          Stage {ape.currentStage}: {ape.stageName}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1">{skill.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--forge-text-accent)] font-mono text-xs font-bold shrink-0">
                      <span>LVL {skill.level}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* APE 5 Values Metrics Row */}
                  <div className="mt-3 pt-2 border-t border-[var(--forge-border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1 text-[var(--forge-text-secondary)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Consistency: <strong className="text-emerald-600 dark:text-emerald-400">{ape.consistency}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--forge-text-secondary)]">
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Mastery: <strong className="text-amber-600 dark:text-amber-400">{ape.mastery}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--forge-text-secondary)]">
                      <Gauge className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>Capacity: <strong className="text-cyan-600 dark:text-cyan-400">{ape.capacity}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--forge-text-secondary)]">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>Confidence: <strong className="text-purple-600 dark:text-purple-400">{ape.confidence}%</strong></span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[var(--forge-text-secondary)] font-mono">
                      <span>Tree Milestones: {completedNodes}/{skill.milestones.length}</span>
                      <span>{skill.currentXp}/{nextXp} XP</span>
                    </div>
                    <ProgressBar value={skill.currentXp} max={nextXp} color="gold" size="sm" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* DESTINIES TAB */}
      {activeTab === 'destinies' && (
        <div className="space-y-4">
          <p className="text-xs text-[var(--forge-text-secondary)]">
            Destinies represent long-term life aspirations with no deadlines. Generated quests continuously contribute to active Destinies.
          </p>

          <div className="space-y-3">
            {destinies.map((dest) => (
              <Card key={dest.id} className="p-4 space-y-3 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-[var(--forge-text-accent)] px-2 py-0.5 bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] rounded">
                      {dest.pillarId}
                    </span>
                    <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)] mt-1">{dest.title}</h3>
                    <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">{dest.tagline}</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[var(--forge-text-accent)]">{dest.progress}%</span>
                </div>

                <ProgressBar value={dest.progress} max={100} color="gold" size="sm" />

                <div className="pt-2 border-t border-[var(--forge-border)] space-y-1">
                  <span className="text-xs uppercase font-bold text-[var(--forge-text-secondary)] tracking-wider block font-mono">Key Milestones</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[var(--forge-text-primary)]">
                    {dest.milestones.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded">
                        <Sparkles className="w-3 h-3 text-[var(--forge-text-accent)]" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LIFE BUILDS TAB */}
      {activeTab === 'builds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--forge-text-secondary)]">Configure your character's active builds</span>
            <button
              onClick={() => setIsBuildsModalOpen(true)}
              className="forge-button-primary px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Configure Builds
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {PRESET_BUILDS.map((build) => {
              const isPrimary = build.id === activeBuilds?.primaryBuildId;
              const isSecondary = activeBuilds?.secondaryBuildIds.includes(build.id);

              return (
                <Card
                  key={build.id}
                  className={`p-4 space-y-2 border bg-[var(--forge-surface)] shadow-xs ${
                    isPrimary
                      ? 'border-[var(--forge-border-accent)] ring-1 ring-[var(--forge-border-accent)]/50'
                      : isSecondary
                      ? 'border-cyan-500/50'
                      : 'border-[var(--forge-border)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-sm font-bold text-[var(--forge-text-primary)]">{build.title}</h3>
                    {isPrimary ? (
                      <span className="text-xs uppercase font-bold bg-[var(--forge-primary)] text-[var(--forge-primary-contrast)] px-2 py-0.5 rounded">
                        Primary (+15% XP)
                      </span>
                    ) : isSecondary ? (
                      <span className="text-xs uppercase font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">
                        Secondary
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--forge-text-secondary)]">{build.tagline}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* PRIMARY STATS TAB */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--forge-text-secondary)]">12 Core RPG Stats driving character capacity.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STATS_CONFIG.map((statDef) => {
              const pStat = stats.find((s) => s.statId === statDef.id) || { level: 1, currentXp: 0 };
              return (
                <Card key={statDef.id} className="p-3.5 space-y-2 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-[var(--forge-text-primary)]">{statDef.name}</span>
                    <span className="font-mono text-xs font-bold text-[var(--forge-text-accent)]">LVL {pStat.level}</span>
                  </div>
                  <ProgressBar value={pStat.currentXp % 100} max={100} color="blue" size="sm" />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* FIVE PILLARS TAB */}
      {activeTab === 'pillars' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl text-xs text-[var(--forge-text-secondary)] flex items-center justify-between shadow-xs">
            <span>The Five Pillars represent your life balance, automatically updated from Skill & Stat XP earned.</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase font-bold">AUTOMATIC UNIFIED REFLECTION</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {calculateUnifiedPillars(stats, skills).map((pillar) => {
              return (
                <Card key={pillar.id} className="p-4 space-y-3 bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-sm text-[var(--forge-text-primary)]">{pillar.name}</h3>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">{pillar.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-sm font-bold text-[var(--forge-text-accent)] block">
                        LVL {pillar.level}
                      </span>
                      <span className="text-xs text-[var(--forge-text-muted)] font-mono">
                        {pillar.totalXp} XP
                      </span>
                    </div>
                  </div>

                  <ProgressBar value={pillar.currentXp} max={pillar.nextLevelXp} color="gold" size="sm" />

                  {/* Active Skill Contributions */}
                  {pillar.contributingSkills.length > 0 && (
                    <div className="pt-2 border-t border-[var(--forge-border)]">
                      <span className="text-xs uppercase font-bold tracking-wider text-[var(--forge-text-secondary)] block mb-1.5 font-mono">
                        Contributing Skills ({pillar.contributingSkills.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {pillar.contributingSkills.map((sk) => (
                          <span
                            key={sk.id}
                            className="text-xs font-mono text-[var(--forge-text-accent)] bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] px-2 py-0.5 rounded flex items-center gap-1"
                          >
                            <span>{sk.name}</span>
                            <span className="text-xs text-[var(--forge-text-muted)]">LVL {sk.level}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subcategories */}
                  <div className="pt-2 flex flex-wrap gap-1 border-t border-[var(--forge-border)]">
                    {pillar.subCategories.map((sub, i) => (
                      <span key={i} className="text-xs uppercase tracking-wider font-semibold text-[var(--forge-text-secondary)] bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] px-2 py-0.5 rounded">
                        {sub}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Skill Tree Modal */}
      <SkillTreeModal
        skill={selectedSkill}
        isOpen={isTreeModalOpen}
        onClose={() => setIsTreeModalOpen(false)}
      />

      {/* Life Builds Modal */}
      <LifeBuildsModal
        isOpen={isBuildsModalOpen}
        onClose={() => setIsBuildsModalOpen(false)}
      />
    </div>
  );
};
