export type ForgeSubView = 'home' | 'quests' | 'skills' | 'active-skills' | 'path' | 'character' | 'progression' | 'execution' | 'tutorial-execution';

export interface ForgeTourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  description: string;
  actionHint?: string;
  targetView: ForgeSubView;
  targetSelector: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  targetShape?: 'circle' | 'rect';
  isFinalStep?: boolean;
}

export interface ForgeTourOptions {
  playerLevel?: number;
  hasAvailableNode?: boolean;
  availableNodeTitle?: string;
}

/**
 * Returns the 14-step Forge walkthrough configured dynamically to match the player's
 * actual Forge progression state (e.g. distinguishing whether an available unlockable node exists).
 */
export function getForgeTourSteps(options: ForgeTourOptions = {}): ForgeTourStep[] {
  const hasAvailableNode = options.hasAvailableNode ?? false;

  return [
    // STEP 1 — FORGE HOME HUB
    {
      id: 'forge-home',
      stepNumber: 1,
      totalSteps: 14,
      title: 'Welcome to Forge',
      subtitle: 'Character Progression Hub',
      description:
        'Forge transforms your real-world effort into RPG character progression. Every workout, habit, and completed challenge levels up your character.',
      actionHint: 'Your real-world development hub',
      targetView: 'home',
      targetSelector: '[data-forge-tour="forge-header"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 2 — PLAYER XP
    {
      id: 'player-xp',
      stepNumber: 2,
      totalSteps: 14,
      title: 'Earn Experience (XP)',
      subtitle: 'Overall Character Growth',
      description:
        'Doing actions in real life earns XP. Fill this bar to level up your character and advance your overall standing.',
      actionHint: 'Real actions fill your XP bar',
      targetView: 'home',
      targetSelector: '[data-forge-tour="xp"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 3 — PRACTICE HOURS & MASTERY BANDS
    {
      id: 'practice-hours-bands',
      stepNumber: 3,
      totalSteps: 14,
      title: 'Practice Hours & Mastery Bands',
      subtitle: 'Deliberate Skill Progression',
      description:
        'Real practice time is recorded directly into your Skill Practice Hours. Accumulating hours advances your Forge Mastery Bands, unlocking higher-tier quests and challenges.',
      actionHint: 'Real practice time qualifies your Mastery Bands',
      targetView: 'home',
      targetSelector: '[data-forge-tour="bands"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 4 — QUESTS ROSTER
    {
      id: 'quests-roster',
      stepNumber: 4,
      totalSteps: 14,
      title: 'Real-World Challenges',
      subtitle: 'Active Quests Roster',
      description:
        'These are real-world challenges Forge gives you. Forge keeps up to 6 incomplete quests active across your active skills so you stay focused on immediate daily execution.',
      actionHint: 'Up to 6 active real-world challenges',
      targetView: 'quests',
      targetSelector: '[data-tutorial-target="active-quest-card"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 5 — ACTUAL QUEST CARD ITEM & COMPLETION / START
    {
      id: 'tutorial-quest',
      stepNumber: 5,
      totalSteps: 14,
      title: 'Start a Quest',
      subtitle: 'Turn Intent Into Action',
      description:
        'Tap START QUEST to begin a real-world challenge. Forge moves you into a dedicated execution screen with a timer so the task becomes an active commitment rather than another checkbox.',
      actionHint: 'START QUEST begins the execution timer.',
      targetView: 'quests',
      targetSelector: '[data-forge-tour="start-quest"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 6 — SKILL TREE PROGRESSION
    {
      id: 'skill-tree',
      stepNumber: 6,
      totalSteps: 14,
      title: 'Your Skill Tree',
      subtitle: 'Choose Your Active Skills',
      description:
        'This is where your skills develop. Choose up to 3 active skills to focus your progression. Deeper milestones become available as you accumulate practice time and level up your skills.',
      actionHint: 'Select active skills to explore your progression path.',
      targetView: 'skills',
      targetSelector: '[data-forge-tour="skill-tree-mobile"]',
      placement: 'top',
      targetShape: 'rect',
    },
    // STEP 7 — AVAILABLE NODE OR SKILL TREE STATE-AWARE STEP
    hasAvailableNode
      ? {
          id: 'tutorial-available-node',
          stepNumber: 7,
          totalSteps: 14,
          title: 'Available Skill Milestone',
          subtitle: 'Your Next Milestone',
          description:
            'This milestone is currently available because you have met its level and prerequisite requirements. Tap it to inspect what capabilities it unlocks.',
          actionHint: 'Tap the highlighted skill to inspect it.',
          targetView: 'skills',
          targetSelector: '[data-forge-tour="tutorial-available-node"]',
          placement: 'bottom',
          targetShape: 'circle',
        }
      : {
          id: 'tutorial-available-node',
          stepNumber: 7,
          totalSteps: 14,
          title: 'Your Skill Tree',
          subtitle: 'Developing New Capabilities',
          description:
            'Your Skill Tree contains milestones that become available as your skills develop. Milestones unlock as you gain Skill XP and complete prerequisite achievements.',
          actionHint: "Locked nodes show you what you're working toward.",
          targetView: 'skills',
          targetSelector: '[data-forge-tour="skill-tree-mobile"]',
          placement: 'top',
          targetShape: 'rect',
        },
    // STEP 8 — NODE DETAILS & REQUIREMENTS
    {
      id: 'node-details',
      stepNumber: 8,
      totalSteps: 14,
      title: 'Skill Details & Requirements',
      subtitle: 'Requirements & Perks',
      description:
        'Milestones require reaching specific skill levels and prerequisites. Inspecting a skill shows its requirements and the abilities or quests it unlocks.',
      actionHint: 'Meet requirements to unlock abilities.',
      targetView: 'skills',
      targetSelector: '[data-forge-tour="skill-node-detail"]',
      placement: 'top',
      targetShape: 'rect',
    },
    // STEP 9 — SPECIALIZATION SHAPES PROGRESSION
    {
      id: 'node-gameplay-effect',
      stepNumber: 9,
      totalSteps: 14,
      title: 'Your Specialization Shapes Forge',
      subtitle: 'Skills Influence Your Progression',
      description:
        'Skill Tree choices are not cosmetic. Your investments influence the direction of your character and the types of challenges and opportunities Forge can provide.',
      actionHint: 'Your choices shape future progression.',
      targetView: 'skills',
      targetSelector: '[data-forge-tour="skill-node-detail"]',
      placement: 'top',
      targetShape: 'rect',
    },
    // STEP 10 — CHARACTER & BUILD
    {
      id: 'character-build',
      stepNumber: 10,
      totalSteps: 14,
      title: 'Character & Build',
      subtitle: 'See What You Are Becoming',
      description:
        'This view summarizes the character you are building from your real-world actions and Skill Tree investments. Your specialization choices determine the direction your character develops.',
      actionHint: 'Your build reflects the choices you have made.',
      targetView: 'character',
      targetSelector: '#forge-character-build-view',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 11 — PROGRESSION & MILESTONES
    {
      id: 'progression-hub',
      stepNumber: 11,
      totalSteps: 14,
      title: 'Progression & Milestones',
      subtitle: 'How Far You Have Come',
      description:
        'Progression shows how far you have come. Your XP and level represent your overall development, while your Skill Tree shows the direction you have chosen.',
      actionHint: 'Level = Overall Progress • Skills = Direction',
      targetView: 'progression',
      targetSelector: '#forge-progression-view',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 12 — GUIDED BREATHING
    {
      id: 'guided-breathing',
      stepNumber: 12,
      totalSteps: 14,
      title: 'Guided Breathing Tool',
      subtitle: 'Active Nervous System Reset',
      description:
        'Breathing is a quick real-world tool inside Forge. Open it whenever you want to run a guided breathing session to calm stress or sharpen focus.',
      actionHint: 'Active tool to reset focus and calm your mind',
      targetView: 'home',
      targetSelector: '[data-forge-tour="breathing"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 13 — READY TO FORGE
    {
      id: 'ready-to-forge',
      stepNumber: 13,
      totalSteps: 14,
      title: 'Ready to Forge',
      subtitle: 'Your Progression Awaits',
      description:
        'That is the core loop: Real action → XP & Practice Hours → Forge Bands → Higher-Band Quests → Real action. Now go build yourself through action.',
      actionHint: 'Forge your real-world character',
      targetView: 'home',
      targetSelector: '[data-forge-tour="forge-header"]',
      placement: 'bottom',
      targetShape: 'rect',
    },
    // STEP 14 — CHOOSE YOUR FORGE PATH (FINAL)
    {
      id: 'forge-path',
      stepNumber: 14,
      totalSteps: 14,
      title: 'Choose Your Forge Path',
      subtitle: 'What Are You Becoming?',
      description:
        'Your Forge Path defines the long-term direction you are building toward. It gives Forge a clear understanding of what you are becoming so your quests and progression can adapt around that direction.',
      actionHint: 'Your Forge Path shapes your long-term direction.',
      targetView: 'home',
      targetSelector: '[data-forge-tour="forge-path"]',
      placement: 'bottom',
      targetShape: 'rect',
      isFinalStep: true,
    },
  ];
}

export const FORGE_TOUR_STEPS: ForgeTourStep[] = getForgeTourSteps();
