import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useGame } from '../../context/GameContext';
import { db } from '../../db/database';
import {
  Compass,
  Check,
  Send,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { playUISound } from '../../services/soundManager';
import { ForgePath, ForgePathProposal, ForgePathMutation } from '../../types';
import { applyForgePathUpdate } from '../../services/gameService';

export const PRESET_FORGE_PATHS: (Omit<ForgePath, 'createdAt'> & { presetId: string })[] = [
  {
    presetId: 'artist',
    name: 'Visual Artist & Illustrator',
    description: 'Master anatomical gesture, perspective, value hierarchy, and imaginative composition.',
    domain: 'drawing',
    focus: 'Gesture & Figure Construction',
    skillConcepts: ['Gesture & Rhythm', 'Form & 3D Construction', 'Perspective Grids', 'Anatomy & Head Planes', 'Value & Light'],
    learningObjectives: ['Establish fluid drawing confidence', 'Construct figures from imagination', 'Complete portfolio illustrations'],
    goalTracks: [
      {
        id: 'track_drawing_fundamentals',
        name: 'Figure & Gesture Mastery',
        domain: 'drawing',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Dynamic Gestures & Proportion',
        stagePurpose: 'Build fluid line confidence and proportion intuition under timed constraints.',
        milestoneGoal: 'Draw convincing human gestures under 60 seconds without hesitation.',
        capabilities: ['Rapid gesture capture', 'Line of action', 'Landmark recognition'],
        concreteActions: [
          'Draw 20 One-Minute Gesture Sketches focusing purely on line of action',
          'Complete 5 Three-Minute Structural Poses with ribcage and pelvis orientation',
          'Draw 10 Foreshortened Limbs with overlapping contour cylinders',
        ],
      },
      {
        id: 'track_drawing_perspective',
        name: 'Perspective & Spatial Construction',
        domain: 'drawing',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Volumetric Form Construction',
        stagePurpose: 'Rotate basic 3D solids in space convincingly.',
        milestoneGoal: 'Construct environments and complex props from imagination in correct perspective.',
        capabilities: ['Vanishing points', 'Cylinder rotation', 'Cross-contour lines'],
        concreteActions: [
          'Draw 10 Perspective Boxes with rotating vanishing points',
          'Complete 10 Rotated Cylinder studies with cross-contour ellipses',
          'Construct 3 Simple Everyday Objects from imaginative 2-point perspective',
        ],
      },
    ],
  },
  {
    presetId: 'mountaineer',
    name: 'Mountaineer & Athlete',
    description: 'Develop explosive grip endurance, core body tension, dynamic balance, and physical resilience.',
    domain: 'climbing',
    focus: 'Grip Endurance & Core Power',
    skillConcepts: ['Grip Strength & Hangs', 'Scapular Stability', 'Core Tension & Levers', 'Dynamic Footwork', 'Aerobic Stamina'],
    learningObjectives: ['Attain high power-to-weight control', 'Master advanced climbing routes', 'Sustain intense expeditions'],
    goalTracks: [
      {
        id: 'track_climbing_movement',
        name: 'Bouldering & Movement Economy',
        domain: 'climbing',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Precision Footwork & Center of Mass',
        stagePurpose: 'Eliminate foot slippage and minimize arm fatigue through precise hip placement.',
        milestoneGoal: 'Flash V4-V5 boulder problems with zero regripping and silent foot placements.',
        capabilities: ['Silent feet technique', 'Drop knees', 'Flagging balance'],
        concreteActions: [
          'Execute 3 Boulder Problems using Silent Feet drill (zero hold repositioning)',
          'Complete 4x4 Boulder Circuit on moderate problems with 2-minute rest between sets',
          'Practice 15 Minutes of Sloper and Pinch Body Tension drills on an overhanging wall',
        ],
      },
      {
        id: 'track_climbing_conditioning',
        name: 'Finger Strength & Grip Endurance',
        domain: 'climbing',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Sub-Maximal Hangboard Repeaters',
        stagePurpose: 'Safely adapt finger tendon connective tissue without overloading pulleys.',
        milestoneGoal: 'Hang 120% bodyweight on 20mm edge for 10 seconds with open half-crimp.',
        capabilities: ['Half-crimp stability', 'Open-hand endurance', 'Scapular engagement'],
        concreteActions: [
          'Hangboard Repeaters: 6 reps of 7s hang / 3s rest on 20mm edge at bodyweight',
          'Complete 3 Sets of 5 Strict Scapular Pull-Ups with 3-second hold at the apex',
          'Execute 3 Sets of 10 Finger Roll Curls with light dumbbell for antagonist balance',
        ],
      },
    ],
  },
  {
    presetId: 'scholar',
    name: 'Polymath & Language Scholar',
    description: 'Cultivate deep linguistic fluency, systematic vocabulary retention, and immersion practice.',
    domain: 'japanese',
    focus: 'Core Vocabulary & SRS Drills',
    skillConcepts: ['SRS Vocabulary Retainment', 'Grammar Patterns', 'Listening Comprehension', 'Speaking Practice', 'Reading Text'],
    learningObjectives: ['Attain high-frequency word retention', 'Speak comfortably in conversations', 'Read native literature'],
    goalTracks: [
      {
        id: 'track_japanese_lexicon',
        name: 'Vocabulary & Kanji Acquisition',
        domain: 'japanese',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Foundational 500 Vocabulary & Radicals',
        stagePurpose: 'Establish an automated retrieval loop for high-frequency essential words.',
        milestoneGoal: 'Achieve effortless 1,000 word recognition with 90%+ SRS retention rate.',
        capabilities: ['SRS discipline', 'Kanji radicals', 'Audio-visual association'],
        concreteActions: [
          'Review 25 Anki Flashcards for new Kanji vocabulary with zero backlog',
          'Write 5 Target Vocabulary Words in original sentences using current grammar',
          'Read 1 Short Native Article or Graded Reader page aloud with audio playback',
        ],
      },
      {
        id: 'track_japanese_immersion',
        name: 'Listening Comprehension & Shadowing',
        domain: 'japanese',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Sentence-Level Phonetic Shadowing',
        stagePurpose: 'Train pitch accent perception and real-time auditory decoding.',
        milestoneGoal: 'Comprehend native podcast episodes at 1.0x speed without subtitles.',
        capabilities: ['Shadowing cadence', 'Particles parsing', 'Pitch accent intuition'],
        concreteActions: [
          'Shadow 10 Minutes of Native Audio using exact cadence and intonation',
          'Transcribe 2 Minutes of Native Audio into text and verify against transcript',
          'Record 1 Minute of Free Speech summarizing today’s study session in target language',
        ],
      },
    ],
  },
  {
    presetId: 'builder',
    name: 'Systems Architect & Builder',
    description: 'Design robust algorithmic systems, full-stack software architectures, and creative projects.',
    domain: 'software_engineering',
    focus: 'Core Algorithms & Systems',
    skillConcepts: ['Syntax Foundations', 'Data Structures & Algorithms', 'System Architecture', 'Hands-On Projects', 'Testing & Optimization'],
    learningObjectives: ['Build resilient end-to-end applications', 'Solve complex algorithmic problems', 'Publish production projects'],
    goalTracks: [
      {
        id: 'track_swe_architecture',
        name: 'Full-Stack Architecture & Delivery',
        domain: 'software_engineering',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Modular API & Schema Design',
        stagePurpose: 'Deliver robust type-safe backend services with declarative validations.',
        milestoneGoal: 'Ship production-ready distributed applications with complete automated test coverage.',
        capabilities: ['Schema validation', 'Idempotent endpoints', 'Error boundaries'],
        concreteActions: [
          'Implement 1 RESTful API route with schema validation and descriptive error responses',
          'Write 3 Automated Unit Tests verifying edge-case data inputs for core service logic',
          'Profile and Optimize 1 Database Query or memory-heavy loop in an active project',
        ],
      },
      {
        id: 'track_swe_algorithms',
        name: 'Algorithms & Problem Solving',
        domain: 'software_engineering',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Linear Data Structures & Traversal',
        stagePurpose: 'Master time and space complexity trade-offs in fundamental operations.',
        milestoneGoal: 'Solve medium-hard algorithmic puzzles under 30 minutes with clean explanations.',
        capabilities: ['Big-O complexity', 'Tree traversal', 'Dynamic programming patterns'],
        concreteActions: [
          'Implement Breadth-First Search and Depth-First Search on a custom Graph class',
          'Solve 1 Medium LeetCode algorithm problem without looking at the editorial solution',
          'Refactor 1 Algorithmic Routine to reduce runtime complexity from O(N^2) to O(N log N)',
        ],
      },
    ],
  },
  {
    presetId: 'guardian',
    name: 'Stoic & Mental Fortitude',
    description: 'Eliminate chronic distraction, master breath regulation, and cultivate unshakeable cognitive focus.',
    domain: 'mental_fortitude',
    focus: 'Focused Concentration & Equanimity',
    skillConcepts: ['Sustained Attention & Deep Work', 'Breath Regulation', 'Stoic Cognitive Reframing', 'Deliberate Reading', 'Stress Inoculation'],
    learningObjectives: ['Eliminate mental clutter', 'Maintain composure under pressure', 'Master sustained deep work sessions'],
    goalTracks: [
      {
        id: 'track_mental_concentration',
        name: 'Deep Work & Monotasking Focus',
        domain: 'mental_fortitude',
        currentStage: 1,
        totalStages: 5,
        stageName: 'Single-Task Sprint Foundation',
        stagePurpose: 'Eradicate micro-distractions and context switching during cognitive work.',
        milestoneGoal: 'Sustain uninterrupted 90-minute deep work blocks daily with zero digital interruption.',
        capabilities: ['Attention regulation', 'Stimulus suppression', 'Focus recovery'],
        concreteActions: [
          'Execute a 45-Minute Zero-Phone Monotask Sprint on single hardest intellectual task',
          'Conduct 10-Minute Box Breathing Session (4s inhale / 4s hold / 4s exhale / 4s hold)',
          'Complete Evening Stoic Audit: Write down 3 impulses restrained and 1 area to improve',
        ],
      },
    ],
  },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pathData?: ForgePathProposal;
  readyToApply?: boolean;
  isError?: boolean;
}

interface ForgePathGuideContentProps {
  onApplySuccess?: () => void;
  isModal?: boolean;
}

export const ForgePathGuideContent: React.FC<ForgePathGuideContentProps> = ({
  onApplySuccess,
  isModal = false,
}) => {
  const { player, skills, forgePath, updateForgePath } = useGame();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [habitsList, setHabitsList] = useState<string[]>([]);
  const [destiniesList, setDestiniesList] = useState<string[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isInitialMount = useRef(true);

  // Auto-grow textarea height up to sensible maximum
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }
  }, [inputText]);

  // Load secondary player context asynchronously without blocking UI
  useEffect(() => {
    db.habits
      .toArray()
      .then((items) => setHabitsList(items.map((h) => h.title)))
      .catch(() => {});
    db.destinies
      .toArray()
      .then((items) => setDestiniesList(items.map((d) => d.title)))
      .catch(() => {});
  }, []);

  const buildInitialMessage = (): ChatMessage => {
    if (forgePath && forgePath.name) {
      return {
        id: 'init-1',
        role: 'assistant',
        content: `Welcome back, ${player?.name || 'Seeker'}. Your active Forge Path is **${forgePath.name}** (${forgePath.focus || forgePath.domain || 'Core Disciplines'}).\n\nWhat direction would you like to explore next, or what new craft, discipline, or goal do you want to integrate into your long-term focus?`,
        readyToApply: false,
      };
    }
    return {
      id: 'init-1',
      role: 'assistant',
      content: `Welcome to the Forge, ${player?.name || 'Seeker'}. I am your Forge Path Guide.\n\nTell me what you want your character to become better at, build, or master over the long term — whether that's learning to code, mastering an art, speaking a new language, reaching peak physical strength, or uniting multiple disciplines.`,
      readyToApply: false,
    };
  };

  const FORGE_PATH_CHAT_STORAGE_KEY = 'forge_path_guide_chat_history';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(FORGE_PATH_CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load saved Forge Path Guide chat history:', err);
    }
    return [buildInitialMessage()];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FORGE_PATH_CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed to save Forge Path Guide chat history:', err);
    }
  }, [messages]);

  const handleResetChat = () => {
    playUISound('tap');
    try {
      localStorage.removeItem(FORGE_PATH_CHAT_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to remove chat history:', err);
    }
    setMessages([buildInitialMessage()]);
  };

  // Focus on mount without scrolling page or chat
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll ONLY within the chat container for new messages
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isProcessing]);

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (overrideText ?? inputText).trim();
    if (!textToSend || isProcessing || !player) return;

    playUISound('tap');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    const newHistory = [...messages.filter((m) => !m.isError), userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsProcessing(true);

    const playerContext = {
      name: player.name,
      level: player.level,
      lifeClass: player.lifeClass,
      lifeMotto: player.lifeMotto,
      primaryGoal: player.goals && player.goals.length > 0 ? player.goals[0] : undefined,
      goals: player.goals,
      fitnessLevel: player.fitnessLevel,
      currentSkills: (skills || []).slice(0, 10).map((s) => `${s.name} (Lvl ${s.level || 1})`),
      currentHabits: habitsList,
      activeDestinies: destiniesList,
      currentForgePath: forgePath ? `${forgePath.name} (${forgePath.domain})` : undefined,
    };

    try {
      const response = await fetch('/api/gemini/interpret-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          currentPath: forgePath,
          playerContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const resJson = await response.json();
      const rawData = resJson.data || resJson.pathData;
      const reply = resJson.reply || 'I have evaluated your direction.';
      const isReady = resJson.readyToApply ?? true;

      let synthesized: ForgePathProposal | undefined = undefined;
      if (rawData && isReady) {
        const rawMutation = resJson.mutation || rawData.mutation || 'expand';
        const mutation: ForgePathMutation =
          rawMutation === 'remove_all_skills' || rawMutation === 'remove' || rawMutation === 'replace' || rawMutation === 'expand'
            ? rawMutation
            : 'expand';

        const removeAllSkills = Boolean(
          resJson.removeAllSkills ||
          rawData.removeAllSkills ||
          mutation === 'remove_all_skills'
        );

        const rawProposal: ForgePathProposal = {
          name: rawData.pathName || rawData.name || textToSend,
          description: rawData.description || 'Devote deliberate daily effort to progressive mastery.',
          domain: rawData.domain || 'custom_domain',
          focus: rawData.focus || 'Core Fundamentals',
          skillConcepts: Array.isArray(rawData.skillConcepts) ? rawData.skillConcepts : [],
          learningObjectives: Array.isArray(rawData.learningObjectives) ? rawData.learningObjectives : [],
          reasoning: resJson.reasoning || rawData.reasoning || 'Synthesized as an overarching Life Path aligned with your long-term ambitions.',
          mutation,
          removeAllSkills,
          addedSkillConcepts: resJson.addedSkillConcepts || rawData.addedSkillConcepts || [],
          removedSkillConcepts: resJson.removedSkillConcepts || rawData.removedSkillConcepts || [],
          addedLearningObjectives: resJson.addedLearningObjectives || rawData.addedLearningObjectives || [],
          removedLearningObjectives: resJson.removedLearningObjectives || rawData.removedLearningObjectives || [],
          goalTracks: Array.isArray(rawData.goalTracks) ? rawData.goalTracks : undefined,
          masteryOutcomes: Array.isArray(rawData.masteryOutcomes) ? rawData.masteryOutcomes : undefined,
          questArchetypes: Array.isArray(rawData.questArchetypes) ? rawData.questArchetypes : undefined,
          isCustom: true,
          createdAt: new Date().toISOString(),
        };

        const updated = applyForgePathUpdate(forgePath, {
          mutation,
          removeAllSkills,
          path: rawProposal,
          addedSkillConcepts: rawProposal.addedSkillConcepts,
          removedSkillConcepts: rawProposal.removedSkillConcepts,
          addedLearningObjectives: rawProposal.addedLearningObjectives,
          removedLearningObjectives: rawProposal.removedLearningObjectives,
          goalTracks: rawProposal.goalTracks,
        });

        synthesized = {
          ...updated,
          mutation,
          removeAllSkills,
          addedSkillConcepts: rawProposal.addedSkillConcepts,
          removedSkillConcepts: rawProposal.removedSkillConcepts,
          addedLearningObjectives: rawProposal.addedLearningObjectives,
          removedLearningObjectives: rawProposal.removedLearningObjectives,
        };
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        pathData: synthesized,
        readyToApply: isReady,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playUISound('success');
    } catch (err) {
      console.warn('Forge Path Guide request error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          'The Path Guide encountered a connection issue. Your current Forge Path, skills, and quests remain completely intact.',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismissProposed = (messageId: string) => {
    playUISound('tap');
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, readyToApply: false, pathData: undefined } : m))
    );
  };

  const handleApplyPath = async (pathToApply: ForgePathProposal) => {
    try {
      setIsApplying(true);
      playUISound('confirm');
      await updateForgePath(pathToApply);
      playUISound('success');
      if (onApplySuccess) {
        onApplySuccess();
      }
    } catch (err) {
      console.error('Failed to apply Forge Path:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className={`flex flex-col ${isModal ? 'h-[70dvh] sm:h-[64dvh] max-h-[600px] -my-1 space-y-3' : 'flex-1 min-h-0 space-y-3 sm:space-y-4'}`}>
      {/* Current Forge Path Header */}
      <div data-system-guide="forge-path-overview" className="shrink-0">
        {forgePath && forgePath.name ? (
          <div className="p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] flex items-center justify-between text-xs shrink-0 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] flex items-center justify-center shrink-0 text-[var(--forge-text-accent)]">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-muted)]">
                  Active Forge Path
                </div>
                <div className="font-serif font-bold text-[var(--forge-text-primary)] truncate text-base sm:text-lg">
                  {forgePath.name}
                </div>
                <div className="text-xs text-[var(--forge-text-secondary)] truncate mt-0.5">
                  {forgePath.focus || forgePath.description}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetChat}
              title="Reset conversation"
              aria-label="Reset Forge Path conversation"
              className="forge-pill forge-pill-accent text-[11px] font-mono uppercase shrink-0 font-bold px-2.5 py-1 inline-flex items-center gap-1.5 hover:opacity-80 active:scale-95 transition-all cursor-pointer"
            >
              <span>{forgePath.domain}</span>
              <RotateCcw className="w-3 h-3 opacity-70" />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] flex items-center gap-3.5 text-xs shrink-0 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] flex items-center justify-center shrink-0 text-[var(--forge-text-muted)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-muted)]">
                Active Forge Path
              </div>
              <div className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
                Not Set — Converse with the Path Guide below to define your long-term pursuit.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversational Stream */}
      <div
        ref={chatContainerRef}
        data-system-guide="forge-path-chat"
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3.5 p-4 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--forge-text-muted)] uppercase">
              {msg.role === 'user' ? (
                <span>You</span>
              ) : (
                <span className="text-[var(--forge-text-accent)] font-bold">Forge Path Guide</span>
              )}
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-medium'
                  : msg.isError
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  : 'bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-[var(--forge-text-primary)] shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Path Proposal Preview Card */}
              {msg.pathData && msg.readyToApply && (
                <div className="mt-3 pt-3 border-t border-[var(--forge-border)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-serif font-bold text-sm text-[var(--forge-text-accent)]">
                      Proposed: {msg.pathData.name}
                    </span>
                    {msg.pathData.mutation && (
                      <span className="forge-pill text-[10px] font-mono uppercase bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold">
                        {msg.pathData.mutation}
                      </span>
                    )}
                  </div>

                  {msg.pathData.description && (
                    <p className="text-xs text-[var(--forge-text-secondary)] italic">
                      {msg.pathData.description}
                    </p>
                  )}

                  {/* Core Domains & Skill Concepts */}
                  {msg.pathData.skillConcepts && msg.pathData.skillConcepts.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                        Core Domains & Skill Concepts
                      </span>
                      <ul className="space-y-1">
                        {msg.pathData.skillConcepts.map((concept, i) => (
                          <li key={i} className="text-xs text-[var(--forge-text-primary)] flex items-start gap-2">
                            <span className="text-[var(--forge-text-accent)] mt-0.5">•</span>
                            <span>{concept}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Long-Term Objectives */}
                  {msg.pathData.learningObjectives && msg.pathData.learningObjectives.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                        Long-Term Objectives
                      </span>
                      <ul className="space-y-1">
                        {msg.pathData.learningObjectives.map((obj, i) => (
                          <li key={i} className="text-xs text-[var(--forge-text-primary)] flex items-start gap-2">
                            <span className="text-[var(--forge-text-accent)] mt-0.5">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Curriculum Goal Tracks & Concrete Actions */}
                  {msg.pathData.goalTracks && msg.pathData.goalTracks.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1.5">
                        Curriculum Tracks & Milestone Targets
                      </span>
                      <div className="space-y-2">
                        {msg.pathData.goalTracks.map((track, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-2.5 rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[var(--forge-text-primary)]">
                                {track.name}
                              </span>
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-[var(--forge-text-accent)]">
                                Stage {track.currentStage || 1}: {track.stageName || 'Foundations'}
                              </span>
                            </div>
                            {track.milestoneGoal && (
                              <p className="text-[11px] text-[var(--forge-text-secondary)] italic">
                                Target: {track.milestoneGoal}
                              </p>
                            )}
                            {track.concreteActions && track.concreteActions.length > 0 && (
                              <div className="pt-1 space-y-0.5">
                                <span className="text-[9px] font-mono uppercase text-[var(--forge-text-muted)]">
                                  Actionable Quests:
                                </span>
                                {track.concreteActions.map((act, aIdx) => (
                                  <div key={aIdx} className="text-[11px] text-[var(--forge-text-primary)] flex items-start gap-1.5">
                                    <span className="text-[var(--forge-text-accent)]">•</span>
                                    <span>{act}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Why This Path */}
                  {msg.pathData.reasoning && (
                    <div className="pt-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                        Why This Path
                      </span>
                      <div className="text-xs text-[var(--forge-text-secondary)] bg-[var(--forge-surface-interactive)] p-2.5 rounded-xl border border-[var(--forge-border)] leading-relaxed italic">
                        {msg.pathData.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Refine & Apply */}
                  <div className="pt-2.5 border-t border-[var(--forge-border)] flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissProposed(msg.id)}
                      className="text-xs font-mono uppercase tracking-wider text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)]"
                    >
                      Refine
                    </Button>
                    <Button
                      size="sm"
                      variant="gold"
                      disabled={isApplying}
                      onClick={() => handleApplyPath(msg.pathData!)}
                      className="text-xs font-mono uppercase tracking-wider font-bold shadow-xs"
                    >
                      {isApplying ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      )}
                      Confirm & Apply Path
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border-accent)] text-xs font-mono text-[var(--forge-text-accent)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--forge-text-accent)]" />
            <span>Synthesizing Life Path guidance with the Path Guide...</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Bar */}
      <form
        data-system-guide="forge-path-input"
        onSubmit={handleSendMessage}
        className="flex items-end gap-2 shrink-0"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Tell Forge what you want to become, learn, or master..."
          disabled={isProcessing}
          className="w-full flex-1 bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[var(--forge-text-primary)] placeholder-[var(--forge-text-muted)] focus:outline-hidden font-sans transition-colors shadow-xs whitespace-normal break-words [overflow-wrap:break-word] overflow-x-hidden overflow-y-auto resize-none min-h-[44px] max-h-32 custom-scrollbar"
        />
        <Button
          type="submit"
          variant="gold"
          disabled={!inputText.trim() || isProcessing}
          className="px-4 py-3 rounded-2xl text-xs font-mono uppercase font-bold shrink-0 shadow-xs"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
