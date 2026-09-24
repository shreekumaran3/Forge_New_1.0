import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Flame,
  Plus,
  Minus,
  Palette,
  PenTool,
  Utensils,
  Coins,
  Shield,
  Sparkles,
} from 'lucide-react';
import { db } from '../../db/database';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BackButton } from '../ui/BackButton';
import { useBackHandler } from '../../services/backButtonManager';
import { playUISound } from '../../services/soundManager';
import { selectOnboardingSkills } from '../../services/skillService';
import { STARTER_SKILLS } from '../../data/starterSkillsData';

interface SetupWizardProps {
  onComplete: () => void;
}

const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male', description: 'Forge character profile' },
  { id: 'Female', label: 'Female', description: 'Forge character profile' },
  { id: 'Other', label: 'Other', description: 'Personalized character profile' },
  { id: 'Prefer not to say', label: 'Prefer not to say', description: 'Private character profile' },
];

const SKILL_ICONS: Record<string, React.ReactNode> = {
  Palette: <Palette className="w-5 h-5 text-pink-400 shrink-0" />,
  PenTool: <PenTool className="w-5 h-5 text-cyan-400 shrink-0" />,
  Flame: <Flame className="w-5 h-5 text-orange-400 shrink-0" />,
  Utensils: <Utensils className="w-5 h-5 text-emerald-400 shrink-0" />,
  Coins: <Coins className="w-5 h-5 text-amber-400 shrink-0" />,
};

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  // 4-Page Flow: 1: Name, 2: Age, 3: Gender, 4: Select 3 Starter Skills
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([
    'drawing',
    'writing',
    'fitness',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input ref to automatically focus inputs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const ageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else if (step === 2) {
      const timer = setTimeout(() => {
        ageInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Android System & Hardware Back Button Navigation
  useBackHandler(
    'onboarding-step-navigation',
    60,
    () => {
      if (step === 4) {
        setStep(3);
        playUISound('tap');
        return true;
      }
      if (step === 3) {
        setStep(2);
        playUISound('tap');
        return true;
      }
      if (step === 2) {
        setStep(1);
        playUISound('tap');
        return true;
      }
      return false;
    },
    step > 1
  );

  // Validation
  const isNameValid = name.trim().length > 0;
  const parsedAge = parseInt(age.trim(), 10);
  const isAgeValid =
    age.trim() !== '' &&
    !isNaN(parsedAge) &&
    /^\d+$/.test(age.trim()) &&
    parsedAge >= 1 &&
    parsedAge <= 120;
  const isGenderValid = Boolean(gender && gender.trim().length > 0);
  const areSkillsValid = selectedSkillIds.length === 3;

  const handleNextFromStep1 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isNameValid) return;
    playUISound('confirm');
    setStep(2);
  };

  const handleNextFromStep2 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAgeValid) return;
    playUISound('confirm');
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    if (!isGenderValid) return;
    playUISound('confirm');
    setStep(4);
  };

  const handleToggleSkill = (skillId: string) => {
    playUISound('tap');
    if (selectedSkillIds.includes(skillId)) {
      setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
    } else if (selectedSkillIds.length < 3) {
      setSelectedSkillIds((prev) => [...prev, skillId]);
    } else {
      // Replace oldest selected to maintain exactly 3
      setSelectedSkillIds((prev) => [...prev.slice(1), skillId]);
    }
  };

  const handleAdjustAge = (delta: number) => {
    playUISound('tap');
    const current = parseInt(age.trim(), 10);
    const base = isNaN(current) ? 25 : current;
    const next = Math.max(1, Math.min(120, base + delta));
    setAge(String(next));
  };

  const handleFinishSetup = async () => {
    if (isSubmitting) return;
    const trimmedName = name.trim();
    if (!trimmedName || !isAgeValid || !isGenderValid || !areSkillsValid) return;

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Create Initial Player Profile in Dexie Store
      await db.player.add({
        name: trimmedName,
        age: parsedAge,
        gender: gender,
        heightCm: 175,
        weightKg: 70,
        preferredUnits: 'metric',
        preferredTheme: 'dark',
        fitnessLevel: 'beginner',
        goals: ['build_muscle', 'mental_health'],
        trainingDaysPerWeek: 4,
        lifeClass: 'Polymath',
        currentChapter: 'The Journey Begins',
        currentQuest: 'Complete Your First Quest',
        currentArc: 'First Arc',
        lifeMotto: 'No Motto Yet',
        level: 1,
        currentXp: 0,
        lifetimeXp: 0,
        highestRewardedLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: todayStr,
        createdAt: new Date().toISOString(),
      });

      // 2. Ensure Initial Chapter exists
      const chaptersCount = await db.chapters.count();
      if (chaptersCount === 0) {
        await db.chapters.add({
          title: 'The Journey Begins',
          subtitle: 'Rebuilding momentum and forging quiet daily habits.',
          startDate: new Date().toISOString(),
          isCurrent: true,
          journalSummary: 'The journey begins with a single quiet step forward.',
        });
      }

      // 3. Ensure Default Routines exist
      const routinesCount = await db.routines.count();
      if (routinesCount === 0) {
        const defaultRoutines = [
          {
            name: 'Morning Power Routine',
            icon: 'Sun',
            xpReward: 50,
            createdAt: todayStr,
            completedToday: false,
            items: [
              { id: 'm1', title: 'Hydrate 500ml Water', durationMins: 2, completedToday: false },
              { id: 'm2', title: '5-Min Sun Light & Breathing', durationMins: 5, completedToday: false },
              { id: 'm3', title: '10-Min Stretch / Mobility', durationMins: 10, completedToday: false },
            ],
          },
          {
            name: 'Evening Wind-Down Routine',
            icon: 'Moon',
            xpReward: 50,
            createdAt: todayStr,
            completedToday: false,
            items: [
              { id: 'e1', title: 'Screen Detox 30m Before Bed', durationMins: 30, completedToday: false },
              { id: 'e2', title: 'Reflect & Journal 3 Wins', durationMins: 5, completedToday: false },
            ],
          },
        ];
        await db.routines.bulkAdd(defaultRoutines);
      }

      // 4. Ensure Default Habits exist
      const habitsCount = await db.habits.count();
      if (habitsCount === 0) {
        const defaultHabits = [
          {
            title: 'Drink 2.5L Water Daily',
            description: 'Keep hydration high for cognitive focus and cellular recovery.',
            category: 'health' as const,
            icon: 'Droplet',
            xpReward: 30,
            targetPerWeek: 7,
            currentStreak: 0,
            completedToday: false,
            createdAt: todayStr,
          },
          {
            title: 'Daily 15-Min Reading / Study',
            description: 'Consistently absorb timeless non-fiction or technical knowledge.',
            category: 'mind' as const,
            icon: 'BookOpen',
            xpReward: 40,
            targetPerWeek: 7,
            currentStreak: 0,
            completedToday: false,
            createdAt: todayStr,
          },
          {
            title: 'Daily Walk 7,000 Steps',
            description: 'Active movement for cardiovascular health and peace of mind.',
            category: 'health' as const,
            icon: 'Footprints',
            xpReward: 40,
            targetPerWeek: 7,
            currentStreak: 0,
            completedToday: false,
            createdAt: todayStr,
          },
        ];
        await db.habits.bulkAdd(defaultHabits);
      }

      // 5. Initialize the 3 selected onboarding skills deterministically
      await selectOnboardingSkills(selectedSkillIds);

      // 6. Establish Initial Deterministic Forge Path if not already present
      const existingForgePath = await db.forgePath.toCollection().first();
      if (!existingForgePath) {
        const selectedDefs = STARTER_SKILLS.filter((s) => selectedSkillIds.includes(s.id));
        await db.forgePath.add({
          name: `${trimmedName}'s Path of Mastery`,
          domain: 'personal_mastery',
          focus: selectedDefs.map((s) => s.name).join(', '),
          description: `Focused discipline in ${selectedDefs.map((s) => s.name).join(', ')}.`,
          skillConcepts: selectedDefs.map((s) => s.name),
          learningObjectives: [
            'Establish daily sharpening habit',
            'Pass weekly skill checks',
            'Forge lasting monuments of progress',
          ],
          goalTracks: selectedDefs.map((s, idx) => ({
            id: `gt_${s.id}`,
            skillId: s.id,
            name: s.name,
            domain: s.domain,
            description: s.description,
            active: true,
            activePriority: idx + 1,
            currentStage: s.currentStage || 1,
            totalStages: s.totalStages || 5,
            stageName: s.stageName || `${s.name} Fundamentals`,
            stagePurpose: s.stagePurpose,
            capabilities: s.capabilities || [],
            concreteActions: s.concreteActions || [],
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      playUISound('success');
      onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding setup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="forge-onboarding-container"
      className="fixed inset-0 z-50 bg-[var(--forge-bg)] text-[var(--forge-text-primary)] flex items-center justify-center p-4 overflow-y-auto font-sans"
    >
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[var(--forge-accent-muted)] rounded-full blur-3xl pointer-events-none" />

      <Card
        id="forge-onboarding-card"
        className="w-full max-w-md bg-[var(--forge-surface)] border border-[var(--forge-border)] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden my-auto rounded-2xl text-[var(--forge-text-primary)]"
      >
        {/* Top Header & Progress: Stable Header Regions */}
        <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-4 min-h-[44px]">
          {/* Left Region: Brand on Step 1, Back Button on Step 2+ */}
          <div className="flex items-center">
            {step === 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-base text-[var(--forge-accent)]">⚒</span>
                <span className="font-serif font-bold text-sm tracking-[0.25em] text-[var(--forge-accent)] uppercase">
                  FORGE
                </span>
              </div>
            ) : (
              <BackButton
                id={`onboarding-back-btn-step-${step}`}
                onClick={() => {
                  playUISound('tap');
                  setStep((prev) => ((prev - 1) as 1 | 2 | 3 | 4));
                }}
                label="Back"
              />
            )}
          </div>

          {/* Right Region: Progress Indicator with consistent alignment across all steps */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs font-semibold text-[var(--forge-text-muted)]">
              {step} / 4
            </span>
            <div className="flex items-center gap-1">
              <div
                className={`h-1 rounded-full transition-all duration-200 ${
                  step >= 1 ? 'w-4 bg-[var(--forge-accent)]' : 'w-2 bg-[var(--forge-border)]'
                }`}
              />
              <div
                className={`h-1 rounded-full transition-all duration-200 ${
                  step >= 2 ? 'w-4 bg-[var(--forge-accent)]' : 'w-2 bg-[var(--forge-border)]'
                }`}
              />
              <div
                className={`h-1 rounded-full transition-all duration-200 ${
                  step >= 3 ? 'w-4 bg-[var(--forge-accent)]' : 'w-2 bg-[var(--forge-border)]'
                }`}
              />
              <div
                className={`h-1 rounded-full transition-all duration-200 ${
                  step === 4 ? 'w-4 bg-[var(--forge-accent)]' : 'w-2 bg-[var(--forge-border)]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Pages */}
        <AnimatePresence mode="wait">
          {/* ================================================== */}
          {/* PAGE 1 — NAME */}
          {/* ================================================== */}
          {step === 1 && (
            <motion.div
              key="onboarding-page-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 text-left"
            >
              <div className="space-y-1.5">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] tracking-wide uppercase">
                  LET'S GET STARTED
                </h1>
                <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)] leading-relaxed">
                  What should Forge call you?
                </p>
              </div>

              <form onSubmit={handleNextFromStep1} className="space-y-6">
                <div>
                  <label
                    htmlFor="onboarding-name-input"
                    className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-secondary)] tracking-wider block mb-2"
                  >
                    Your name
                  </label>
                  <div className="relative">
                    <input
                      ref={nameInputRef}
                      id="onboarding-name-input"
                      type="text"
                      autoFocus
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      maxLength={40}
                      className="w-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-accent)]/50 rounded-xl px-4 py-3.5 text-base text-[var(--forge-text-primary)] placeholder-[var(--forge-text-muted)] outline-none transition-all duration-150"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    id="onboarding-continue-step1-btn"
                    type="submit"
                    variant="gold"
                    size="lg"
                    disabled={!isNameValid}
                    className="w-full min-h-[48px] justify-center text-xs tracking-[0.2em] uppercase font-bold rounded-xl"
                  >
                    <span>CONTINUE →</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ================================================== */}
          {/* PAGE 2 — AGE */}
          {/* ================================================== */}
          {step === 2 && (
            <motion.div
              key="onboarding-page-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 text-left"
            >
              <div className="space-y-1.5">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] tracking-wide uppercase">
                  A LITTLE ABOUT YOU
                </h1>
                <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)] leading-relaxed">
                  How old are you?
                </p>
              </div>

              <form onSubmit={handleNextFromStep2} className="space-y-6">
                <div>
                  <label
                    htmlFor="onboarding-age-input"
                    className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-secondary)] tracking-wider block mb-2"
                  >
                    Your age
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      id="onboarding-age-decrement-btn"
                      onClick={() => handleAdjustAge(-1)}
                      className="w-12 h-12 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:border-[var(--forge-border-accent)] active:scale-95 flex items-center justify-center transition-all cursor-pointer shrink-0"
                      aria-label="Decrease age"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        ref={ageInputRef}
                        id="onboarding-age-input"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={120}
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full text-center bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-accent)]/50 rounded-xl px-4 py-3.5 text-lg font-mono font-bold text-[var(--forge-text-primary)] placeholder-[var(--forge-text-muted)] outline-none transition-all duration-150"
                      />
                    </div>

                    <button
                      type="button"
                      id="onboarding-age-increment-btn"
                      onClick={() => handleAdjustAge(1)}
                      className="w-12 h-12 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:border-[var(--forge-border-accent)] active:scale-95 flex items-center justify-center transition-all cursor-pointer shrink-0"
                      aria-label="Increase age"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {age.trim() !== '' && !isAgeValid && (
                    <p className="text-[11px] text-red-400 mt-2 font-mono">
                      Please enter a valid age between 1 and 120.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    id="onboarding-continue-step2-btn"
                    type="submit"
                    variant="gold"
                    size="lg"
                    disabled={!isAgeValid}
                    className="w-full min-h-[48px] justify-center text-xs tracking-[0.2em] uppercase font-bold rounded-xl"
                  >
                    <span>CONTINUE →</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ================================================== */}
          {/* PAGE 3 — GENDER */}
          {/* ================================================== */}
          {step === 3 && (
            <motion.div
              key="onboarding-page-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6 text-left"
            >
              <div className="space-y-1.5">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--forge-text-primary)] tracking-wide uppercase">
                  TELL US
                </h1>
                <p className="text-xs sm:text-sm text-[var(--forge-text-secondary)] leading-relaxed">
                  How do you identify?
                </p>
              </div>

              {/* Selection cards */}
              <div className="space-y-2.5">
                {GENDER_OPTIONS.map((option) => {
                  const isSelected = gender === option.id;
                  return (
                    <button
                      key={option.id}
                      id={`onboarding-gender-option-${option.id.toLowerCase().replace(/\s+/g, '-')}`}
                      type="button"
                      onClick={() => {
                        playUISound('tap');
                        setGender(option.id);
                      }}
                      className={`w-full min-h-[52px] p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between group active:scale-[0.99] ${
                        isSelected
                          ? 'bg-[var(--forge-accent-muted)] border-[var(--forge-accent)] shadow-[0_0_15px_var(--forge-accent-glow)]'
                          : 'bg-[var(--forge-surface-elevated)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:border-[var(--forge-border-strong)] hover:text-[var(--forge-text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[var(--forge-accent)] bg-[var(--forge-accent)]'
                              : 'border-[var(--forge-border-strong)] bg-transparent group-hover:border-[var(--forge-border-accent)]'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[var(--forge-bg)]" />}
                        </div>
                        <span
                          className={`text-sm tracking-wide ${
                            isSelected
                              ? 'text-[var(--forge-text-primary)] font-bold'
                              : 'text-[var(--forge-text-secondary)] font-medium'
                          }`}
                        >
                          {option.label}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="p-1 rounded-md bg-[var(--forge-accent-muted)] text-[var(--forge-accent)]">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  id="onboarding-continue-step3-btn"
                  variant="gold"
                  size="lg"
                  disabled={!isGenderValid}
                  onClick={handleNextFromStep3}
                  className="w-full min-h-[48px] justify-center text-xs tracking-[0.2em] uppercase font-bold rounded-xl"
                >
                  <span>CONTINUE →</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* ================================================== */}
          {/* PAGE 4 — SELECT 3 STARTER SKILLS */}
          {/* ================================================== */}
          {step === 4 && (
            <motion.div
              key="onboarding-page-4"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-5 text-left"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-[var(--forge-text-primary)] tracking-wide uppercase">
                    CHOOSE 3 SKILLS
                  </h1>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[var(--forge-accent-muted)] text-[var(--forge-accent)] border border-[var(--forge-accent)]/30">
                    {selectedSkillIds.length} / 3 Selected
                  </span>
                </div>
                <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed">
                  Select exactly 3 core disciplines to anchor your daily deliberate practice.
                </p>
              </div>

              {/* Starter Skills Grid / List */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {STARTER_SKILLS.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  const selectedIndex = selectedSkillIds.indexOf(skill.id);
                  const icon = SKILL_ICONS[skill.iconName || 'Palette'] || (
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  );

                  return (
                    <button
                      key={skill.id}
                      id={`onboarding-skill-option-${skill.id}`}
                      type="button"
                      onClick={() => handleToggleSkill(skill.id)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99] ${
                        isSelected
                          ? 'bg-[var(--forge-accent-muted)] border-[var(--forge-accent)] shadow-[0_0_12px_var(--forge-accent-glow)]'
                          : 'bg-[var(--forge-surface-elevated)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:border-[var(--forge-border-strong)] hover:text-[var(--forge-text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-[var(--forge-surface)] border border-[var(--forge-border)] shrink-0">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm tracking-wide truncate ${
                                isSelected
                                  ? 'text-[var(--forge-text-primary)] font-bold'
                                  : 'text-[var(--forge-text-primary)] font-semibold'
                              }`}
                            >
                              {skill.name}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--forge-surface)] shrink-0">
                              {skill.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--forge-text-muted)] line-clamp-1 mt-0.5">
                            {skill.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-[var(--forge-accent)] text-black font-mono text-xs font-black flex items-center justify-center shadow-xs">
                            #{selectedIndex + 1}
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-[var(--forge-border-strong)] group-hover:border-[var(--forge-border-accent)] flex items-center justify-center transition-colors">
                            <Plus className="w-3.5 h-3.5 text-[var(--forge-text-muted)]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button
                  id="onboarding-enter-forge-btn"
                  variant="gold"
                  size="lg"
                  disabled={!areSkillsValid || isSubmitting}
                  onClick={handleFinishSetup}
                  className="w-full min-h-[48px] justify-center text-xs tracking-[0.2em] uppercase font-bold rounded-xl"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-black animate-pulse" />
                      <span>FORGING HERO...</span>
                    </span>
                  ) : !areSkillsValid ? (
                    <span>
                      SELECT {3 - selectedSkillIds.length} MORE SKILL
                      {3 - selectedSkillIds.length === 1 ? '' : 'S'}
                    </span>
                  ) : (
                    <span>ENTER FORGE →</span>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
