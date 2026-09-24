import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { getPlayerXpNextLevel } from '../services/xpService';
import {
  getUnlockedSkillNodeIds,
  getCharacterArchetype,
  getTutorialAvailableNodeState,
} from '../services/unifiedSkillTreeService';
import { UNIFIED_SKILL_NODES } from '../data/unifiedSkillTreeData';
import {
  calculateMasteryBandsState,
  formatPracticeHours,
} from '../services/masteryBandService';
import { MAX_ACTIVE_QUESTS } from '../types';
import { ForgeQuestsView } from '../components/forge/ForgeQuestsView';
import { ForgeSkillTreeView } from '../components/forge/ForgeSkillTreeView';
import { ActiveSkillsScreen } from './ActiveSkillsScreen';
import { ForgeCharacterBuildView } from '../components/forge/ForgeCharacterBuildView';
import { ForgeProgressionView } from '../components/forge/ForgeProgressionView';
import { ForgePathView } from '../components/forge/ForgePathView';
import { QuestExecutionScreen } from '../components/forge/QuestExecutionScreen';
import { QuestExecutionTutorialDemo } from '../components/forge/QuestExecutionTutorialDemo';
import { SystemGuidesCard } from '../components/forge/SystemGuidesCard';
import { ForgeTourSpotlight } from '../components/forge/ForgeTourSpotlight';
import { getForgeTourSteps, ForgeSubView } from '../components/forge/forgeTourConfig';
import { isForgeTutorialCompleted } from '../services/forgeTutorialService';
import { playUISound } from '../services/soundManager';
import { useBackHandler } from '../services/backButtonManager';
import {
  Compass,
  Swords,
  Sparkles,
  Zap,
  ChevronRight,
  Flame,
  Crown,
  TrendingUp,
  BookOpen,
  Wind,
  Shield,
  Target,
} from 'lucide-react';

interface ForgeScreenProps {
  onLaunchBreathing?: () => void;
}

interface ForgeMenuAccent {
  name: string;
  iconBg: string;
  iconBorder: string;
  iconText: string;
  titleHover: string;
  arrowBorder: string;
  arrowBg: string;
  arrowHoverBg: string;
  arrowHoverBorder: string;
  arrowText: string;
  arrowHoverText: string;
}

