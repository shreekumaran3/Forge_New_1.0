import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useGame } from '../context/GameContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  calculateMasteryBandsState,
  formatPracticeHours,
} from '../services/masteryBandService';
import {
  getPlayerXpNextLevel,
  getStatXpNextLevel,
  STATS_CONFIG,
} from '../services/xpService';
import {
  Shield,
  Flame,
  Award,
  BookOpen,
  Edit3,
  CheckCircle2,
  Compass,
  Zap,
  Sparkles,
  Target,
  BookMarked,
  Plus,
  Settings,
  Activity,
  Brain,
  Crown,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { RetentionCard } from '../components/retention/RetentionCard';
import { ProfileAvatar } from '../components/character/ProfileAvatar';
import { AnimatedCounter } from '../lib/animations';
import { playUISound } from '../services/soundManager';

interface CharacterScreenProps {
  onOpenSettings?: () => void;
  onNavigateToQuests?: () => void;
  onStartSystemGuide?: (guideId: string) => void;
  onOpenSystemGuides?: () => void;
}

export const CharacterScreen: React.FC<CharacterScreenProps> = ({ 
  onOpenSettings, 
  onNavigateToQuests,
  onStartSystemGuide,
  onOpenSystemGuides,
}) => {
  const { player, quests, stats, skills, updatePlayer } = useGame();
  const principles = useLiveQuery(() => db.principles.toArray(), []) || [];

  const [isEditMottoOpen, setIsEditMottoOpen] = useState(false);
  const [isAddPrincipleOpen, setIsAddPrincipleOpen] = useState(false);
  const [newPrincipleText, setNewPrincipleText] = useState('');
  const [mottoText, setMottoText] = useState(player?.lifeMotto || '');
  const [arcText, setArcText] = useState(player?.currentArc || '');

  if (!player) return null;

  const nextLevelXp = getPlayerXpNextLevel(player.level);
  const bandsOverview = calculateMasteryBandsState(skills || []);
  const totalQuestsToday = quests.filter((q) => q.frequency === 'daily').length;
  const completedQuestsToday = quests.filter((q) => q.frequency === 'daily' && q.completedToday).length;
  const completionPercent = totalQuestsToday > 0 ? Math.round((completedQuestsToday / totalQuestsToday) * 100) : 0;

  const handleNavigateToQuests = () => {
    playUISound('tap');
    if (onNavigateToQuests) {
      onNavigateToQuests();
    } else {
      window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: 'quests' } }));
    }
  };

  const handleSaveMotto = async () => {
    await updatePlayer({
      lifeMotto: mottoText,
      currentArc: arcText,
    });
    setIsEditMottoOpen(false);
  };

  const handleAddPrinciple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrincipleText.trim()) return;
    await db.principles.add({
      text: newPrincipleText.trim(),
      category: 'character',
      createdAt: new Date().toISOString(),
    });
    setNewPrincipleText('');
    setIsAddPrincipleOpen(false);
  };

  const handleUpdateAvatar = async (avatarUrl: string) => {
    await updatePlayer({ avatarUrl });
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <motion.div
      id="character-home-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      {/* 1. LARGE CENTERED PROFILE IDENTITY HEADER */}
      <motion.div variants={itemVariants}>
        <Card variant="gold" className="relative overflow-hidden p-6 text-center bg-[var(--forge-surface-elevated)] border-[var(--forge-border)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[var(--forge-primary-muted)] blur-3xl rounded-full pointer-events-none" />

          {/* Top-Right Settings Gear Button */}
          {onOpenSettings && (
            <motion.button
              whileHover={{ rotate: 90, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenSettings}
              data-system-guide="profile-settings-btn"
              className="absolute top-4 right-4 p-2.5 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-accent)] hover:text-[var(--forge-text-primary)] hover:border-[var(--forge-border-accent)] shadow-xs transition-all cursor-pointer z-20 group"
              title="Vault & Settings"
              aria-label="Open Settings"
            >
              <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
            </motion.button>
          )}

          {/* Centered Large RPG Profile Avatar */}
          <div data-system-guide="profile-identity" className="relative z-10 flex justify-center mb-3">
            <ProfileAvatar player={player} onUpdateAvatar={handleUpdateAvatar} />
          </div>

          {/* Character Name & Age */}
          <div className="relative z-10 space-y-1 mt-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wide text-[var(--forge-text-primary)]">
              {player.name}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-[var(--forge-text-secondary)]">
              <span>AGE {player.age || 25}</span>
              <span>•</span>
              <span className="text-[var(--forge-text-accent)] font-semibold">{player.lifeClass}</span>
            </div>
          </div>

          {/* Level & Forge Band Badges */}
          <div className="relative z-10 flex items-center justify-center gap-3 mt-4 flex-wrap">
            <div data-system-guide="profile-level-badge" className="flex items-center gap-1.5 text-[var(--forge-text-accent)] bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] px-3.5 py-1.5 rounded-full shadow-xs">
              <Shield className="w-4 h-4 text-[var(--forge-text-accent)]" />
              <span className="font-mono text-xs font-bold tracking-wider">
                LEVEL <AnimatedCounter value={player.level} />
              </span>
            </div>
            <div data-system-guide="profile-band-badge" className={`flex items-center gap-1.5 ${bandsOverview.highestBand.textColor} bg-[var(--forge-surface)] border ${bandsOverview.highestBand.borderColor} px-3.5 py-1.5 rounded-full shadow-xs`}>
              <Zap className="w-4 h-4 fill-current" />
              <span className="font-mono text-xs font-bold tracking-wider">
                BAND {bandsOverview.highestUnlockedBand} • {bandsOverview.highestBand.name.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 bg-[var(--forge-surface)] border border-zinc-700/40 px-3.5 py-1.5 rounded-full shadow-xs">
              <span className="font-mono text-xs font-bold tracking-wider">
                {formatPracticeHours(bandsOverview.totalPracticeHours)}
              </span>
            </div>
          </div>

          {/* Player Overall XP Bar */}
          <div data-system-guide="profile-xp-bar" className="relative z-10 mt-6 pt-4 border-t border-[var(--forge-border)] text-left">
            <ProgressBar
              value={player.currentXp}
              max={nextLevelXp}
              label="FORGE PROGRESSION"
              color="gold"
            />
          </div>
        </Card>
      </motion.div>

      {/* 2. STREAKS & TODAY'S COMPLETION GRID */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Streak Card */}
        <Card data-system-guide="streak-card" className="flex items-center gap-3.5 p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-xs">
          <div className="p-2.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] rounded-lg shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[var(--forge-text-secondary)] font-bold uppercase tracking-wider block">
              Discipline Streak
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-lg font-bold text-[var(--forge-text-primary)]">
                <AnimatedCounter value={player.currentStreak} />
              </span>
              <span className="text-xs text-[var(--forge-text-secondary)]">Days</span>
            </div>
            <span className="text-xs text-[var(--forge-text-muted)]">Longest: {player.longestStreak}d</span>
          </div>
        </Card>

        {/* Today's Quests Card */}
        <Card className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 bg-[var(--forge-surface-interactive)] border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 rounded-lg shadow-xs shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-[var(--forge-text-secondary)] font-bold uppercase tracking-wider block">
                  Today's Quests
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono text-lg font-bold text-[var(--forge-text-primary)]">
                    <AnimatedCounter value={completionPercent} suffix="%" />
                  </span>
                  <span className="text-xs text-[var(--forge-text-secondary)]">Done</span>
                </div>
                <span className="text-xs text-[var(--forge-text-muted)]">
                  {completedQuestsToday}/{totalQuestsToday} Completed
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNavigateToQuests}
              aria-label="View Today's Quests in Forge"
              className="p-1 -mr-1 -mt-0.5 rounded-lg text-[var(--forge-text-muted)] hover:text-[var(--forge-text-accent)] transition-colors cursor-pointer shrink-0 hover:bg-[var(--forge-surface-interactive)]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* 3. RETENTION JOURNEY CARD */}
      <motion.div variants={itemVariants} data-system-guide="retention-card">
        <RetentionCard />
      </motion.div>

      {/* 4. PRIMARY RPG STATS GRID (MOVED FROM GROWTH TO HOME) */}
      <motion.div variants={itemVariants} data-system-guide="primary-attributes" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--forge-text-accent)]" />
            <span>Primary Attributes (12 Stats)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATS_CONFIG.map((statConfig) => {
            const userStat = stats.find((s) => s.statId === statConfig.id);
            const level = userStat?.level || 1;
            const currentXp = userStat?.currentXp || 0;
            const reqXp = getStatXpNextLevel(level);

            return (
              <Card
                key={statConfig.id}
                className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl space-y-2 relative overflow-hidden shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-serif text-sm font-bold text-[var(--forge-text-primary)]">{statConfig.name}</h3>
                    </div>
                    <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5 leading-snug">{statConfig.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] px-2 py-0.5 rounded">
                      LVL {level}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <ProgressBar
                    value={currentXp}
                    max={reqXp}
                    showValues={false}
                    color="gold"
                    size="sm"
                  />
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--forge-text-muted)] mt-1">
                    <span>XP: {currentXp} / {reqXp}</span>
                    <span>{Math.round((currentXp / reqXp) * 100)}% to LVL {level + 1}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* 5. CORE PRINCIPLES: THE MIRROR */}
      <motion.div variants={itemVariants} data-system-guide="mirror-principles">
        <Card className="space-y-3 border border-[var(--forge-border)] bg-[var(--forge-surface)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--forge-text-accent)] font-bold flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5" />
              The Mirror: Core Principles
            </span>
            <button
              onClick={() => setIsAddPrincipleOpen(true)}
              className="p-1 text-[var(--forge-text-accent)] hover:text-[var(--forge-text-primary)] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {principles.length === 0 ? (
              <p className="text-xs text-[var(--forge-text-muted)] italic">No principles added yet. Tap + to add a core creed.</p>
            ) : (
              principles.map((pr) => (
                <div
                  key={pr.id}
                  className="p-3 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg text-xs text-[var(--forge-text-primary)] font-serif italic border-l-2 border-l-[var(--forge-primary)]"
                >
                  "{pr.text}"
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>

      {/* 6. LIFE MOTTO BANNER */}
      <motion.div variants={itemVariants} data-system-guide="life-motto-card">
        <Card className="relative group bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[var(--forge-text-accent)] font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Life Motto & Creed
            </span>
            <button
              onClick={() => {
                setMottoText(player.lifeMotto);
                setArcText(player.currentArc);
                setIsEditMottoOpen(true);
              }}
              className="p-1 text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-accent)] transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <p className="font-serif italic text-sm text-[var(--forge-text-primary)] border-l-2 border-[var(--forge-primary)] pl-3 py-1">
            "{player.lifeMotto}"
          </p>
        </Card>
      </motion.div>

      {/* Edit Motto Modal */}
      <Modal
        isOpen={isEditMottoOpen}
        onClose={() => setIsEditMottoOpen(false)}
        title="EDIT CREED & ARC"
        subtitle="Define the core principles guiding your character."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-[var(--forge-text-secondary)] mb-1.5">
              Life Motto
            </label>
            <textarea
              value={mottoText}
              onChange={(e) => setMottoText(e.target.value)}
              rows={3}
              className="w-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg p-3 text-xs text-[var(--forge-text-primary)] focus:outline-none focus:border-[var(--forge-border-accent)]"
              placeholder="e.g. Keep Walking. Character is forged in daily actions."
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-[var(--forge-text-secondary)] mb-1.5">
              Current Arc Focus
            </label>
            <input
              type="text"
              value={arcText}
              onChange={(e) => setArcText(e.target.value)}
              className="w-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg p-3 text-xs text-[var(--forge-text-primary)] focus:outline-none focus:border-[var(--forge-border-accent)]"
              placeholder="e.g. Arc of Physical & Mental Fortitude"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditMottoOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={handleSaveMotto}>
              Save Creed
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Principle Modal */}
      <Modal
        isOpen={isAddPrincipleOpen}
        onClose={() => setIsAddPrincipleOpen(false)}
        title="ADD CORE PRINCIPLE"
        subtitle="Write a foundational rule for your identity."
      >
        <form onSubmit={handleAddPrinciple} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-[var(--forge-text-secondary)] mb-1.5">
              Principle Statement
            </label>
            <input
              type="text"
              required
              value={newPrincipleText}
              onChange={(e) => setNewPrincipleText(e.target.value)}
              className="w-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg p-3 text-xs text-[var(--forge-text-primary)] focus:outline-none focus:border-[var(--forge-border-accent)]"
              placeholder="e.g. I keep my word under all circumstances."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddPrincipleOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" type="submit">
              Save Principle
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
