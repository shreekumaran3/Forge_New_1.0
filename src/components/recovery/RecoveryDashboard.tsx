import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { db } from '../../db/database';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import {
  INITIAL_RECOVERY_ACTIVITIES,
  RecoveryActivity,
} from '../../data/recoveryData';
import {
  ANIMATION_DURATIONS,
  EASINGS,
  AnimatedProgressBar,
  AnimatedCheckbox,
  AnimatedCounter,
  MotionButton,
} from '../../lib/animations';
import {
  Heart,
  Wind,
  Moon,
  Flame,
  Plus,
  Sparkles,
  Zap,
  CheckCircle2,
  Droplets,
  Footprints,
  Activity,
  Brain,
  Sun,
  Smartphone,
  BookOpen,
  Bed,
  UserCheck,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

interface RecoveryDashboardProps {
  onLaunchBreathing?: () => void;
}

export const RecoveryDashboard: React.FC<RecoveryDashboardProps> = ({ onLaunchBreathing }) => {
  const { awardActivityXp, revokeActivityXp, healthLog } = useGame();
  
  // Local recovery activities state (stored in localStorage or state for daily reset)
  const todayStr = new Date().toISOString().split('T')[0];
  const storageKey = `forge_recovery_${todayStr}`;

  const [activities, setActivities] = useState<RecoveryActivity[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved recovery state', e);
    }
    return INITIAL_RECOVERY_ACTIVITIES;
  });

  const [activeCategory, setActiveCategory] = useState<'all' | 'physical' | 'mental' | 'sleep'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCategory, setCustomCategory] = useState<'physical' | 'mental' | 'sleep'>('physical');
  const [customXp, setCustomXp] = useState(20);

  // Sleep & Water Quick Adjust state
  const [sleepHours, setSleepHours] = useState<number>(healthLog?.sleepHours || 7.5);
  const [waterMl, setWaterMl] = useState<number>(healthLog?.waterMl || 1500);

  // Save changes to localStorage on activity update
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(activities));
  }, [activities, storageKey]);

  // Synchronize health log if available
  useEffect(() => {
    if (healthLog?.sleepHours !== undefined) {
      setSleepHours(healthLog.sleepHours);
    }
    if (healthLog?.waterMl !== undefined) {
      setWaterMl(healthLog.waterMl);
    }
  }, [healthLog]);

  // Calculate protocol completion counts
  const completedCount = activities.filter((a) => a.completedToday).length;
  const totalCount = activities.length;
  const activityRatio = totalCount > 0 ? completedCount / totalCount : 0;

  // Handle Toggle Activity Completion
  const handleToggleActivity = async (activityId: string) => {
    const act = activities.find((a) => a.id === activityId);
    if (!act) return;

    const newCompleted = !act.completedToday;

    // Update state
    setActivities((prev) =>
      prev.map((item) =>
        item.id === activityId
          ? {
              ...item,
              completedToday: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : undefined,
            }
          : item
      )
    );

    if (newCompleted) {
      // Award Recovery XP
      await awardActivityXp({
        activityType: 'recovery',
        generalXp: act.xpReward,
        attributes: { [act.statId]: act.xpReward },
        title: `Recovery: ${act.title}`,
        subtitle: `Completed ${act.category.toUpperCase()} Protocol`,
        category: 'Recovery Protocol',
      });
    } else {
      // Revoke Recovery XP
      await revokeActivityXp({
        generalXp: act.xpReward,
        attributes: { [act.statId]: act.xpReward },
      });
    }
  };

  // Add Custom Activity
  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newAct: RecoveryActivity = {
      id: `custom_rec_${Date.now()}`,
      title: customTitle.trim(),
      description: customDesc.trim() || 'Custom daily recovery protocol.',
      category: customCategory,
      icon: customCategory === 'physical' ? 'Activity' : customCategory === 'mental' ? 'Brain' : 'Moon',
      xpReward: Number(customXp) || 20,
      pillarId: customCategory === 'physical' ? 'strength' : 'character',
      statId: customCategory === 'physical' ? 'health' : 'emotional_resilience',
    };

    setActivities((prev) => [newAct, ...prev]);
    setCustomTitle('');
    setCustomDesc('');
    setIsAddModalOpen(false);
  };

  // Save manual sleep/water to health logs
  const handleSaveHealthQuickLog = async (deltaSleep: number, deltaWater: number) => {
    const newSleep = Math.max(0, Math.min(14, sleepHours + deltaSleep));
    const newWater = Math.max(0, waterMl + deltaWater);
    setSleepHours(newSleep);
    setWaterMl(newWater);

    try {
      const existing = await db.healthLogs.where('date').equals(todayStr).first();
      if (existing) {
        await db.healthLogs.update(existing.id!, {
          sleepHours: newSleep,
          waterMl: newWater,
          syncedAt: new Date().toISOString(),
        });
      } else {
        await db.healthLogs.add({
          date: todayStr,
          sleepHours: newSleep,
          waterMl: newWater,
          syncedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Failed to log health quick adjust', e);
    }
  };

  // Icon Resolver
  const getIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'Activity':
        return <Activity className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Droplets':
        return <Droplets className={className} />;
      case 'Footprints':
        return <Footprints className={className} />;
      case 'UserCheck':
        return <UserCheck className={className} />;
      case 'Wind':
        return <Wind className={className} />;
      case 'Heart':
        return <Heart className={className} />;
      case 'Brain':
        return <Brain className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Sun':
        return <Sun className={className} />;
      case 'Moon':
        return <Moon className={className} />;
      case 'BookOpen':
        return <BookOpen className={className} />;
      case 'Smartphone':
        return <Smartphone className={className} />;
      case 'Bed':
        return <Bed className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const filteredActivities = activities.filter(
    (a) => activeCategory === 'all' || a.category === activeCategory
  );

  return (
    <div id="recovery-dashboard" className="space-y-6">
      {/* 1. RECOVERY BOARD HEADER CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATIONS.normal, ease: EASINGS.easeOut }}
      >
        <Card className="relative overflow-hidden border border-emerald-500/30 p-5 bg-[var(--forge-surface,#09090B)]">
          {/* Background Ambient Aura */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                  RECOVERY BOARD
                </span>
              </div>
              <h2 className="text-base font-bold text-[var(--forge-text-primary,#E4E3E0)] font-serif">
                Restoration & Regeneration Protocols
              </h2>
              <p className="text-[11px] text-[var(--forge-text-secondary,#8E9299)] mt-1 max-w-xs leading-relaxed">
                Daily physical, mental & sleep recovery actions to recharge body and mind.
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center justify-around sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--forge-border,#1F1F24)]">
              <div className="text-center px-3 py-2 bg-[var(--forge-bg-elevated,#0E0E12)] rounded-xl border border-[var(--forge-border,#1E1E24)] min-w-[80px]">
                <span className="block text-[9px] uppercase tracking-wider text-[var(--forge-text-secondary,#8E9299)] font-bold">
                  Protocols
                </span>
                <span className="text-sm font-mono font-bold text-[var(--forge-text-primary,white)] mt-0.5 block">
                  {completedCount}/{totalCount}
                </span>
              </div>

              <div className="text-center px-3 py-2 bg-[var(--forge-bg-elevated,#0E0E12)] rounded-xl border border-[var(--forge-border,#1E1E24)] min-w-[80px]">
                <span className="block text-[9px] uppercase tracking-wider text-[var(--forge-text-secondary,#8E9299)] font-bold">
                  Sleep
                </span>
                <span className="text-sm font-mono font-bold text-indigo-400 mt-0.5 block">
                  {sleepHours}h
                </span>
              </div>

              <div className="text-center px-3 py-2 bg-[var(--forge-bg-elevated,#0E0E12)] rounded-xl border border-[var(--forge-border,#1E1E24)] min-w-[80px]">
                <span className="block text-[9px] uppercase tracking-wider text-[var(--forge-text-secondary,#8E9299)] font-bold">
                  Hydration
                </span>
                <span className="text-sm font-mono font-bold text-teal-400 mt-0.5 block">
                  {waterMl}ml
                </span>
              </div>
            </div>
          </div>

          {/* Overall Recovery Progress Bar */}
          <div className="mt-4 pt-3 border-t border-[var(--forge-border,#18181C)]">
            <div className="flex justify-between text-[10px] uppercase font-mono text-[var(--forge-text-secondary,#8E9299)] mb-1.5 font-semibold">
              <span>Daily Protocol Completion</span>
              <span className="text-teal-400">{Math.round(activityRatio * 100)}%</span>
            </div>
            <AnimatedProgressBar
              progress={activityRatio * 100}
              colorClass="bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-500"
              heightClass="h-2.5"
            />
            {completedCount === 0 && (
              <p className="text-xs text-[var(--forge-text-secondary,#8E9299)] mt-2 italic text-center">
                No recovery activities completed today.
              </p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* 2. QUICK SLEEP & HYDRATION ADJUSTMENT ROW */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sleep Tracker Card */}
        <Card className="p-3.5 bg-[#0B0B0E] border border-[#1C1C22]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E4E3E0]">
                Sleep Rest
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">{sleepHours} Hours</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <MotionButton
              onClick={() => handleSaveHealthQuickLog(-0.5, 0)}
              className="flex-1 py-1.5 bg-[#141418] hover:bg-[#1E1E24] border border-[#262630] rounded-lg text-xs font-mono font-bold text-[#8E9299] hover:text-white"
            >
              - 0.5h
            </MotionButton>
            <MotionButton
              onClick={() => handleSaveHealthQuickLog(0.5, 0)}
              className="flex-1 py-1.5 bg-[#141418] hover:bg-[#1E1E24] border border-[#262630] rounded-lg text-xs font-mono font-bold text-emerald-400"
            >
              + 0.5h
            </MotionButton>
          </div>
        </Card>

        {/* Hydration Tracker Card */}
        <Card className="p-3.5 bg-[#0B0B0E] border border-[#1C1C22]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E4E3E0]">
                Hydration
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">{waterMl} ml</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <MotionButton
              onClick={() => handleSaveHealthQuickLog(0, -250)}
              className="flex-1 py-1.5 bg-[#141418] hover:bg-[#1E1E24] border border-[#262630] rounded-lg text-xs font-mono font-bold text-[#8E9299] hover:text-white"
            >
              - 250ml
            </MotionButton>
            <MotionButton
              onClick={() => handleSaveHealthQuickLog(0, 250)}
              className="flex-1 py-1.5 bg-[#141418] hover:bg-[#1E1E24] border border-[#262630] rounded-lg text-xs font-mono font-bold text-cyan-400"
            >
              + 250ml
            </MotionButton>
          </div>
        </Card>
      </div>

      {/* 3. CATEGORY FILTERS & ADD PROTOCOL */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px] font-bold uppercase tracking-wider py-1">
          {[
            { id: 'all', label: 'All Protocols', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'physical', label: 'Physical', icon: <Activity className="w-3.5 h-3.5 text-teal-400" /> },
            { id: 'mental', label: 'Mental', icon: <Brain className="w-3.5 h-3.5 text-violet-400" /> },
            { id: 'sleep', label: 'Sleep', icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <MotionButton
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap min-h-[40px] ${
                  isActive
                    ? 'bg-[#12141A] border-[#D4AF37]/50 text-[#E4E3E0] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                    : 'bg-[#0A0A0E] border border-[#1A1A20] text-[#8E9299] hover:text-white'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </MotionButton>
            );
          })}
        </div>

        <MotionButton
          onClick={() => setIsAddModalOpen(true)}
          className="p-2.5 bg-[#121218] border border-[#262632] hover:border-emerald-500/50 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px]"
          title="Add Custom Recovery Protocol"
        >
          <Plus className="w-4 h-4" />
        </MotionButton>
      </div>

      {/* 4. RECOVERY PROTOCOLS LIST */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredActivities.map((activity) => {
            const isDone = activity.completedToday;

            return (
              <motion.div
                key={activity.id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: ANIMATION_DURATIONS.normal, ease: EASINGS.easeOut }}
              >
                <Card
                  className={`p-4 transition-all border ${
                    isDone
                      ? 'bg-[#07080A] border-[#181A20] opacity-80'
                      : 'bg-[#0B0C10] border-[#1A1C24] hover:border-[#2C2E3A]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Checkbox */}
                      <div className="pt-0.5 shrink-0">
                        <AnimatedCheckbox
                          checked={Boolean(isDone)}
                          onChange={() => handleToggleActivity(activity.id)}
                          size="md"
                          activeColorClass="bg-emerald-500 border-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[9px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-md bg-[#12141A] border flex items-center gap-1 ${
                            activity.category === 'physical'
                              ? 'text-teal-400 border-teal-500/30'
                              : activity.category === 'mental'
                              ? 'text-violet-400 border-violet-500/30'
                              : 'text-indigo-400 border-indigo-500/30'
                          }`}>
                            {getIcon(activity.icon, 'w-3 h-3')}
                            <span>{activity.category}</span>
                          </span>

                          {activity.durationMins && (
                            <span className="text-[9px] font-mono text-[#8E9299]">
                              {activity.durationMins} MIN
                            </span>
                          )}

                          <span className="text-[9px] font-mono font-bold text-[#D4AF37] ml-auto">
                            +{activity.xpReward} XP
                          </span>
                        </div>

                        <h3
                          className={`text-sm font-bold tracking-wide transition-colors ${
                            isDone ? 'line-through text-[#63666E]' : 'text-[#E4E3E0]'
                          }`}
                        >
                          {activity.title}
                        </h3>

                        <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
                          {activity.description}
                        </p>

                        {/* Interactive Trigger Button for Breathing or Journaling */}
                        {activity.actionType === 'breathing' && onLaunchBreathing && (
                          <div className="mt-2.5">
                            <MotionButton
                              onClick={onLaunchBreathing}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                            >
                              <Wind className="w-3.5 h-3.5" />
                              <span>Launch Interactive Breathing Session</span>
                            </MotionButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredActivities.length === 0 && (
          <Card className="text-center py-10 text-[#8E9299] space-y-2 bg-[#0A0A0E] border-[#181820]">
            <Sparkles className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-xs">No protocols in this category.</p>
            <MotionButton
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-[#14141E] text-emerald-400 border border-[#242432] rounded-lg text-xs font-bold"
            >
              + Add Custom Protocol
            </MotionButton>
          </Card>
        )}
      </div>

      {/* MODAL: ADD CUSTOM RECOVERY PROTOCOL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="NEW RECOVERY PROTOCOL"
        subtitle="Define a custom restorative physical or mental daily action."
      >
        <form onSubmit={handleCreateCustom} className="space-y-4 pt-2">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1.5">
              Protocol Title
            </label>
            <input
              type="text"
              required
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-[#050508] border border-[#1C1C24] rounded-lg p-3 text-xs text-[#E4E3E0] focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Cold Shower Decompress"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1.5">
              Description
            </label>
            <textarea
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              className="w-full bg-[#050508] border border-[#1C1C24] rounded-lg p-3 text-xs text-[#E4E3E0] focus:outline-none focus:border-emerald-500 h-20 resize-none"
              placeholder="Brief details or intent..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1.5">
                Category
              </label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as any)}
                className="w-full bg-[#050508] border border-[#1C1C24] rounded-lg p-3 text-xs text-[#E4E3E0] focus:outline-none focus:border-emerald-500"
              >
                <option value="physical">Physical</option>
                <option value="mental">Mental</option>
                <option value="sleep">Sleep</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1.5">
                XP Reward
              </label>
              <input
                type="number"
                min="10"
                max="50"
                value={customXp}
                onChange={(e) => setCustomXp(Number(e.target.value))}
                className="w-full bg-[#050508] border border-[#1C1C24] rounded-lg p-3 text-xs text-[#E4E3E0] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <MotionButton
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-[#121218] border border-[#22222E] rounded-lg text-xs font-bold text-[#8E9299]"
            >
              Cancel
            </MotionButton>
            <MotionButton
              type="submit"
              className="px-5 py-2 bg-emerald-500 text-black font-bold text-xs rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              Add Protocol
            </MotionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