const FORGE_MENU_ACCENTS: Record<string, ForgeMenuAccent> = {
  quests: {
    name: 'Quests',
    iconBg: 'bg-amber-500/15',
    iconBorder: 'border-amber-500/30',
    iconText: 'text-amber-500 dark:text-amber-400',
    titleHover: 'group-hover:text-amber-400',
    arrowBorder: 'border-amber-500/30',
    arrowBg: 'bg-amber-500/10',
    arrowHoverBg: 'group-hover:bg-amber-500/20',
    arrowHoverBorder: 'group-hover:border-amber-500/50',
    arrowText: 'text-amber-500 dark:text-amber-400',
    arrowHoverText: 'group-hover:text-amber-300',
  },
  skillTree: {
    name: 'Skill Tree',
    iconBg: 'bg-indigo-500/15',
    iconBorder: 'border-indigo-500/30',
    iconText: 'text-indigo-500 dark:text-indigo-400',
    titleHover: 'group-hover:text-indigo-400',
    arrowBorder: 'border-indigo-500/30',
    arrowBg: 'bg-indigo-500/10',
    arrowHoverBg: 'group-hover:bg-indigo-500/20',
    arrowHoverBorder: 'group-hover:border-indigo-500/50',
    arrowText: 'text-indigo-500 dark:text-indigo-400',
    arrowHoverText: 'group-hover:text-indigo-300',
  },
  activeSkills: {
    name: 'Active Skills',
    iconBg: 'bg-emerald-500/15',
    iconBorder: 'border-emerald-500/30',
    iconText: 'text-emerald-500 dark:text-emerald-400',
    titleHover: 'group-hover:text-emerald-400',
    arrowBorder: 'border-emerald-500/30',
    arrowBg: 'bg-emerald-500/10',
    arrowHoverBg: 'group-hover:bg-emerald-500/20',
    arrowHoverBorder: 'group-hover:border-emerald-500/50',
    arrowText: 'text-emerald-500 dark:text-emerald-400',
    arrowHoverText: 'group-hover:text-emerald-300',
  },
  forgePath: {
    name: 'Forge Path',
    iconBg: 'bg-orange-500/15',
    iconBorder: 'border-orange-500/30',
    iconText: 'text-orange-500 dark:text-orange-400',
    titleHover: 'group-hover:text-orange-400',
    arrowBorder: 'border-orange-500/30',
    arrowBg: 'bg-orange-500/10',
    arrowHoverBg: 'group-hover:bg-orange-500/20',
    arrowHoverBorder: 'group-hover:border-orange-500/50',
    arrowText: 'text-orange-500 dark:text-orange-400',
    arrowHoverText: 'group-hover:text-orange-300',
  },
  characterBuild: {
    name: 'Character & Build',
    iconBg: 'bg-teal-500/15',
    iconBorder: 'border-teal-500/30',
    iconText: 'text-teal-600 dark:text-teal-400',
    titleHover: 'group-hover:text-teal-400',
    arrowBorder: 'border-teal-500/30',
    arrowBg: 'bg-teal-500/10',
    arrowHoverBg: 'group-hover:bg-teal-500/20',
    arrowHoverBorder: 'group-hover:border-teal-500/50',
    arrowText: 'text-teal-500 dark:text-teal-400',
    arrowHoverText: 'group-hover:text-teal-300',
  },
  guidedBreathing: {
    name: 'Guided Breathing',
    iconBg: 'bg-cyan-500/15',
    iconBorder: 'border-cyan-500/30',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    titleHover: 'group-hover:text-cyan-400',
    arrowBorder: 'border-cyan-500/30',
    arrowBg: 'bg-cyan-500/10',
    arrowHoverBg: 'group-hover:bg-cyan-500/20',
    arrowHoverBorder: 'group-hover:border-cyan-500/50',
    arrowText: 'text-cyan-500 dark:text-cyan-400',
    arrowHoverText: 'group-hover:text-cyan-300',
  },
  progression: {
    name: 'Progression',
    iconBg: 'bg-purple-500/15',
    iconBorder: 'border-purple-500/30',
    iconText: 'text-purple-600 dark:text-purple-400',
    titleHover: 'group-hover:text-purple-400',
    arrowBorder: 'border-purple-500/30',
    arrowBg: 'bg-purple-500/10',
    arrowHoverBg: 'group-hover:bg-purple-500/20',
    arrowHoverBorder: 'group-hover:border-purple-500/50',
    arrowText: 'text-purple-500 dark:text-purple-400',
    arrowHoverText: 'group-hover:text-purple-300',
  },
  systemGuides: {
    name: 'System Guides',
    iconBg: 'bg-amber-400/10',
    iconBorder: 'border-amber-400/25',
    iconText: 'text-amber-400',
    titleHover: 'group-hover:text-amber-400',
    arrowBorder: 'border-amber-400/30',
    arrowBg: 'bg-amber-400/10',
    arrowHoverBg: 'group-hover:bg-amber-400/20',
    arrowHoverBorder: 'group-hover:border-amber-400/50',
    arrowText: 'text-amber-400',
    arrowHoverText: 'group-hover:text-amber-300',
  },
};

interface ForgeMenuArrowProps {
  accent: ForgeMenuAccent;
}

const ForgeMenuArrow: React.FC<ForgeMenuArrowProps> = ({ accent }) => (
  <div
    className={`w-8 h-8 rounded-lg border ${accent.arrowBorder} ${accent.arrowBg} ${accent.arrowHoverBg} ${accent.arrowHoverBorder} ${accent.arrowText} ${accent.arrowHoverText} flex items-center justify-center shrink-0 transition-colors shadow-2xs`}
  >
    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
  </div>
);

export const ForgeScreen: React.FC<ForgeScreenProps> = ({ onLaunchBreathing }) => {
  const { player, quests, skills, activeExecution, forgePath } = useGame();
  const [subView, setSubView] = useState<ForgeSubView>('home');
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  // Register Android Back button handler for Forge Subsections (Priority 50)
  // When inside Quests, Skill Tree, Character, or Progression, Back returns to Forge Home
  useBackHandler(
    'forge-subview',
    50,
    () => {
      setSubView('home');
      return true;
    },
    subView !== 'home'
  );

  // Auto-trigger interactive walkthrough on first visit if not completed
  useEffect(() => {
    if (!isForgeTutorialCompleted()) {
      setIsTourActive(true);
      setTourStepIndex(0);
    }
  }, []);

  // Listen to deep-link subview navigation requests (e.g. from Quest completion notifications)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.subView) {
        setSubView(custom.detail.subView);
      }
    };
    window.addEventListener('forge_set_subview', handler);
    return () => window.removeEventListener('forge_set_subview', handler);
  }, []);

  if (!player) return null;

  const nextLevelXp = getPlayerXpNextLevel(player.level);
  const activeQuestsCount = quests.filter((q) => !q.completedToday).length;
  const activeSkillsCount = (skills || []).filter((s) => Boolean(s.active)).length;
  const bandsOverview = calculateMasteryBandsState(skills || []);
  const unlockedIds = getUnlockedSkillNodeIds();
  const archetype = getCharacterArchetype();

  const navigateSubView = (target: ForgeSubView) => {
    playUISound('tap');
    setSubView(target);
  };

  const handleStartTour = () => {
    playUISound('tap');
    setTourStepIndex(0);
    setIsTourActive(true);
  };

  const tutorialNodeState = getTutorialAvailableNodeState(
    player.level,
    0,
    skills || []
  );
  const tourSteps = getForgeTourSteps({
    playerLevel: player.level,
    hasAvailableNode: tutorialNodeState.status === 'available',
    availableNodeTitle: tutorialNodeState.node?.title,
  });
  const currentTourStepId = isTourActive ? tourSteps[tourStepIndex]?.id : undefined;

  return (
    <div id="forge-screen-root" className="relative">
      <AnimatePresence mode="wait">
        {/* Active Quest Execution Dedicated Screen */}
        {subView === 'execution' && activeExecution && (
          <motion.div
            key="execution-view"
            data-system-guide="quest-execution-screen"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <QuestExecutionScreen
              execution={activeExecution}
              onBack={() => setSubView('quests')}
            />
          </motion.div>
        )}

        {/* Tutorial-Only Quest Execution Demo Screen */}
        {subView === 'tutorial-execution' && (
          <motion.div
            key="tutorial-execution-view"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <QuestExecutionTutorialDemo
              onBack={() => {
                setSubView('home');
                window.dispatchEvent(
                  new CustomEvent('forge_set_root_tab', { detail: { tab: 'system-guides' } })
                );
              }}
            />
          </motion.div>
        )}

        {/* Sub-view Routing */}
        {subView === 'quests' && (
          <motion.div
            key="quests-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ForgeQuestsView
              onBack={() => setSubView('home')}
              tourStepId={currentTourStepId}
              onOpenExecution={() => setSubView('execution')}
            />
          </motion.div>
        )}

        {subView === 'skills' && (
          <motion.div
            key="skills-view"
            data-system-guide="skill-tree-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ForgeSkillTreeView
              onBack={() => setSubView('home')}
              tourStepId={currentTourStepId}
            />
          </motion.div>
        )}

        {/* Active Skills Dedicated Screen */}
        {subView === 'active-skills' && (
          <motion.div
            key="active-skills-view"
            data-system-guide="active-skills-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ActiveSkillsScreen onBack={() => setSubView('home')} />
          </motion.div>
        )}

        {subView === 'character' && (
          <motion.div
            key="character-view"
            data-system-guide="character-build-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ForgeCharacterBuildView onBack={() => setSubView('home')} />
          </motion.div>
        )}

        {subView === 'progression' && (
          <motion.div
            key="progression-view"
            data-system-guide="forge-progression-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ForgeProgressionView onBack={() => setSubView('home')} />
          </motion.div>
        )}

        {/* Forge Path Dedicated Page */}
        {subView === 'path' && (
          <motion.div
            key="path-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ForgePathView onBack={() => setSubView('home')} />
          </motion.div>
        )}

        {/* Main Forge Home View */}
        {subView === 'home' && (
          <motion.div
            key="home-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            id="forge-home-screen"
            className="space-y-6 pb-24"
          >
          {/* 1. FORGE HEADER & PROGRESSION BAR */}
          <div
            data-forge-tour="forge-header"
            className="forge-card p-5 sm:p-6 relative overflow-hidden bg-gradient-to-b from-[var(--forge-surface-elevated)] to-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl"
          >
            {/* Identity & SP Header Section */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              {/* Circular Profile Avatar (Enlarged anchor: 56px - 64px diameter) */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 shrink-0 bg-gradient-to-tr from-[var(--forge-primary)] to-[var(--forge-secondary)] shadow-xs">
                <div className="w-full h-full rounded-full overflow-hidden bg-[var(--forge-surface)] flex items-center justify-center">
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--forge-surface-interactive)] text-[var(--forge-text-accent)] font-bold font-serif text-xl sm:text-2xl">
                      {player.name ? player.name.charAt(0).toUpperCase() : <Shield className="w-7 h-7 text-[var(--forge-text-accent)]" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Identity Metadata & SP Cluster */}
              <div className="min-w-0 space-y-1.5">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)] truncate tracking-tight">
                  {player.name}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="forge-pill forge-pill-accent text-xs font-mono">
                    Level {player.level}
                  </span>
                  {player.lifeClass && (
                    <span className="forge-pill text-xs text-[var(--forge-text-secondary)]">
                      {player.lifeClass}
                    </span>
                  )}
                </div>
                <div className="pt-0.5">
                  <div
                    data-forge-tour="bands"
                    className={`forge-pill px-2.5 py-1 text-xs font-mono font-bold shrink-0 shadow-xs inline-flex items-center gap-1.5 w-fit ${bandsOverview.highestBand.textColor} border ${bandsOverview.highestBand.borderColor}`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>BAND {bandsOverview.highestUnlockedBand} • {formatPracticeHours(bandsOverview.totalPracticeHours)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Universal Forge XP Progress Bar */}
            <div data-forge-tour="xp" className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--forge-text-secondary)]">
                  {player.level >= 100 ? 'Level 100 • ASCENDANT' : `Level ${player.level} Progression`}
                </span>
                <span className="text-[var(--forge-text-accent)] font-bold">
                  {player.level >= 100 ? (
                    'MAX LEVEL'
                  ) : (
                    `${player.currentXp} / ${nextLevelXp} XP (${Math.min(100, Math.round((player.currentXp / nextLevelXp) * 100))}%)`
                  )}
                </span>
              </div>
              <ProgressBar
                value={player.level >= 100 ? nextLevelXp : player.currentXp}
                max={nextLevelXp}
                color="gold"
                size="md"
                showValues={false}
              />
            </div>

            {/* Replayable Interactive Forge Guide Entry Point */}
            <div className="mt-4 pt-3.5 border-t border-[var(--forge-border)] flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-[var(--forge-text-secondary)]">Need a refresher on game mechanics?</span>
              <button
                onClick={handleStartTour}
                className="forge-button-secondary py-1.5 px-3.5 text-xs font-semibold"
              >
                <BookOpen className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                <span>How Forge Works</span>
              </button>
            </div>
          </div>

          {/* ACTIVE MISSION IN PROGRESS HERO BANNER */}
          {activeExecution && activeExecution.status !== 'COMPLETED' && activeExecution.status !== 'CANCELLED' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="forge-card p-5 rounded-xl bg-gradient-to-r from-[var(--forge-surface-elevated)] to-[var(--forge-surface)] border-2 border-[var(--forge-border-accent)] shadow-xs flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-[var(--forge-text-accent)] animate-pulse" />
                </div>
                <div className="min-w-0">
                  <span className="forge-pill forge-pill-accent text-xs mb-1">
                    ⚡ Active Mission In Progress
                  </span>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] truncate mt-0.5">
                    {activeExecution.questTitle}
                  </h3>
                  <p className="text-xs text-[var(--forge-text-secondary)] font-mono">
                    Target: {Math.round(activeExecution.durationSeconds / 60)} min • +{activeExecution.basePlayerXP} XP
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigateSubView('execution')}
                className="forge-button-primary shrink-0 text-xs uppercase tracking-wider"
              >
                Resume Mission
              </button>
            </motion.div>
          )}

          {/* 2. "WHAT DO YOU WANT TO DO?" 5 NAVIGATION CARDS */}
          <div className="space-y-3.5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--forge-text-accent)]" />
              What do you want to do?
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {/* CARD 1: QUESTS */}
              <div
                data-forge-tour="quests"
                data-system-guide="quests-nav-card"
                onClick={() => navigateSubView('quests')}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.quests.iconBg} border ${FORGE_MENU_ACCENTS.quests.iconBorder} ${FORGE_MENU_ACCENTS.quests.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Swords className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.quests.titleHover} transition-colors`}>
                          Quests
                        </h3>
                        <span className="forge-pill forge-pill-accent text-xs">
                          {activeQuestsCount} / {MAX_ACTIVE_QUESTS} Active
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        Complete challenges, defeat procrastination, and earn universal character XP.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.quests} />
                </div>
              </div>

              {/* CARD 2: MASTERY TREE */}
              <div
                data-forge-tour="skills"
                data-system-guide="skill-tree-card"
                onClick={() => navigateSubView('skills')}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.skillTree.iconBg} border ${FORGE_MENU_ACCENTS.skillTree.iconBorder} ${FORGE_MENU_ACCENTS.skillTree.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.skillTree.titleHover} transition-colors`}>
                          Mastery Tree
                        </h3>
                        <span className="forge-pill text-xs text-indigo-600 dark:text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
                          Band {bandsOverview.highestUnlockedBand} • {bandsOverview.highestBand.name}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        Ascend the 6 Forge Bands through deliberate practice hours. {bandsOverview.totalPracticeHours} total hours logged.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.skillTree} />
                </div>
              </div>

              {/* CARD 3: ACTIVE SKILLS */}
              <div
                data-forge-tour="active-skills"
                data-system-guide="active-skills-nav-card"
                onClick={() => navigateSubView('active-skills')}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.activeSkills.iconBg} border ${FORGE_MENU_ACCENTS.activeSkills.iconBorder} ${FORGE_MENU_ACCENTS.activeSkills.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.activeSkills.titleHover} transition-colors`}>
                          Active Skills
                        </h3>
                        <span className="forge-pill text-xs text-emerald-600 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 font-mono">
                          {activeSkillsCount} / 3 Active
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        Focus on the skills you are actively developing. Choose up to three and set their priority.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.activeSkills} />
                </div>
              </div>

              {/* CARD 4: FORGE PATH */}
              <div
                data-forge-tour="forge-path"
                data-system-guide="forge-path-card"
                onClick={() => navigateSubView('path')}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.forgePath.iconBg} border ${FORGE_MENU_ACCENTS.forgePath.iconBorder} ${FORGE_MENU_ACCENTS.forgePath.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.forgePath.titleHover} transition-colors`}>
                          Forge Path
                        </h3>
                        <span
                          className={`forge-pill text-xs truncate max-w-[200px] ${
                            forgePath && forgePath.name
                              ? 'forge-pill-accent'
                              : 'text-[var(--forge-text-secondary)]'
                          }`}
                        >
                          {forgePath && forgePath.name ? forgePath.name : 'Not Set'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        Define your overarching Life Path. Helps Forge shape your quests, skills, and long-term direction.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.forgePath} />
                </div>
              </div>

              {/* CARD 5: CHARACTER BUILD */}
              <div
                data-forge-tour="character"
                data-system-guide="character-build-card"
                onClick={() => navigateSubView('character')}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.characterBuild.iconBg} border ${FORGE_MENU_ACCENTS.characterBuild.iconBorder} ${FORGE_MENU_ACCENTS.characterBuild.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.characterBuild.titleHover} transition-colors`}>
                          Character & Build
                        </h3>
                        <span className="forge-pill text-xs text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/10">
                          {archetype.title}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        View your RPG archetype, specialization branches breakdown, and active capabilities.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.characterBuild} />
                </div>
              </div>

              {/* CARD 6: GUIDED BREATHING */}
              <div
                data-forge-tour="breathing"
                data-system-guide="guided-breathing-card"
                onClick={() => {
                  playUISound('tap');
                  if (onLaunchBreathing) {
                    onLaunchBreathing();
                  }
                }}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.guidedBreathing.iconBg} border ${FORGE_MENU_ACCENTS.guidedBreathing.iconBorder} ${FORGE_MENU_ACCENTS.guidedBreathing.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <Wind className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.guidedBreathing.titleHover} transition-colors`}>
                          Guided Breathing
                        </h3>
                        <span className="forge-pill text-xs text-cyan-700 dark:text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                          Active Practice
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        Run a guided breathing session to reset focus, lower stress, and calm your nervous system.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.guidedBreathing} />
                </div>
              </div>

              {/* CARD 7: PROGRESSION */}
              <div
                data-forge-tour="progression"
                data-system-guide="progression-milestones-card"
                onClick={() => navigateSubView('progression')}
                className="forge-card-interactive p-4 sm:p-5 rounded-xl group relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3.5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-11 h-11 rounded-lg ${FORGE_MENU_ACCENTS.progression.iconBg} border ${FORGE_MENU_ACCENTS.progression.iconBorder} ${FORGE_MENU_ACCENTS.progression.iconText} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-serif text-base sm:text-lg font-bold text-[var(--forge-text-primary)] ${FORGE_MENU_ACCENTS.progression.titleHover} transition-colors`}>
                          Progression
                        </h3>
                        <span className="forge-pill text-xs text-purple-700 dark:text-purple-300 border-purple-500/30 bg-purple-500/10">
                          Level {player.level}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] mt-1 leading-relaxed">
                        Track lifetime XP, milestone gates, streak records, and upcoming level rewards.
                      </p>
                    </div>
                  </div>

                  <ForgeMenuArrow accent={FORGE_MENU_ACCENTS.progression} />
                </div>
              </div>

              {/* CARD 8: SYSTEM GUIDES */}
              <SystemGuidesCard arrow={<ForgeMenuArrow accent={FORGE_MENU_ACCENTS.systemGuides} />} />
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Root-Level Persistent Interactive Tour Spotlight */}
      <ForgeTourSpotlight
        isActive={isTourActive}
        stepIndex={tourStepIndex}
        onStepChange={(idx) => setTourStepIndex(idx)}
        onClose={() => setIsTourActive(false)}
        onTutorialComplete={() => {
          setIsTourActive(false);
          setSubView('path');
        }}
        currentSubView={subView}
        onNavigateSubView={(view) => setSubView(view)}
      />
    </div>
  );
};
