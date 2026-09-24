import {
  Skill,
  Quest,
  QuestLog,
  HealthLog,
  UserActiveBuilds,
  PillarId,
  StatId,
  Destiny,
  QuestCategory,
  PlayerProfile,
  DevelopmentDomain,
  QuestLibraryItem,
  ForgePath,
  DailyQuestIntent,
  AIQuestConcept,
  MAX_ACTIVE_QUESTS,
  ForgePathGoalTrack,
} from '../types';
import { PRESET_BUILDS } from '../data/buildsAndSkillsData';
import { getForgeIdentityTag } from './xpService';
import { inferQuestRarity } from './questRarityService';
import { QUEST_LIBRARY } from '../data/questLibrary';
import { getActiveQuestExecution } from './questExecutionService';
import {
  DOMAIN_MAPPINGS,
  getDomainMapping,
  getDomainPillarId,
  getDomainPrimaryStatId,
} from '../data/questDomainMapping';
import {
  getQuestContentKey,
  isSameQuestContent,
  normalizeQuestTitle,
} from './questGenerator';
import {
  findBestSkillNodeForQuest,
  getTargetDifficulty,
  scoreQuestCandidate,
  calculateQuestDifficulty,
  getMaxBandForTier,
  getQuestDifficultyBand,
} from './questDifficultyService';
import { UNIFIED_SKILL_NODES, UnifiedSkillNode } from '../data/unifiedSkillTreeData';
import { getUnlockedSkillNodes } from './unifiedSkillTreeService';
import { isGenericTitle, isConcreteAction } from './questQuality';
import {
  getHighestUnlockedBand,
  assignQuestBand,
  isQuestBandEligible,
} from './masteryBandService';

export interface StageDefinition {
  stageNumber: number; // 1 to 7
  title: string;
  description: string;
  masteryGateRequirement: string;
  sampleQuests: string[];
}

export const SKILL_ROADMAPS: Record<string, StageDefinition[]> = {
  drawing: [
    { stageNumber: 1, title: 'Gesture Drawing & Line Rhythm', description: 'Master fluid gesture lines, 1-minute pose studies, and line confidence.', masteryGateRequirement: 'Complete Gesture Drawing milestone', sampleQuests: ['Draw 20 Gesture Poses in 15 Minutes', '1-Line Contour Gesture Sketch'] },
    { stageNumber: 2, title: 'Form & Volume Construction', description: 'Break down complex figures and objects into primitive 3D shapes.', masteryGateRequirement: 'Complete Construction milestone', sampleQuests: ['Practice 3D Box Construction', 'Mannequin Figure Construction Sketch'] },
    { stageNumber: 3, title: 'Perspective & Horizon Grids', description: 'Horizon lines, 1-point and 2-point perspective box grids.', masteryGateRequirement: 'Complete Perspective milestone', sampleQuests: ['Practice Perspective Boxes & Horizon Grid', 'Perspective Environment Sketch'] },
    { stageNumber: 4, title: 'Anatomy & Proportions', description: 'Loomis head planes, torso mechanics, hand and digit anatomy.', masteryGateRequirement: 'Complete Anatomy milestone', sampleQuests: ['Study Hand & Digit Anatomy', 'Loomis Head Angles & Facial Planes'] },
    { stageNumber: 5, title: 'Lighting, Value & Storytelling', description: 'Chiaroscuro shading, specular highlights, and visual mood.', masteryGateRequirement: 'Complete Lighting milestone', sampleQuests: ['Complete a Value & Light Study', 'Single Light Source Form Shading'] },
    { stageNumber: 6, title: 'Panel Layouts & Storyboarding', description: 'Focal hierarchy, camera angles, and comic panel gutters.', masteryGateRequirement: 'Complete Composition milestone', sampleQuests: ['Thumbnail 3 Comic Panel Layouts', 'Color Palette & Composition Study'] },
    { stageNumber: 7, title: 'Sequential Art & Comic Pages', description: 'Scripting, inking, lettering, and publishing complete story chapters.', masteryGateRequirement: 'Complete Graphic Novel milestone', sampleQuests: ['Draft & Ink 1 Complete Comic Page', 'Publish Original Comic Story Chapter'] },
  ],
  fitness: [
    { stageNumber: 1, title: 'Mobility & Bodyweight Movement', description: 'Core mobility, posture calibration, push-ups, and movement warmups.', masteryGateRequirement: 'Complete Mobility milestone', sampleQuests: ['15-Minute Full-Body Mobility Session', 'Bodyweight Push & Squat Circuit'] },
    { stageNumber: 2, title: 'Form Calibration & Posture', description: 'Core bracing, hip hinge, shoulder packing, and balance.', masteryGateRequirement: 'Complete Core Stability milestone', sampleQuests: ['Core Bracing & Hip Hinge Drill', 'Postural Balance Workout'] },
    { stageNumber: 3, title: 'Compound Movements & Resistance', description: 'Weighted squats, deadlifts, pull-ups, and rows.', masteryGateRequirement: 'Complete Compound Movements milestone', sampleQuests: ['Compound Strength Training Workout', 'Train Grip & Upper Body Strength'] },
    { stageNumber: 4, title: 'Hypertrophy & Workload Capacity', description: 'Progressive overload, time under tension, and volume sets.', masteryGateRequirement: 'Complete Hypertrophy milestone', sampleQuests: ['Progressive Overload Set Session', 'Core & Stabilization Workout'] },
    { stageNumber: 5, title: 'Explosive Power & Plyometrics', description: 'Box jumps, kettlebell swings, and sprint intervals.', masteryGateRequirement: 'Complete Explosive Power milestone', sampleQuests: ['Plyometric Box Jump Session', 'Kettlebell Swing & Power Intervals'] },
    { stageNumber: 6, title: 'Athletic Conditioning & Endurance', description: 'High-volume athletic conditioning and endurance benchmarks.', masteryGateRequirement: 'Complete Athletic Peak milestone', sampleQuests: ['High-Intensity Conditioning Session', '100 Push-Ups & Core Benchmark'] },
    { stageNumber: 7, title: 'Peak Mastery & Resilience', description: 'Peak physical resilience and heavy load capacity.', masteryGateRequirement: 'Complete Peak Strength milestone', sampleQuests: ['Peak Physical Resilience Benchmark Test', 'Heavy Load Capacity Challenge'] },
  ],
  walking: [
    { stageNumber: 1, title: 'Daily Walking & Rhythm', description: 'Establish daily 15-20 min light outdoor walk habit.', masteryGateRequirement: 'Complete 3 Daily Walks', sampleQuests: ['20-Minute Outdoor Aerobic Walk', '15-Minute Sunlight Walk'] },
    { stageNumber: 2, title: 'Incline Walking & Pace Building', description: 'Alternate brisk walking pace with recovery, hill inclines.', masteryGateRequirement: 'Log 5,000 steps session', sampleQuests: ['Practice Incline Walking & Hill Elevation', '30-Minute Tempo Walk'] },
    { stageNumber: 3, title: 'Weighted Hiking & Pack Carrying', description: 'Weighted backpack walks for mountaineering foundation.', masteryGateRequirement: 'Log 3.0 km continuous hike', sampleQuests: ['Complete a Weighted Pack Walk', '30-Minute Continuous Aerobic Trek'] },
    { stageNumber: 4, title: 'Long Distance Trek Conditioning', description: 'Sustained endurance over rough trail terrain.', masteryGateRequirement: 'Log 7,000 steps record', sampleQuests: ['Practice Stair Climbing & Incline Elevation', '5 km Continuous Trail Trek'] },
    { stageNumber: 5, title: 'High Elevation & Altitude Training', description: 'Stair climbs, weighted pack hikes, high elevation conditioning.', masteryGateRequirement: 'Log 5.0 km trail walk', sampleQuests: ['8 km Weighted Pack Hike', 'High Elevation Altitude Simulation'] },
    { stageNumber: 6, title: 'Peak Mountain Ridge Trail', description: 'Extended trail navigation and high volume aerobic stamina.', masteryGateRequirement: 'Log 8.0 km walk', sampleQuests: ['10 km Endurance Mountain Hike', 'Extended Rough Terrain Expedition'] },
    { stageNumber: 7, title: 'Mountain Expedition & Summit Attempt', description: 'Peak physical endurance, multi-hour altitude ascent.', masteryGateRequirement: 'Surpass 10.0 km record', sampleQuests: ['Summit Ridge Expedition Challenge', 'Peak High Elevation Summit Walk'] },
  ],
  reading: [
    { stageNumber: 1, title: 'Daily Reading Habits', description: '10-15 minutes focused reading without digital screens.', masteryGateRequirement: 'Complete 5 reading sessions', sampleQuests: ['Read 15 Pages of Non-Fiction', '10-Minute Morning Reading Focus'] },
    { stageNumber: 2, title: 'Active Notes & Highlighting', description: 'Highlight key arguments and write margin notes.', masteryGateRequirement: 'Highlight & summarize 1 chapter', sampleQuests: ['Read 20 Pages with Active Notes', '1-Page Chapter Summary & Highlights'] },
    { stageNumber: 3, title: 'Deep Chapter Synthesis', description: 'Synthesize chapter concepts and main logical arguments.', masteryGateRequirement: 'Finish 1 book', sampleQuests: ['Read 30 Pages of Technical / Philosophy Book', 'Write 1-Page Chapter Synthesis'] },
    { stageNumber: 4, title: 'Critical Analysis & Review', description: 'Evaluate author claims against real-world evidence.', masteryGateRequirement: 'Write 1 Book Review', sampleQuests: ['Draft Critical Analysis Essay', 'Cross-Check Core Book Claims'] },
    { stageNumber: 5, title: 'Cross-Disciplinary Synthesis', description: 'Connect ideas across multiple books and fields.', masteryGateRequirement: 'Finish 3 books', sampleQuests: ['Synthesize Concepts Across 2 Books', 'Comparative Analysis Essay'] },
    { stageNumber: 6, title: 'Advanced Literature & Research Digest', description: 'Digest complex academic research and foundational classics.', masteryGateRequirement: 'Finish 5 books', sampleQuests: ['Digest Academic Research Paper', 'Deep Classic Literature Review'] },
    { stageNumber: 7, title: 'Published Original Treatise', description: 'Produce original written synthesis or comprehensive guide.', masteryGateRequirement: 'Publish original synthesis', sampleQuests: ['Publish Original Literature Synthesis', 'Complete Master Knowledge Guide'] },
  ],
  faith_meditation: [
    { stageNumber: 1, title: 'Daily Quiet Stillness & Gratitude', description: '5 minutes zero-screen breathwork and reflection.', masteryGateRequirement: 'Log 3 reflection sessions', sampleQuests: ['5-Minute Quiet Stillness & Gratitude', 'Diaphragmatic Breathing Reset'] },
    { stageNumber: 2, title: 'Structured Journaling & Prayer', description: 'Write daily reflections, intentions, and prayers.', masteryGateRequirement: '7-day reflection streak', sampleQuests: ['Structured Reflective Journaling', 'Morning Intentional Reflection'] },
    { stageNumber: 3, title: 'Contemplative Study & Deep Meditation', description: '20 minutes silent contemplation and text study.', masteryGateRequirement: 'Complete 10 meditation sessions', sampleQuests: ['20-Minute Contemplative Meditation', 'Wisdom Text Study & Reflection'] },
    { stageNumber: 4, title: 'Applied Ethics & Character Resilience', description: 'Practice patience, restraint, and kindness under stress.', masteryGateRequirement: 'Log 5 character alignment logs', sampleQuests: ['Practice Mindful Restraint', 'Character Alignment Self-Audit'] },
    { stageNumber: 5, title: 'Community Mentorship & Service', description: 'Support peers, volunteer, lead quiet encouragement.', masteryGateRequirement: 'Complete 3 service actions', sampleQuests: ['Reach Out & Support Peer', 'Community Service Action'] },
    { stageNumber: 6, title: 'Master Mindfulness & Stress Immunity', description: 'Maintain complete inner composure under heavy strain.', masteryGateRequirement: 'Maintain 30-day reflection streak', sampleQuests: ['Deep Fasting & Meditation Reset', 'Equanimity & Stress Resilience Protocol'] },
    { stageNumber: 7, title: 'Lifelong Wisdom & Teaching', description: 'Guide others in developing peace, wisdom, and character.', masteryGateRequirement: 'Unlock Virtuoso rank in Faith', sampleQuests: ['Host Community Mindfulness Session', 'Write Reflection Guide on Character'] },
  ],
  climbing: [
    { stageNumber: 1, title: 'Footwork Precision & Silent Feet', description: 'Toe placement, quiet footwork, low-traversing, and weight transfer over hips.', masteryGateRequirement: 'Complete Silent Feet milestone', sampleQuests: ['Silent Feet Traverse Circuit', '15-Minute Low Traverse Footwork Drill'] },
    { stageNumber: 2, title: 'Body Tension & Hover Technique', description: 'Hover hands, flagging, core tension, and hip-to-wall mechanics.', masteryGateRequirement: 'Complete Body Tension milestone', sampleQuests: ['Hover Hands 2-Second Hold Pauses', 'Flagging & Balance Movement Circuit'] },
    { stageNumber: 3, title: 'Forearm Grip Endurance & Repeaters', description: '7/3 repeaters, open-hand grip conditioning, ARC training on bouldering wall.', masteryGateRequirement: 'Complete Grip Endurance milestone', sampleQuests: ['7/3 Repeaters Hangboard Protocol', 'Grip Endurance ARC Bouldering Block'] },
    { stageNumber: 4, title: 'Power Endurance & Linked Overhangs', description: '4x4 boulder intervals, sustained steep terrain, heel hooks, and drop knees.', masteryGateRequirement: 'Complete Power Endurance milestone', sampleQuests: ['4x4 Boulder Interval Circuit', 'Overhang Heel & Toe Hook Drills'] },
    { stageNumber: 5, title: 'Dynamic Movement & Campus Conditioning', description: 'Deadpoints, dynos, explosive lat engagement, and campus ladder conditioning.', masteryGateRequirement: 'Complete Dynamic Movement milestone', sampleQuests: ['Dyno & Deadpoint Precision Circuit', 'Campus Board Ladder Conditioning'] },
    { stageNumber: 6, title: 'Route Reading & Mental Redpoint Protocol', description: 'Pre-climb route visualization, beta execution, and falling commitment.', masteryGateRequirement: 'Complete Redpoint Project milestone', sampleQuests: ['Route Reading Flash Attempt Protocol', 'Clean Redpoint Attempt on Hard Project'] },
    { stageNumber: 7, title: 'Outdoor Crag Mastery & High-Grade Ascension', description: 'Rock texture adaptation, outdoor crag tactics, and peak project ascents.', masteryGateRequirement: 'Complete Crag Summit milestone', sampleQuests: ['Summit Outdoor Crag Milestone', 'Master Benchmark Bouldering Test'] },
  ],
  storytelling: [
    { stageNumber: 1, title: 'Narrative Micro-Stakes & Character Sparks', description: 'Micro-stories, character desires, and clear turning points in under 500 words.', masteryGateRequirement: 'Complete Micro-Story milestone', sampleQuests: ['500-Word Micro-Story with Clear Turning Point', 'Character Secret & Contradiction Profile'] },
    { stageNumber: 2, title: 'Dialogue Dynamics & Subtext', description: 'Dialogue tension, unspoken agendas, conflict escalation, and distinct character voices.', masteryGateRequirement: 'Complete Dialogue Subtext milestone', sampleQuests: ['Three-Beat Conflict Escalation Dialogue Scene', 'Subtext & Unspoken Motive Dialogue Sprint'] },
    { stageNumber: 3, title: 'Scene Structure & Rising Tension', description: 'Goal, conflict, disaster scene units, stakes escalation, and narrative pacing.', masteryGateRequirement: 'Complete Scene Architecture milestone', sampleQuests: ['Draft a High-Stakes Confrontation Scene', 'Cause-and-Effect Narrative Outline'] },
    { stageNumber: 4, title: 'Sensory Immersion & Setting Texture', description: 'Five-sense world building, atmosphere, visceral prose, and thematic resonance.', masteryGateRequirement: 'Complete Sensory Texture milestone', sampleQuests: ['Visceral Sensory Setting Description', 'Atmospheric Environmental Scene Draft'] },
    { stageNumber: 5, title: 'Pacing & Narrative Climax Engineering', description: 'Midpoint shifts, dark night of the soul, climax orchestration, and resolution.', masteryGateRequirement: 'Complete Narrative Climax milestone', sampleQuests: ['Climax Pacing & Action Sequencing', 'Draft 1,000-Word Climactic Chapter'] },
    { stageNumber: 6, title: 'Multi-Perspective Narrative & Deep Revision', description: 'Reverse-outlining, thematic tightening, structural edits, and character arcs.', masteryGateRequirement: 'Complete Structural Revision milestone', sampleQuests: ['Reverse-Outline and Developmental Edit', 'Dual-Perspective Intersecting Scenes'] },
    { stageNumber: 7, title: 'Finished Masterwork & Publication', description: 'Complete published manuscript, anthologized piece, or produced narrative work.', masteryGateRequirement: 'Complete Master Manuscript milestone', sampleQuests: ['Complete & Polish Full Short Story Manuscript', 'Final Proof & Portfolio Submission'] },
  ],
  mental_fortitude: [
    { stageNumber: 1, title: 'Monotasking & Distraction Resistance', description: '45-minute uninterrupted sprints, tab sanitization, and stimulus reduction.', masteryGateRequirement: 'Complete Monotask Sprint milestone', sampleQuests: ['Zero-Distraction Monotask Sprint', 'Friction Point Breakdown & Avoidance Audit'] },
    { stageNumber: 2, title: 'Cold Reset & Autonomic Regulation', description: 'Physiological sigh protocol, cold exposure, and nervous system regulation.', masteryGateRequirement: 'Complete Autonomic Reset milestone', sampleQuests: ['Cold Reset & Physiological Sigh Protocol', 'Active Friction Exposure & Discomfort Calibration'] },
    { stageNumber: 3, title: 'Extended Deep Work Immersion', description: '90-minute immersion blocks, flow state induction, and resistance threshold expansion.', masteryGateRequirement: 'Complete Deep Work Immersion milestone', sampleQuests: ['90-Minute Uninterrupted Deep Work Session', 'Focus Shield Defense Against Context-Switching'] },
    { stageNumber: 4, title: 'High-Cognitive-Load Execution', description: 'Maintaining executive function under high complexity, fatigue, and friction.', masteryGateRequirement: 'Complete High-Load Execution milestone', sampleQuests: ['High-Friction Analytical Challenge Sprint', 'Deliberate Error Recovery & Composure Test'] },
    { stageNumber: 5, title: 'Stoic Equanimity & Emotional Composure', description: 'Reframing setbacks, emotional non-reactivity, and urge-surfing.', masteryGateRequirement: 'Complete Equanimity milestone', sampleQuests: ['Adversity Reframe & Objective Reflection', 'Urge-Surfing & Impulse Inhabitation Protocol'] },
    { stageNumber: 6, title: 'Sustained Endurance Under Pressure', description: 'Unwavering execution across prolonged high-friction challenges without drop in standards.', masteryGateRequirement: 'Complete Pressure Crucible milestone', sampleQuests: ['Extreme Focus Marathon Protocol', 'Controlled Stress Inoculation Session'] },
    { stageNumber: 7, title: 'Unbreakable Autonomy & Virtuosity', description: 'Complete psychological self-command, effortless discipline, and virtuoso mastery.', masteryGateRequirement: 'Complete Autonomy Horizon milestone', sampleQuests: ['Mastery Horizon Endurance Challenge', 'Full-Day Deep Work & Discipline Crucible'] },
  ],
  writing: [
    { stageNumber: 1, title: 'Daily Flow & Frictionless Drafting', description: 'Overcome the blank page with daily uninterrupted writing sprints.', masteryGateRequirement: 'Complete Daily Writing Sprint milestone', sampleQuests: ['25-Minute Uninterrupted Writing Sprint', 'Draft 300 Words Without Self-Editing'] },
    { stageNumber: 2, title: 'Structural Beat Outlines', description: 'Deconstruct essays and stories into clear beginning, middle, and end beats.', masteryGateRequirement: 'Complete Structural Outline milestone', sampleQuests: ['Draft a 5-Beat Structural Outline', 'Deconstruct a Core Essay Premise'] },
    { stageNumber: 3, title: 'Scene Subtext & Character Conflict', description: 'Dialogue tension, unspoken motives, and sharp argumentative contrast.', masteryGateRequirement: 'Complete Scene Subtext milestone', sampleQuests: ['Dialogue Subtext Exercise', 'Write a Confrontation Scene with Unspoken Stakes'] },
    { stageNumber: 4, title: 'Ruthless Revision & Cadence', description: 'Trim word count by 20% while refining musical rhythm and clarity.', masteryGateRequirement: 'Complete Ruthless Revision milestone', sampleQuests: ['Ruthless 20% Word Cut Challenge', 'Vocal Cadence & Rhythm Polish'] },
    { stageNumber: 5, title: 'Long-Form Exposition & Cohesion', description: 'Maintain argumentative thread across long-form sections.', masteryGateRequirement: 'Complete Long-Form Draft milestone', sampleQuests: ['Draft 1,000-Word Essay Section', 'Transitions & Thematic Thread Polish'] },
    { stageNumber: 6, title: 'Distinctive Style & Personal Voice', description: 'Develop signature rhetorical style, metaphor economy, and voice.', masteryGateRequirement: 'Complete Signature Voice milestone', sampleQuests: ['Stylistic Metaphor Economy Pass', 'Draft Opinion Piece with Distinct Voice'] },
    { stageNumber: 7, title: 'Published Masterwork & Portfolio', description: 'Finalize, polish, and publish a completed essay, chapter, or book.', masteryGateRequirement: 'Complete Published Work milestone', sampleQuests: ['Final Polish of Complete Essay', 'Publish Original Written Piece'] },
  ],
  cooking: [
    { stageNumber: 1, title: 'Knife Safety & Station Prep (Mise en Place)', description: 'Master chef knife pinch grip, workstation sanitation, and vegetable dicing.', masteryGateRequirement: 'Complete Knife Skills milestone', sampleQuests: ['Mise en Place Precision Drill', 'Vegetable Knife Skills Practice'] },
    { stageNumber: 2, title: 'Heat Control & Maillard Searing', description: 'High-heat searing, internal temperature calibration, and crust development.', masteryGateRequirement: 'Complete Pan Searing milestone', sampleQuests: ['Golden Pan Sear Mastery', 'Sheet-Pan High-Heat Roasting'] },
    { stageNumber: 3, title: 'Flavor Balancing & Pan Sauces', description: 'Calibrate acid, salt, fat, and heat; master pan deglazing and reductions.', masteryGateRequirement: 'Complete Flavor Balancing milestone', sampleQuests: ['Pan Sauce Deglazing Technique', 'Balanced Herb & Acid Dressing'] },
    { stageNumber: 4, title: 'Batch Cooking & Nutritional Meal Prep', description: 'Efficient batch cooking systems for balanced high-performance meals.', masteryGateRequirement: 'Complete Meal Prep milestone', sampleQuests: ['60-Minute Batch Prep Session', 'Macro-Optimized Power Bowl'] },
    { stageNumber: 5, title: 'Braising & Slow-Heat Alchemy', description: 'Low and slow braises, collagen breakdown, and deep aromatic complexity.', masteryGateRequirement: 'Complete Slow Braise milestone', sampleQuests: ['Aromatic Dutch Oven Braise', 'Slow-Simmered Bone Broth Extraction'] },
    { stageNumber: 6, title: 'Multi-Course Synchronization', description: 'Timing multiple dishes simultaneously so everything lands hot and fresh.', masteryGateRequirement: 'Complete Multi-Dish Timing milestone', sampleQuests: ['Two-Course Synchronized Dinner', 'Full Feast Staging & Plating'] },
    { stageNumber: 7, title: 'Intuitive Culinary Mastery', description: 'Cook effortlessly without recipes using market-fresh seasonal ingredients.', masteryGateRequirement: 'Complete Intuitive Cooking milestone', sampleQuests: ['Pantry Improvisation Challenge', 'Masterwork Multi-Course Dinner Crafting'] },
  ],
  personal_finance: [
    { stageNumber: 1, title: 'Cash Flow Visibility & Expense Audit', description: 'Log and audit 30 days of transactions to remove financial ambiguity.', masteryGateRequirement: 'Complete Expense Audit milestone', sampleQuests: ['Weekly Transaction Review', 'Audit Recurring Subscriptions'] },
    { stageNumber: 2, title: 'Zero-Based Intentional Budgeting', description: 'Allocate 100% of income before the month begins with clear category guardrails.', masteryGateRequirement: 'Complete Zero-Based Budget milestone', sampleQuests: ['Forward-Looking Monthly Budget', 'Implement 48-Hour Purchase Rule'] },
    { stageNumber: 3, title: 'Starter Emergency Cash Defense', description: 'Establish dedicated liquid emergency reserve of at least 1 month expenses.', masteryGateRequirement: 'Complete Emergency Fund milestone', sampleQuests: ['Emergency Fund Milestone Check', 'Set Up Automated Weekly Savings'] },
    { stageNumber: 4, title: 'High-Interest Debt Eradication & Savings Automation', description: 'Systematize avalanche debt paydown and automate payday investment transfers.', masteryGateRequirement: 'Complete Automated Savings milestone', sampleQuests: ['Debt Paydown Optimization Map', 'Automate Payday Investment Transfers'] },
    { stageNumber: 5, title: 'Index Investing & Asset Allocation', description: 'Broad-market low-cost index allocation, compound interest modeling, and rebalancing.', masteryGateRequirement: 'Complete Index Allocation milestone', sampleQuests: ['Long-Term Asset Allocation Review', 'Compound Growth Projections Audit'] },
    { stageNumber: 6, title: 'Tax-Advantaged Architecture & Net Worth Tracking', description: 'Optimize retirement accounts, HSA/IRA limits, and quarterly net worth tracking.', masteryGateRequirement: 'Complete Net Worth System milestone', sampleQuests: ['Quarterly Net Worth Audit', 'Tax-Advantaged Account Optimization'] },
    { stageNumber: 7, title: 'Long-Term Financial Sovereignty', description: 'Complete generational freedom plan, estate guardrails, and sovereign capital allocation.', masteryGateRequirement: 'Complete Freedom Plan milestone', sampleQuests: ['Comprehensive Financial Independence Roadmap', 'Annual Strategic Portfolio Rebalance'] },
  ],
};

/**
 * Resolves curriculum goal tracks for any Forge Path.
 * If the path already defines goalTracks, returns them.
 * Otherwise, synthesizes goal tracks based on the path's domain, name, and skillConcepts.
 */
export function resolveGoalTracksForForgePath(forgePath?: ForgePath | null): ForgePathGoalTrack[] {
  if (!forgePath) return [];

  if (Array.isArray(forgePath.goalTracks) && forgePath.goalTracks.length > 0) {
    return forgePath.goalTracks.map((gt) => {
      let concreteActions = Array.isArray(gt.concreteActions) ? [...gt.concreteActions] : [];
      let milestoneGoal = gt.milestoneGoal;
      let stageName = gt.stageName;

      if (concreteActions.length === 0 && (gt as any).stages && Array.isArray((gt as any).stages)) {
        const firstStage = (gt as any).stages[0];
        if (firstStage) {
          stageName = stageName || firstStage.title;
          milestoneGoal =
            milestoneGoal ||
            (typeof firstStage.milestone === 'string'
              ? firstStage.milestone
              : firstStage.milestone?.title || firstStage.masteryGateRequirement);

          if (Array.isArray(firstStage.concreteQuests)) {
            firstStage.concreteQuests.forEach((cq: any) => {
              const act = typeof cq === 'string' ? cq : cq.action || cq.title;
              if (act && typeof act === 'string') concreteActions.push(act);
            });
          } else if (Array.isArray(firstStage.sampleQuests)) {
            firstStage.sampleQuests.forEach((sq: any) => {
              const act = typeof sq === 'string' ? sq : sq.action || sq.title;
              if (act && typeof act === 'string') concreteActions.push(act);
            });
          }
        }
      }

      return {
        ...gt,
        concreteActions,
        milestoneGoal,
        stageName: stageName || 'Fundamentals',
      };
    });
  }

  const tracks: ForgePathGoalTrack[] = [];
  const rawConcepts = Array.isArray(forgePath.skillConcepts)
    ? forgePath.skillConcepts.filter((s) => s && typeof s === 'string' && s.trim())
    : [];

  if (rawConcepts.length > 0) {
    const seenNames = new Set<string>();
    rawConcepts.forEach((concept, idx) => {
      const cleanName = concept.trim();
      const lower = cleanName.toLowerCase();
      if (seenNames.has(lower)) return;
      seenNames.add(lower);

      let dom: DevelopmentDomain = 'custom_domain';
      if (lower.includes('comic draw') || lower.includes('draw') || lower.includes('art') || lower.includes('sketch') || lower.includes('illustr')) {
        dom = 'drawing';
      } else if (lower.includes('comic writ') || lower.includes('story') || lower.includes('writ') || lower.includes('author') || lower.includes('narrat') || lower.includes('script')) {
        dom = 'storytelling';
      } else if (lower.includes('climb') || lower.includes('mountaineer') || lower.includes('boulder') || lower.includes('hike')) {
        dom = 'climbing';
      } else if (lower.includes('fit') || lower.includes('workout') || lower.includes('lift') || lower.includes('body') || lower.includes('physic')) {
        dom = 'fitness';
      } else if (lower.includes('mental') || lower.includes('mind') || lower.includes('focus') || lower.includes('discipline') || lower.includes('fortitude') || lower.includes('stoic') || lower.includes('meditat')) {
        dom = 'mental_fortitude';
      } else if (forgePath.domain) {
        dom = forgePath.domain;
      }

      const roadmap = SKILL_ROADMAPS[dom];
      const stage = roadmap ? roadmap[0] : null;
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24);
      tracks.push({
        id: `gt_${slug}`,
        name: cleanName,
        domain: dom,
        description: stage ? stage.description : `Curriculum progression for ${cleanName}.`,
        skillConcepts: [cleanName],
        learningObjectives: forgePath.learningObjectives || [],
        currentStage: 1,
        stageName: stage ? stage.title : 'Fundamentals & Habit Baseline',
        stagePurpose: stage ? stage.description : 'Establish core execution fundamentals',
        capabilities: stage
          ? [stage.title, stage.masteryGateRequirement]
          : [
              `${cleanName} core mechanics & alignment`,
              `${cleanName} precision sequencing & transitions`,
              `${cleanName} technique analysis & self-correction`,
            ],
        concreteActions: stage
          ? stage.sampleQuests
          : [
              `${cleanName} foundational mechanics drill`,
              `${cleanName} technical precision & repetition drill`,
              `${cleanName} half-speed form & alignment audit`,
              `${cleanName} core phrasing & transition sequence`,
            ],
        milestoneGoal: stage ? stage.masteryGateRequirement : 'Complete Stage 1 baseline',
        active: idx < 3,
        activePriority: idx < 3 ? idx + 1 : undefined,
      });
    });

    if (tracks.length > 0) return tracks;
  }

  const text = `${forgePath.name || ''} ${forgePath.domain || ''} ${forgePath.focus || ''} ${(forgePath.skillConcepts || []).join(' ')}`.toLowerCase();

  const domainMatches: DevelopmentDomain[] = [];
  if (text.includes('draw') || text.includes('art') || text.includes('sketch') || text.includes('illustr')) domainMatches.push('drawing');
  if (text.includes('climb') || text.includes('boulder') || text.includes('mountaineer') || text.includes('hike')) domainMatches.push('climbing');
  if (text.includes('story') || text.includes('writ') || text.includes('author') || text.includes('narrat') || text.includes('fiction')) domainMatches.push('storytelling');
  if (text.includes('mental') || text.includes('mind') || text.includes('focus') || text.includes('discipline') || text.includes('fortitude') || text.includes('stoic')) domainMatches.push('mental_fortitude');
  if (text.includes('fit') || text.includes('workout') || text.includes('lift') || text.includes('body')) domainMatches.push('fitness');

  if (domainMatches.length === 0 && forgePath.domain) {
    domainMatches.push(forgePath.domain);
  }

  const uniqueDomains = Array.from(new Set(domainMatches));
  uniqueDomains.forEach((dom) => {
    const roadmap = SKILL_ROADMAPS[dom];
    const stage = roadmap ? roadmap[0] : null;
    tracks.push({
      id: `gt_${dom}`,
      name: dom.charAt(0).toUpperCase() + dom.slice(1).replace(/_/g, ' '),
      domain: dom,
      description: stage ? stage.description : `Curriculum progression for ${dom}.`,
      skillConcepts: forgePath.skillConcepts?.filter((s) => s.toLowerCase().includes(dom)) || [dom],
      learningObjectives: forgePath.learningObjectives || [],
      currentStage: 1,
      stageName: stage ? stage.title : 'Fundamentals & Habit Baseline',
      stagePurpose: stage ? stage.description : 'Establish core execution fundamentals',
      capabilities: stage ? [stage.title, stage.masteryGateRequirement] : ['Core execution mechanics'],
      concreteActions: stage ? stage.sampleQuests : [`Execute 15 minutes of ${dom} deliberate practice`],
      milestoneGoal: stage ? stage.masteryGateRequirement : 'Complete Stage 1 baseline',
    });
  });

  return tracks;
}

export function getSkillRoadmap(skill: Skill): StageDefinition[] {
  const key = Object.keys(SKILL_ROADMAPS).find((k) => skill.id.toLowerCase().includes(k) || skill.name.toLowerCase().includes(k));
  if (key && SKILL_ROADMAPS[key]) {
    return SKILL_ROADMAPS[key];
  }

  const rawName = skill.name || '';
  const cleanName = rawName && !isGenericTitle(rawName) && !rawName.toLowerCase().includes('personal pursuit')
    ? rawName
    : 'Core Craft';

  return [
    { stageNumber: 1, title: 'Fundamentals & Habit Baseline', description: 'Daily practice baseline.', masteryGateRequirement: 'Tier 1 Milestone', sampleQuests: [`${cleanName} 20-Min Fundamentals Drill`] },
    { stageNumber: 2, title: 'Technique & Form Calibration', description: 'Refine execution and mechanics.', masteryGateRequirement: 'Tier 2 Milestone', sampleQuests: [`${cleanName} Mechanical Precision Practice`] },
    { stageNumber: 3, title: 'Intermediate Application', description: 'Sustained effort and volume.', masteryGateRequirement: 'Tier 3 Milestone', sampleQuests: [`${cleanName} 30-Min Focused Session`] },
    { stageNumber: 4, title: 'Advanced Methodologies', description: 'Complex exercises and problem solving.', masteryGateRequirement: 'Tier 4 Milestone', sampleQuests: [`${cleanName} Structured Challenge`] },
    { stageNumber: 5, title: 'Specialized Mastery', description: 'High precision and speed.', masteryGateRequirement: 'Tier 5 Milestone', sampleQuests: [`${cleanName} Precision Sprint`] },
    { stageNumber: 6, title: 'Performance Peak', description: 'Full-spectrum skill integration.', masteryGateRequirement: 'Tier 6 Milestone', sampleQuests: [`${cleanName} Milestone Project`] },
    { stageNumber: 7, title: 'Mastery & Innovation', description: 'Create original works and mentor.', masteryGateRequirement: 'Tier 7 Milestone', sampleQuests: [`${cleanName} Capstone Artifact`] },
  ];
}

export function calculateSkillAPE(
  skill: Skill,
  recentLogs: QuestLog[] = [],
  recovery?: any
): {
  xp: number;
  consistency: number;
  mastery: number;
  capacity: number;
  confidence: number;
  currentStage: number;
  stageName: string;
} {
  const roadmap = getSkillRoadmap(skill);
  const totalMilestones = skill.milestones?.length || 1;
  const completedMilestones = skill.milestones?.filter((m) => m.completed).length || 0;

  const xp = skill.lifetimeXp || skill.currentXp || 0;

  let currentStage = 1;
  const milestoneRatio = completedMilestones / totalMilestones;
  currentStage = Math.max(1, Math.min(7, Math.ceil(milestoneRatio * 7) || Math.min(7, Math.ceil(skill.level / 4)) || 1));

  const stageDef = roadmap.find((s) => s.stageNumber === currentStage) || roadmap[0];
  const stageName = stageDef.title;
  const mastery = Math.min(100, Math.round(milestoneRatio * 80 + (currentStage / 7) * 20));

  const skillLogs = recentLogs.filter((l) => l.skillId === skill.id || l.questTitle.toLowerCase().includes(skill.name.toLowerCase()));
  const totalSkillCompletions = skillLogs.length;

  let daysSinceLast = 0;
  if (skillLogs.length > 0) {
    const lastDate = new Date(skillLogs[0].completedAt).getTime();
    const now = new Date().getTime();
    daysSinceLast = Math.max(0, Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)));
  } else {
    daysSinceLast = 3;
  }

  let consistency = Math.max(20, Math.min(100, 80 + totalSkillCompletions * 5 - daysSinceLast * 4));
  let capacity = (skill as any).capacity || 50.0;
  capacity += totalSkillCompletions * 1.5;
  if (daysSinceLast > 3) {
    capacity -= (daysSinceLast - 3) * 1.0;
  }
  capacity = Math.max(10.0, Math.min(100.0, capacity));

  let confidence = (skill as any).confidence || Math.min(100, 50 + totalSkillCompletions * 4 + (skill.level * 3));
  if (daysSinceLast > 5) {
    confidence = Math.max(30, confidence - (daysSinceLast - 5) * 2);
  }

  let calculatedMastery = mastery;
  if (totalSkillCompletions === 0 && completedMilestones === 0 && xp === 0 && skill.level === 1) {
    consistency = 0;
    calculatedMastery = 0;
    capacity = 0;
    confidence = 0;
  }

  return {
    xp,
    consistency: Math.round(consistency),
    mastery: calculatedMastery,
    capacity: Math.round(capacity * 10) / 10,
    confidence: Math.round(confidence),
    currentStage,
    stageName,
  };
}

export interface APEQuestGenParams {
  activeBuilds: UserActiveBuilds;
  skills: Skill[];
  existingQuests: Quest[];
  recovery?: any;
  healthLog?: HealthLog | null;
  questLogs?: QuestLog[];
  destinies?: Destiny[];
  activeProjectTitle?: string;
  recentChronicleTitles?: string[];
  player?: PlayerProfile;
  weeklyFocus?: string;
  currentFocus?: string;
  seed?: number;
  forgePath?: ForgePath;
  dailyIntent?: DailyQuestIntent;
  aiQuestConcepts?: AIQuestConcept[];
  forceRefresh?: boolean;
}

/**
 * Authoritatively parses a quest's estimated duration into integer minutes.
 * Handles single minutes ('10 mins', '5m'), ranges ('15-20 mins' -> 20, upper bound),
 * hours ('1.5 hours' -> 90), and development tiers.
 */
export function parseQuestDurationMinutes(input?: QuestLibraryItem | Quest | Partial<Quest> | string | null): number {
  if (!input) return 20;
  const durStr = typeof input === 'string' ? input : (input as any).estimatedDuration;
  if (durStr) {
    const text = String(durStr).toLowerCase().trim();
    const hourMatch = text.match(/([\d.]+)\s*(?:hour|hr|hrs|hours)/);
    if (hourMatch) {
      const hours = parseFloat(hourMatch[1]);
      if (!isNaN(hours) && hours > 0) return Math.round(hours * 60);
    }
    const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)\s*(?:min|mins|minutes|m\b)?/);
    if (rangeMatch) {
      const upper = parseInt(rangeMatch[2], 10);
      const lower = parseInt(rangeMatch[1], 10);
      if (!isNaN(upper) && upper > 0) return upper;
      if (!isNaN(lower) && lower > 0) return lower;
    }
    const minMatch = text.match(/(\d+)\s*(?:min|mins|minutes|m\b)/);
    if (minMatch) {
      const mins = parseInt(minMatch[1], 10);
      if (!isNaN(mins) && mins > 0) return mins;
    }
    if (text.includes('60+')) return 75;
  }
  const tier = typeof input === 'object' && input ? ((input as any).developmentTier || 2) : 2;
  return tier === 1 ? 15 : tier === 2 ? 25 : tier === 3 ? 35 : tier === 4 ? 50 : 70;
}

export interface ScoredCandidate {
  item: QuestLibraryItem;
  variation: {
    title: string;
    description: string;
    reason: string;
    estimatedDuration: string;
  };
  duration: number;
  score: number;
  pillarId: PillarId;
  domain: DevelopmentDomain;
}

/**
 * Selects the highest quality, most relevant combination of daily quests that strictly
 * fits within the specified time budget (budgetMinutes).
 */
export function findBestDailyCombination(
  candidates: ScoredCandidate[],
  maxSlots: number,
  budgetMinutes: number
): ScoredCandidate[] {
  if (candidates.length === 0 || maxSlots <= 0 || budgetMinutes <= 0) return [];

  // Filter candidates that alone exceed budget
  let validCandidates = candidates.filter((c) => c.duration <= budgetMinutes);
  if (validCandidates.length === 0) {
    // If no single candidate fits within budget, pick the single shortest candidate with highest score
    const shortest = [...candidates].sort((a, b) => a.duration - b.duration || b.score - a.score)[0];
    return shortest ? [shortest] : [];
  }

  // Sort by score descending
  validCandidates.sort((a, b) => b.score - a.score);

  // Take top 30 candidates for evaluation
  const pool = validCandidates.slice(0, 30);

  let bestCombination: ScoredCandidate[] = [];
  let bestFitness = -Infinity;

  function evaluate(combo: ScoredCandidate[]): number {
    const totalScore = combo.reduce((sum, c) => sum + c.score, 0);
    const totalDuration = combo.reduce((sum, c) => sum + c.duration, 0);
    const uniquePillars = new Set(combo.map((c) => c.pillarId)).size;
    const pillarBonus = (uniquePillars - 1) * 15;
    const utilizationBonus = Math.round((totalDuration / budgetMinutes) * 15);
    return totalScore + pillarBonus + utilizationBonus;
  }

  function search(startIndex: number, currentCombo: ScoredCandidate[], currentDuration: number) {
    if (currentCombo.length > 0) {
      const fitness = evaluate(currentCombo);
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestCombination = [...currentCombo];
      }
    }

    if (currentCombo.length >= maxSlots) return;

    for (let i = startIndex; i < pool.length; i++) {
      const cand = pool[i];
      if (currentDuration + cand.duration > budgetMinutes) continue;
      // Prevent duplicate content
      if (currentCombo.some((c) => isSameQuestContent(c.item, cand.item))) continue;

      search(i + 1, [...currentCombo, cand], currentDuration + cand.duration);
    }
  }

  search(0, [], 0);

  return bestCombination;
}

/**
 * Synthesizes dynamic QuestLibraryItems for custom ForgePaths and custom skills.
 * Provides rich candidates across Main, Side, Weekly, and Epic Landmark categories,
 * fully mapped to the player's skillConcepts and learningObjectives.
 */
export function synthesizeCustomDomainLibraryItems(
  forgePath?: ForgePath,
  skills: Skill[] = []
): QuestLibraryItem[] {
  if (!forgePath && skills.length === 0) return [];
  const domain = forgePath?.domain || 'custom_domain';
  const mapping = getDomainMapping(domain);
  const pathTitle = forgePath?.name && !forgePath.name.toLowerCase().includes('personal pursuit')
    ? forgePath.name
    : (domain.charAt(0).toUpperCase() + domain.slice(1).replace(/_/g, ' '));
  const pathFocus = forgePath?.focus || '';
  const pathDesc = forgePath?.description || '';

  const items: QuestLibraryItem[] = [];

  // Derive concrete curriculum quests from resolved goal tracks so fallback quests are authentic and actionable
  const resolvedGoalTracks = resolveGoalTracksForForgePath(forgePath);
  resolvedGoalTracks.forEach((gt) => {
    const trackDomain = gt.domain || domain;
    const trackMapping = getDomainMapping(trackDomain);
    const matchingSkill = skills.find(
      (s) =>
        (gt.skillId && s.id === gt.skillId) ||
        (s.goalTrackId && s.goalTrackId === gt.id) ||
        (s.name && gt.name && s.name.toLowerCase().trim() === gt.name.toLowerCase().trim())
    );
    const resolvedSkillId = matchingSkill?.id || gt.skillId;
    const currentStage = Math.max(1, Math.min(6, gt.currentStage || 1)) as 1 | 2 | 3 | 4 | 5 | 6;

    if (Array.isArray(gt.concreteActions) && gt.concreteActions.length > 0) {
      gt.concreteActions.forEach((actionText, aIdx) => {
        if (!actionText || typeof actionText !== 'string' || !actionText.trim()) return;
        const trimmedAction = actionText.trim();
        if (isGenericTitle(trimmedAction)) return;

        const actSlug = trimmedAction.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25);
        items.push({
          id: `lib_${trackDomain}_track_${gt.id}_act_${aIdx}_${actSlug}`,
          conceptId: `${trackDomain}.curriculum.${gt.id}.${actSlug}`,
          variationFamily: `${trackDomain}_curriculum_${gt.id}`,
          title: trimmedAction,
          description: `Execute curriculum action: ${trimmedAction}. Targets Stage ${gt.currentStage || 1} capability (${gt.stageName || 'Foundations'}).`,
          reason: `Progresses ${gt.name} toward ${gt.milestoneGoal || gt.stagePurpose || 'Stage mastery'}.`,
          domain: trackDomain,
          pillarId: trackMapping.pillarId,
          primaryStatId: trackMapping.primaryStatId,
          category: aIdx === 0 ? 'main' : 'side',
          allowedCategories: ['main', 'side', 'weekly'],
          difficulty: gt.currentStage === 1 ? 'easy' : 'moderate',
          rarity: gt.currentStage === 1 ? 'common' : 'uncommon',
          estimatedDuration: aIdx === 0 ? '20-25 mins' : '15-20 mins',
          xpReward: 40 + (gt.currentStage || 1) * 10,
          tags: [trackDomain, 'curriculum', 'concrete_action', ...(gt.capabilities || []), ...trackMapping.relatedSkillKeywords],
          skillFocus: gt.stageName || gt.name,
          cooldownDays: 1,
          developmentTier: gt.currentStage || 1,
          intensity: 'medium',
          cognitiveLoad: 'medium',
          questType: aIdx === 0 ? 'drill' : 'fundamentals',
          action: trimmedAction,
          completionCriteria: `Complete ${trimmedAction} with deliberate form and precision`,
          masteryOutcome: gt.milestoneGoal || gt.stagePurpose,
          progressionStage: gt.currentStage === 1 ? 'beginner' : gt.currentStage <= 3 ? 'intermediate' : 'advanced',
          goalTrackId: gt.id,
          skillId: resolvedSkillId,
          questBand: currentStage,
          band: currentStage,
          contentOrigin: 'curriculum_roadmap',
        });
      });
    }

    if (gt.milestoneGoal && typeof gt.milestoneGoal === 'string' && gt.milestoneGoal.trim()) {
      const milestoneText = gt.milestoneGoal.trim();
      if (!isGenericTitle(milestoneText)) {
        const mSlug = milestoneText.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25);
        items.push({
          id: `lib_${trackDomain}_track_${gt.id}_milestone_${mSlug}`,
          conceptId: `${trackDomain}.milestone.${gt.id}.${mSlug}`,
          variationFamily: `${trackDomain}_milestone_${gt.id}`,
          title: milestoneText,
          description: `Milestone objective for ${gt.name}: ${milestoneText}. Consolidate Stage ${gt.currentStage || 1} capability into a verified result.`,
          reason: `Milestone progression marker for ${pathTitle}.`,
          domain: trackDomain,
          pillarId: trackMapping.pillarId,
          primaryStatId: trackMapping.primaryStatId,
          category: 'weekly',
          allowedCategories: ['weekly', 'epic'],
          difficulty: 'challenging',
          rarity: 'rare',
          estimatedDuration: '45-60 mins',
          xpReward: 120 + (gt.currentStage || 1) * 15,
          tags: [trackDomain, 'milestone', 'curriculum', ...trackMapping.relatedSkillKeywords],
          skillFocus: gt.stageName || gt.name,
          cooldownDays: 5,
          developmentTier: gt.currentStage || 1,
          intensity: gt.currentStage === 1 ? 'medium' : 'high',
          cognitiveLoad: gt.currentStage === 1 ? 'medium' : 'high',
          questType: 'assessment',
          action: milestoneText,
          completionCriteria: `Achieve and document completion of ${milestoneText}`,
          masteryOutcome: milestoneText,
          progressionStage: gt.currentStage === 1 ? 'beginner' : gt.currentStage <= 3 ? 'intermediate' : 'advanced',
          goalTrackId: gt.id,
          skillId: resolvedSkillId,
          questBand: currentStage,
          band: currentStage,
          contentOrigin: 'curriculum_roadmap',
        });
      }
    }
  });

  // Ensure each skill in skills has authentic curriculum candidates if goal tracks provided fewer than 4 items
  skills.forEach((skill) => {
    const sId = skill.id;
    const sName = skill.name || 'Skill';
    const sDomain = (skill.domain || sName.toLowerCase().replace(/[^a-z0-9_]+/g, '_')).slice(0, 30);
    const trackMapping = getDomainMapping(sDomain);
    const skillStage = Math.max(1, Math.min(6, skill.currentStage || 1)) as 1 | 2 | 3 | 4 | 5 | 6;

    const existingCount = items.filter((it) => it.skillId === sId).length;
    if (existingCount >= 14) return;

    // Concrete actions on skill object
    if (Array.isArray(skill.concreteActions) && skill.concreteActions.length > 0) {
      skill.concreteActions.forEach((act, aIdx) => {
        if (typeof act === 'string' && act.trim() && !isGenericTitle(act)) {
          const trimmed = act.trim();
          const actSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25);
          items.push({
            id: `lib_${sDomain}_skill_${sId}_act_${aIdx}_${actSlug}`,
            conceptId: `${sDomain}.skill.${sId}.${actSlug}`,
            variationFamily: `${sDomain}_skill_${sId}`,
            title: trimmed,
            description: `Execute curriculum task for ${sName}: ${trimmed}. Focus on foundational mechanics and consistency.`,
            reason: `Directly targets ${sName} foundational practice in your path.`,
            domain: sDomain,
            pillarId: trackMapping.pillarId,
            primaryStatId: trackMapping.primaryStatId,
            category: aIdx === 0 ? 'main' : 'side',
            allowedCategories: ['main', 'side', 'weekly'],
            difficulty: skillStage === 1 ? 'easy' : 'moderate',
            rarity: skillStage === 1 ? 'common' : 'uncommon',
            estimatedDuration: aIdx === 0 ? '20-25 mins' : '15-20 mins',
            xpReward: 40 + skillStage * 10,
            tags: [sDomain, 'curriculum', 'concrete_action', sName],
            skillFocus: sName,
            cooldownDays: 1,
            developmentTier: skillStage,
            intensity: 'medium',
            cognitiveLoad: 'medium',
            questType: aIdx === 0 ? 'drill' : 'fundamentals',
            action: trimmed,
            completionCriteria: `Complete ${trimmed} with deliberate precision and focus`,
            masteryOutcome: skill.milestoneGoal || `Master ${sName} core capability`,
            progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
            goalTrackId: skill.goalTrackId,
            skillId: sId,
            questBand: skillStage,
            band: skillStage,
            contentOrigin: 'curriculum_roadmap',
          });
        }
      });
    }

    // Capabilities on skill object
    const caps = Array.isArray(skill.capabilities) ? skill.capabilities : [];
    caps.slice(0, 3).forEach((cap, cIdx) => {
      if (typeof cap === 'string' && cap.trim()) {
        const trimmedCap = cap.trim();
        const capSlug = trimmedCap.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25);
        items.push({
          id: `lib_${sDomain}_skill_${sId}_cap_${cIdx}_${capSlug}`,
          conceptId: `${sDomain}.skill.${sId}.${capSlug}`,
          variationFamily: `${sDomain}_skill_${sId}`,
          title: `${sName}: ${trimmedCap} Form & Precision`,
          description: `Isolate and drill ${trimmedCap} in ${sName}. Focus on consistent execution and technical mechanics.`,
          reason: `Develops core ${trimmedCap} capability in ${sName}.`,
          domain: sDomain,
          pillarId: trackMapping.pillarId,
          primaryStatId: trackMapping.primaryStatId,
          category: 'side',
          allowedCategories: ['main', 'side', 'weekly'],
          difficulty: skillStage === 1 ? 'easy' : 'moderate',
          rarity: skillStage === 1 ? 'common' : 'uncommon',
          estimatedDuration: '20-25 mins',
          xpReward: 45 + skillStage * 10,
          tags: [sDomain, 'curriculum', 'capability', sName],
          skillFocus: sName,
          cooldownDays: 1,
          developmentTier: skillStage,
          intensity: 'medium',
          cognitiveLoad: 'medium',
          questType: 'drill',
          action: `Drill ${trimmedCap} in ${sName} for 20 minutes focusing on form and mechanics`,
          completionCriteria: `20 minutes of deliberate ${trimmedCap} practice completed with form notes`,
          masteryOutcome: `Execute ${trimmedCap} with technical precision`,
          progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
          goalTrackId: skill.goalTrackId,
          skillId: sId,
          questBand: skillStage,
          band: skillStage,
          contentOrigin: 'curriculum_roadmap',
        });
      }
    });

    // Foundational Mechanics Drill
    items.push({
      id: `lib_${sDomain}_skill_${sId}_mechanics`,
      conceptId: `${sDomain}.skill.${sId}.mechanics`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Foundational Mechanics Drill`,
      description: `Execute 20 minutes of deliberate fundamental practice isolating core technical form and basic mechanics in ${sName}.`,
      reason: `Reinforces foundational mechanics and automaticity in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'main',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: skillStage === 1 ? 'easy' : 'moderate',
      rarity: 'common',
      estimatedDuration: '20 mins',
      xpReward: 50 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'mechanics', sName],
      skillFocus: sName,
      cooldownDays: 1,
      developmentTier: skillStage,
      intensity: 'medium',
      cognitiveLoad: 'medium',
      questType: 'fundamentals',
      action: `Practice 20 minutes of foundational technique in ${sName} with deliberate focus`,
      completionCriteria: `20 continuous minutes logged with strict adherence to foundational technique`,
      masteryOutcome: `Execute core fundamental mechanics in ${sName} with consistency`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // 25-Minute Structured Focus Session
    items.push({
      id: `lib_${sDomain}_skill_${sId}_focus`,
      conceptId: `${sDomain}.skill.${sId}.focus`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} 25-Minute Structured Focus Session`,
      description: `Set a 25-minute timer and engage in uninterrupted, single-task deliberate practice on your current ${sName} study or exercise.`,
      reason: `Builds steady practice habits and cognitive endurance in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: skillStage === 1 ? 'easy' : 'moderate',
      rarity: 'common',
      estimatedDuration: '25 mins',
      xpReward: 55 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'focus', sName],
      skillFocus: sName,
      cooldownDays: 1,
      developmentTier: skillStage,
      intensity: 'medium',
      cognitiveLoad: 'medium',
      questType: 'drill',
      action: `Execute 25 minutes of continuous deliberate practice in ${sName} with all distractions silenced`,
      completionCriteria: `25 minutes completed with verified focus notes or tangible execution logged`,
      masteryOutcome: `Develop sustained deliberate focus in ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Core Technique Analysis & Form Review
    items.push({
      id: `lib_${sDomain}_skill_${sId}_technique_review`,
      conceptId: `${sDomain}.skill.${sId}.technique_review`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Core Technique Analysis & Form Review`,
      description: `Analyze your execution of a key technique or concept in ${sName}. Document 2 specific areas for refinement and drill the correction 10 times.`,
      reason: `Cultivates critical self-correction and technical precision in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: 'easy',
      rarity: 'common',
      estimatedDuration: '15 mins',
      xpReward: 40 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'technique', sName],
      skillFocus: sName,
      cooldownDays: 1,
      developmentTier: skillStage,
      intensity: 'low',
      cognitiveLoad: 'medium',
      questType: 'technique',
      action: `Analyze key ${sName} technique, log 2 refinement points, and execute 10 corrective reps`,
      completionCriteria: `Written self-critique recorded with 10 deliberate corrective repetitions performed`,
      masteryOutcome: `Accurately self-assess and refine technique in ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Stage Applied Execution Sprint
    items.push({
      id: `lib_${sDomain}_skill_${sId}_applied_sprint`,
      conceptId: `${sDomain}.skill.${sId}.applied_sprint`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Stage ${skillStage} Applied Execution Sprint`,
      description: `Execute 30 minutes of applied production and active execution in ${sName}, applying your stage competencies to direct practice.`,
      reason: `Bridges technical drills to authentic application in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: 'moderate',
      rarity: 'uncommon',
      estimatedDuration: '30 mins',
      xpReward: 60 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'applied', sName],
      skillFocus: sName,
      cooldownDays: 2,
      developmentTier: skillStage,
      intensity: 'medium',
      cognitiveLoad: 'medium',
      questType: 'application',
      action: `Execute 30 minutes of applied production in ${sName} toward core competence`,
      completionCriteria: `30 continuous minutes completed with demonstrable output logged`,
      masteryOutcome: `Apply ${sName} fundamentals to real production scenarios`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Technical Precision & Repetition Drill
    items.push({
      id: `lib_${sDomain}_skill_${sId}_precision_drill`,
      conceptId: `${sDomain}.skill.${sId}.precision_drill`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Technical Precision & Repetition Drill`,
      description: `Perform 3 sets of 10 clean mechanical repetitions isolating the primary technical movement in ${sName} with zero rushed reps.`,
      reason: `Builds muscle memory and mechanical consistency in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: skillStage === 1 ? 'easy' : 'moderate',
      rarity: 'common',
      estimatedDuration: '20 mins',
      xpReward: 45 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'precision', sName],
      skillFocus: sName,
      cooldownDays: 1,
      developmentTier: skillStage,
      intensity: 'medium',
      cognitiveLoad: 'medium',
      questType: 'drill',
      action: `Complete 3 sets of 10 precision repetitions of primary ${sName} mechanics`,
      completionCriteria: `3 full sets logged with strict form and zero tension`,
      masteryOutcome: `Develop technical precision and consistency in ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Half-Speed Form & Alignment Audit
    items.push({
      id: `lib_${sDomain}_skill_${sId}_half_speed_audit`,
      conceptId: `${sDomain}.skill.${sId}.half_speed_audit`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Half-Speed Form & Alignment Audit`,
      description: `Execute key movement patterns or routines in ${sName} at half-speed, auditing and correcting micro-errors in form, tension, and balance.`,
      reason: `Removes parasitic tension and detects hidden execution flaws in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: 'easy',
      rarity: 'common',
      estimatedDuration: '15 mins',
      xpReward: 40 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'audit', sName],
      skillFocus: sName,
      cooldownDays: 1,
      developmentTier: skillStage,
      intensity: 'low',
      cognitiveLoad: 'medium',
      questType: 'technique',
      action: `Execute 15 minutes of slow-motion / half-speed technique audit in ${sName}`,
      completionCriteria: `15 minutes completed with 2 specific form corrections noted and applied`,
      masteryOutcome: `Cultivate bodily awareness and posture self-correction in ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Core Phrasing & Transition Sequence
    items.push({
      id: `lib_${sDomain}_skill_${sId}_transition_seq`,
      conceptId: `${sDomain}.skill.${sId}.transition_seq`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Core Phrasing & Transition Sequence`,
      description: `Practice linking two foundational techniques in ${sName} into a continuous, seamless transition sequence with smooth rhythmic pacing.`,
      reason: `Connects isolated mechanical drills into natural procedural sequences in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: 'moderate',
      rarity: 'uncommon',
      estimatedDuration: '20 mins',
      xpReward: 50 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'transition', sName],
      skillFocus: sName,
      cooldownDays: 1,
      developmentTier: skillStage,
      intensity: 'medium',
      cognitiveLoad: 'medium',
      questType: 'fundamentals',
      action: `Drill continuous transition between 2 core ${sName} movements for 20 minutes`,
      completionCriteria: `20 minutes logged with smooth, continuous transitions`,
      masteryOutcome: `Achieve fluid transitions and phrasing in ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Weak-Point Isolation & Mechanics Repair
    items.push({
      id: `lib_${sDomain}_skill_${sId}_weak_point`,
      conceptId: `${sDomain}.skill.${sId}.weak_point`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Weak-Point Isolation & Mechanics Repair`,
      description: `Identify your single highest-friction technical bottleneck in ${sName} and drill deliberate corrective reps for 20 minutes.`,
      reason: `Directly targets and repairs execution friction points in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: 'moderate',
      rarity: 'uncommon',
      estimatedDuration: '20 mins',
      xpReward: 50 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'bottleneck', sName],
      skillFocus: sName,
      cooldownDays: 2,
      developmentTier: skillStage,
      intensity: 'medium',
      cognitiveLoad: 'high',
      questType: 'drill',
      action: `Drill 20 minutes isolating your primary technical bottleneck in ${sName}`,
      completionCriteria: `20 minutes completed focusing exclusively on the identified weak point`,
      masteryOutcome: `Overcome friction points and bad habits in ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });

    // Masterwork Reference Analysis
    items.push({
      id: `lib_${sDomain}_skill_${sId}_ref_analysis`,
      conceptId: `${sDomain}.skill.${sId}.ref_analysis`,
      variationFamily: `${sDomain}_skill_${sId}`,
      title: `${sName} Masterwork Reference Analysis`,
      description: `Study a masterwork or high-level recorded demonstration of ${sName}. Annotate 3 specific technical cues and test them immediately in short practice.`,
      reason: `Anchors deliberate practice to high-standard reference models in ${sName}.`,
      domain: sDomain,
      pillarId: trackMapping.pillarId,
      primaryStatId: trackMapping.primaryStatId,
      category: 'side',
      allowedCategories: ['main', 'side', 'weekly'],
      difficulty: 'easy',
      rarity: 'common',
      estimatedDuration: '15 mins',
      xpReward: 40 + skillStage * 10,
      tags: [sDomain, 'curriculum', 'study', sName],
      skillFocus: sName,
      cooldownDays: 2,
      developmentTier: skillStage,
      intensity: 'low',
      cognitiveLoad: 'medium',
      questType: 'technique',
      action: `Study master reference in ${sName} and apply 3 annotated cues to short practice`,
      completionCriteria: `3 technical cues documented and tested in practical execution`,
      masteryOutcome: `Extract technical insights from elite demonstrations of ${sName}`,
      progressionStage: skillStage === 1 ? 'beginner' : skillStage <= 3 ? 'intermediate' : 'advanced',
      goalTrackId: skill.goalTrackId,
      skillId: sId,
      questBand: skillStage,
      band: skillStage,
      contentOrigin: 'curriculum_roadmap',
    });
  });

  return items;
}

/**
 * Converts validated AI-generated quest concepts into QuestLibraryItems compatible with APE.
 * Maps metadata (pillarId, primaryStatId, categories, difficulty, cooldowns) while preserving
 * the AI's intelligent title, description, skillConcept, and activityType.
 * APE maintains total authority over game logic (XP, stat rewards, tier balancing).
 */
export function convertAIConceptsToLibraryItems(
  aiConcepts: AIQuestConcept[] = [],
  forgePath?: ForgePath,
  dailyIntent?: DailyQuestIntent
): QuestLibraryItem[] {
  if (!aiConcepts || !Array.isArray(aiConcepts) || aiConcepts.length === 0) {
    return [];
  }

  const domain = forgePath?.domain || 'custom_domain';
  const defaultMapping = getDomainMapping(domain);
  const pathTitle = forgePath?.name && !forgePath.name.toLowerCase().includes('personal pursuit')
    ? forgePath.name
    : (domain.charAt(0).toUpperCase() + domain.slice(1).replace(/_/g, ' '));
  const availableTracks = resolveGoalTracksForForgePath(forgePath);

  const items: QuestLibraryItem[] = [];

  aiConcepts.forEach((concept, idx) => {
    if (!concept || typeof concept.title !== 'string' || !concept.title.trim()) return;
    if (typeof concept.description !== 'string' || !concept.description.trim()) return;

    const title = concept.title.trim();
    if (isGenericTitle(title)) return;
    if (concept.action && !isConcreteAction(concept.action)) return;

    const description = concept.description.trim();
    const skillFocus = (concept.skillConcept || forgePath?.focus || 'Core Craft').trim();
    const conceptSlug = skillFocus.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 25);
    const itemDomain = (concept.domain || domain).toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30);
    const itemMapping = itemDomain === domain ? defaultMapping : getDomainMapping(itemDomain);

    // Match curriculum goal track
    let matchedTrackId = concept.goalTrackId;
    if (!matchedTrackId && availableTracks.length > 0) {
      const match = availableTracks.find(
        (t) =>
          (t.domain && (t.domain.toLowerCase() === itemDomain || itemDomain.includes(t.domain.toLowerCase()))) ||
          (t.name && (t.name.toLowerCase() === skillFocus.toLowerCase() || title.toLowerCase().includes(t.name.toLowerCase())))
      );
      if (match) {
        matchedTrackId = match.id;
      }
    }

    const durationMins = typeof concept.estimatedDurationMinutes === 'number' && concept.estimatedDurationMinutes > 0
      ? Math.max(5, Math.min(240, Math.round(concept.estimatedDurationMinutes)))
      : 25;

    const rawDiff = (concept.difficultyHint || '').toLowerCase();
    const difficulty: 'easy' | 'moderate' | 'challenging' | 'elite' =
      rawDiff.includes('elite')
        ? 'elite'
        : rawDiff.includes('challeng') || rawDiff.includes('hard')
        ? 'challenging'
        : rawDiff.includes('easy') || rawDiff.includes('light')
        ? 'easy'
        : 'moderate';

    // Tier 1..5 matching difficulty
    const tier = difficulty === 'easy' ? 1 : difficulty === 'moderate' ? 2 : difficulty === 'challenging' ? 3 : 4;
    const rarity = difficulty === 'easy' ? 'common' : difficulty === 'moderate' ? 'uncommon' : difficulty === 'challenging' ? 'rare' : 'epic';

    // Determine category and allowedCategories
    const actType = (concept.activityType || 'practical').toLowerCase();
    const isDrill = actType.includes('drill') || durationMins <= 15 || difficulty === 'easy';
    const isMilestone = actType.includes('milestone') || actType.includes('creation') || durationMins >= 45;

    // Gated Epic & Legendary eligibility: Only if genuinely milestone/project scale and substantial duration
    const isExplicitEpic =
      (concept.questType === 'project' || concept.questType === 'assessment' || actType.includes('epic') || actType.includes('landmark')) &&
      durationMins >= 45 &&
      (difficulty === 'challenging' || difficulty === 'elite');

    const isExplicitLegendary =
      (concept.questType === 'project' || actType.includes('legendary')) &&
      durationMins >= 75 &&
      difficulty === 'elite' &&
      (Boolean(concept.difficultyHint?.toLowerCase().includes('legendary')) || actType.includes('legendary') || actType.includes('capstone'));

    const primaryCategory: QuestCategory | 'side' | 'main' | 'weekly' | 'epic' | 'legendary' =
      isExplicitLegendary
        ? 'legendary'
        : isExplicitEpic
        ? 'epic'
        : isDrill
        ? 'side'
        : isMilestone
        ? 'weekly'
        : 'main';

    const allowedCategories: (QuestCategory | 'side' | 'main' | 'weekly' | 'epic' | 'legendary' | 'maintenance')[] = ['main', 'side'];
    if (durationMins >= 30 || difficulty === 'challenging' || difficulty === 'elite') {
      allowedCategories.push('weekly');
    }
    if (isExplicitEpic) {
      allowedCategories.push('epic');
    }
    if (isExplicitLegendary) {
      allowedCategories.push('legendary');
    }
    if (isDrill || actType.includes('reflection')) {
      allowedCategories.push('maintenance');
    }

    const durationStr = `${durationMins} mins`;
    // APE Authoritative XP reward formula
    const xpReward = tier * 25 + 25;

    let finalDescription = description;
    if (concept.completionCriteria && !finalDescription.toLowerCase().includes(concept.completionCriteria.toLowerCase())) {
      finalDescription = `${finalDescription} [Completion: ${concept.completionCriteria}]`;
    }

    const conceptWords = skillFocus.toLowerCase().split(/[\s_-]+/).filter((w) => w.length > 2);
    const titleWords = title.toLowerCase().split(/[\s_-]+/).filter((w) => w.length > 2);
    const objWords = concept.learningObjective
      ? concept.learningObjective.toLowerCase().split(/[\s_-]+/).filter((w) => w.length > 2)
      : [];

    items.push({
      id: `lib_ai_${itemDomain}_${conceptSlug}_${idx}_${Date.now().toString(36)}`,
      conceptId: `${itemDomain}.ai.${conceptSlug}.${idx}`,
      variationFamily: `${itemDomain}_${conceptSlug}_ai_family`,
      title,
      description: finalDescription,
      reason: concept.rationale || concept.reasoning || `Deliberate practice in ${skillFocus} targeted for your ${pathTitle} pursuit.`,
      domain: itemDomain,
      pillarId: itemMapping.pillarId,
      primaryStatId: itemMapping.primaryStatId,
      category: primaryCategory,
      allowedCategories,
      difficulty,
      rarity,
      estimatedDuration: durationStr,
      xpReward,
      tags: [
        itemDomain,
        'ai_concept',
        actType,
        ...(concept.questType ? [concept.questType] : []),
        ...conceptWords,
        ...titleWords,
        ...objWords,
        ...itemMapping.relatedSkillKeywords,
      ],
      skillFocus,
      cooldownDays: difficulty === 'easy' ? 1 : 2,
      developmentTier: tier,
      intensity: difficulty === 'easy' ? 'low' : difficulty === 'challenging' || difficulty === 'elite' ? 'high' : 'medium',
      cognitiveLoad: 'medium',
      contentOrigin: 'Gemini Quest Intelligence',
      questType: concept.questType,
      masteryOutcome: concept.masteryOutcome,
      action: concept.action,
      completionCriteria: concept.completionCriteria,
      progressionStage: concept.progressionStage,
      prerequisiteConcepts: concept.prerequisiteConcepts,
      isAIConcept: true,
      goalTrackId: matchedTrackId,
      skillId: concept.skillId ? String(concept.skillId).trim() : undefined,
      questBand: Math.max(1, Math.min(6, (typeof concept.questBand === 'number' && concept.questBand >= 1)
        ? concept.questBand
        : (typeof concept.band === 'number' && concept.band >= 1 ? concept.band : 1))) as 1 | 2 | 3 | 4 | 5 | 6,
      band: Math.max(1, Math.min(6, (typeof concept.questBand === 'number' && concept.questBand >= 1)
        ? concept.questBand
        : (typeof concept.band === 'number' && concept.band >= 1 ? concept.band : 1))) as 1 | 2 | 3 | 4 | 5 | 6,
    });
  });

  return items;
}

/**
 * Parses domain keyword from arbitrary text with optional ForgePath awareness
 */
export function parseDomainFromText(text?: string, forgePathDomain?: string): DevelopmentDomain | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // If a forgePath domain exists and text contains it
  if (forgePathDomain && lower.includes(forgePathDomain.toLowerCase())) {
    return forgePathDomain;
  }

  if (lower.includes('drawing') || lower.includes('draw') || lower.includes('art') || lower.includes('sketch') || lower.includes('illustr') || lower.includes('portrait')) {
    return 'drawing';
  }
  if (lower.includes('climbing') || lower.includes('climb') || lower.includes('boulder') || lower.includes('hike') || lower.includes('mountain') || lower.includes('summit') || lower.includes('walk')) {
    return 'climbing';
  }
  if (lower.includes('storytelling') || lower.includes('story') || lower.includes('write') || lower.includes('writing') || lower.includes('journal') || lower.includes('author') || lower.includes('comic') || lower.includes('narrative')) {
    return 'storytelling';
  }
  if (lower.includes('mental_fortitude') || lower.includes('fortitude') || lower.includes('code') || lower.includes('program') || lower.includes('logic') || lower.includes('discipline') || lower.includes('focus') || lower.includes('meditation') || lower.includes('read') || lower.includes('study')) {
    return 'mental_fortitude';
  }

  return null;
}

/**
 * Normalizes title words for word-intersection comparison
 */
function normalizeTitleWords(title: string): Set<string> {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Calculates word similarity ratio between two titles
 */
function titleSimilarityRatio(titleA: string, titleB: string): number {
  const setA = normalizeTitleWords(titleA);
  const setB = normalizeTitleWords(titleB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let matches = 0;
  setA.forEach((word) => {
    if (setB.has(word)) matches++;
  });
  return matches / Math.min(setA.size, setB.size);
}

/**
 * Calculate actual completion performance from QuestLog data over rolling windows
 */
export function calculateCompletionRate(questLogs: QuestLog[] = [], windowDays: number = 14): {
  overallRate: number;
  domainRates: Record<DevelopmentDomain, number>;
  domainCompletions: Record<DevelopmentDomain, number>;
} {
  const nowMs = Date.now();
  const logsInWindow = questLogs.filter((log) => {
    const ageDays = (nowMs - new Date(log.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays >= 0 && ageDays <= windowDays;
  });

  const domainCompletions: Record<DevelopmentDomain, number> = {
    drawing: 0,
    climbing: 0,
    mental_fortitude: 0,
    storytelling: 0,
  };

  const allDomains: DevelopmentDomain[] = ['drawing', 'climbing', 'mental_fortitude', 'storytelling'];

  logsInWindow.forEach((log) => {
    const titleLower = log.questTitle.toLowerCase();
    allDomains.forEach((dom) => {
      const config = DOMAIN_MAPPINGS[dom];
      if (config.relatedSkillKeywords.some((kw) => titleLower.includes(kw))) {
        domainCompletions[dom]++;
      }
    });
  });

  if (logsInWindow.length === 0) {
    return {
      overallRate: 0.7,
      domainRates: { drawing: 0.7, climbing: 0.7, mental_fortitude: 0.7, storytelling: 0.7 },
      domainCompletions,
    };
  }

  const activeDays = new Set(logsInWindow.map((l) => l.completedAt.slice(0, 10))).size;
  const overallRate = Math.min(1.0, activeDays / Math.min(windowDays, 14));

  const domainRates: Record<DevelopmentDomain, number> = {
    drawing: Math.min(1.0, domainCompletions.drawing / 4),
    climbing: Math.min(1.0, domainCompletions.climbing / 4),
    mental_fortitude: Math.min(1.0, domainCompletions.mental_fortitude / 4),
    storytelling: Math.min(1.0, domainCompletions.storytelling / 4),
  };

  return { overallRate, domainRates, domainCompletions };
}

function getConceptReason(item: QuestLibraryItem, buildTitle: string, domainTier: number): string {
  if (item.reason && item.reason.trim().length > 10) {
    return item.reason;
  }

  const domain = item.domain;
  const tags = item.tags || [];

  if (domain === 'drawing') {
    if (tags.includes('gesture') || tags.includes('anatomy') || item.title.toLowerCase().includes('gesture')) {
      return 'Builds rapid structural observation and fluid line control for figure drawing.';
    }
    if (tags.includes('perspective') || tags.includes('environment') || item.title.toLowerCase().includes('perspective')) {
      return 'Strengthens 3D spatial construction and horizon-line depth for believable environments.';
    }
    if (tags.includes('shading') || tags.includes('value') || tags.includes('texture')) {
      return 'Refines lighting contrast, value control, and form definition under direct light.';
    }
    return 'Develops fine visual observation and deliberate hand-eye coordination for drawing mastery.';
  }

  if (domain === 'climbing') {
    if (tags.includes('footwork') || item.title.toLowerCase().includes('feet')) {
      return 'Maximizes leg power transfer and foot precision, reducing grip fatigue on wall routes.';
    }
    if (tags.includes('endurance') || tags.includes('stamina')) {
      return 'Expands forearm work capacity and pump management during sustained climbing sequences.';
    }
    return 'Refines body positioning, core tension, and efficient movement mechanics on holds.';
  }

  if (domain === 'mental_fortitude') {
    return 'Strengthens psychological resilience, focus retention, and willpower when facing friction or distraction.';
  }

  if (domain === 'storytelling') {
    return 'Develops narrative pacing, character motivation, and subtext for compelling scene construction.';
  }

  const domainConfig = DOMAIN_MAPPINGS[domain as keyof typeof DOMAIN_MAPPINGS];
  return `Targeted ${domainConfig?.displayName || domain} training (Tier ${domainTier}) to reinforce core identity for your ${buildTitle} path.`;
}

/**
 * Formats progressive overload challenge (duration, volume, complexity, precision, constraints) per domain
 */
function applyDomainProgressiveOverload(
  item: QuestLibraryItem,
  domainTier: number,
  difficultyLevel: number,
  seed: number,
  buildTitle: string
): { title: string; description: string; reason: string; estimatedDuration: string } {
  const isAIConcept = Boolean(
    item.isAIConcept ||
    item.contentOrigin === 'Gemini Quest Intelligence' ||
    item.id.startsWith('lib_ai_')
  );

  // If this is an AI-generated concept, preserve its authoritative title, description,
  // reason, and duration directly without procedural overriding or duration distortion.
  if (isAIConcept) {
    return {
      title: item.title,
      description: item.description,
      reason: item.reason || getConceptReason(item, buildTitle, domainTier),
      estimatedDuration: item.estimatedDuration || '25 mins',
    };
  }

  let title = item.title;
  let description = item.description;

  const params = item.proceduralParams;
  if (params) {
    const subjects = params.subjects;
    const scenarios = params.scenarios;
    const locations = params.locations;
    const techniques = params.techniques;
    const constraints = params.constraints;
    const difficultyModifiers = params.difficultyModifiers;

    const chosenSubject = subjects && subjects.length > 0 ? subjects[seed % subjects.length] : null;
    const chosenScenario = scenarios && scenarios.length > 0 ? scenarios[(seed + 1) % scenarios.length] : null;
    const chosenLocation = locations && locations.length > 0 ? locations[(seed + 2) % locations.length] : null;
    const chosenTechnique = techniques && techniques.length > 0 ? techniques[(seed + 3) % techniques.length] : null;
    const chosenConstraint = constraints && constraints.length > 0 ? constraints[(seed + 4) % constraints.length] : null;
    const chosenModifier = difficultyModifiers && difficultyModifiers.length > 0 ? difficultyModifiers[(seed + 5) % difficultyModifiers.length] : null;

    if (chosenSubject && !title.toLowerCase().includes(chosenSubject.toLowerCase())) {
      title = `${item.title} — ${chosenSubject}`;
    } else if (chosenScenario && !title.toLowerCase().includes(chosenScenario.toLowerCase())) {
      title = `${item.title} (${chosenScenario})`;
    } else if (chosenLocation && !title.toLowerCase().includes(chosenLocation.toLowerCase())) {
      title = `${item.title} — ${chosenLocation}`;
    } else if (chosenTechnique && !title.toLowerCase().includes(chosenTechnique.toLowerCase())) {
      title = `${item.title} (${chosenTechnique})`;
    }

    const extraDetails: string[] = [];
    if (chosenConstraint) extraDetails.push(`Constraint: ${chosenConstraint}`);
    if (chosenModifier) extraDetails.push(`Focus Note: ${chosenModifier}`);
    if (extraDetails.length > 0) {
      description = `${description} [${extraDetails.join(' | ')}]`;
    }
  }

  // Progressive Overload Duration Progression for procedural items
  const tierDuration =
    domainTier === 1 ? '10-15 mins' :
    domainTier === 2 ? '20-25 mins' :
    domainTier === 3 ? '30-40 mins' :
    domainTier === 4 ? '45-60 mins' :
    '60+ mins';

  const durationStr = item.estimatedDuration || tierDuration || '10-15 mins';

  const reason = getConceptReason(item, buildTitle, domainTier);

  return {
    title,
    description,
    reason,
    estimatedDuration: durationStr,
  };
}

/**
 * Strict Activity Type Matching based on tags, pillars, domain, and content
 */
export function isQuestItemMatchingActivityType(
  item: QuestLibraryItem | { title: string; description?: string; reason?: string; tags?: string[]; pillarId?: string; domain?: string; category?: string },
  actType: 'practical' | 'study' | 'creation' | 'drill' | 'reflection'
): boolean {
  const tags = (item.tags || []).map((t) => t.toLowerCase());
  const text = `${item.title || ''} ${item.description || ''} ${item.reason || ''}`.toLowerCase();

  switch (actType) {
    case 'practical':
      return (
        tags.some((t) => ['workout', 'physical', 'climbing', 'exercise', 'hands_on', 'movement', 'boulder', 'training', 'cardio', 'calisthenics', 'fitness', 'strength', 'hangboard'].includes(t)) ||
        item.pillarId === 'strength' ||
        item.domain === 'climbing' ||
        text.includes('workout') ||
        text.includes('exercise') ||
        text.includes('movement') ||
        text.includes('physical') ||
        text.includes('climb') ||
        text.includes('cardio') ||
        text.includes('fitness') ||
        text.includes('calisthenics')
      );
    case 'study':
      return (
        tags.some((t) => ['reading', 'study', 'theory', 'grammar', 'vocab', 'notes', 'srs', 'analysis', 'research', 'learning'].includes(t)) ||
        text.includes('study') ||
        text.includes('read') ||
        text.includes('grammar') ||
        text.includes('vocabulary') ||
        text.includes('theory') ||
        text.includes('research')
      );
    case 'creation':
      return (
        tags.some((t) => ['drawing', 'art', 'illustration', 'writing', 'story', 'project', 'comic', 'composition', 'creative'].includes(t)) ||
        item.domain === 'drawing' ||
        item.domain === 'storytelling' ||
        text.includes('draw') ||
        text.includes('sketch') ||
        text.includes('art') ||
        text.includes('write') ||
        text.includes('story') ||
        text.includes('create') ||
        text.includes('composition')
      );
    case 'drill':
      return (
        tags.some((t) => ['drill', 'reps', 'flashcard', 'gesture', 'fundamentals', 'quick', 'hangboard'].includes(t)) ||
        text.includes('drill') ||
        text.includes('reps') ||
        text.includes('flashcard') ||
        text.includes('gesture') ||
        text.includes('fundamentals')
      );
    case 'reflection':
      return (
        tags.some((t) => ['reflection', 'journal', 'meditation', 'mindfulness', 'breathwork', 'stillness', 'integrity'].includes(t)) ||
        item.category === 'maintenance' ||
        text.includes('journal') ||
        text.includes('reflect') ||
        text.includes('meditat') ||
        text.includes('mindful') ||
        text.includes('breathwork')
      );
    default:
      return false;
  }
}

/**
 * Extracts explicit user-requested activity types from DailyQuestIntent.
 * Only returns a non-null filter if the user explicitly requested that activity type in their adaptation.
 */
export function getExplicitActivityTypesFromIntent(
  intent?: DailyQuestIntent
): ('practical' | 'study' | 'creation' | 'drill' | 'reflection')[] | null {
  if (!intent) return null;

  const explicitTypes: ('practical' | 'study' | 'creation' | 'drill' | 'reflection')[] = [];
  const textToCheck = `${intent.userPrompt || ''} ${intent.notes || ''}`.toLowerCase();

  const practicalKeywords = ['exercise', 'workout', 'physical', 'movement', 'cardio', 'fitness', 'calisthenics', 'gym', 'training', 'climb', 'boulder', 'hands-on'];
  const studyKeywords = ['study', 'reading', 'read book', 'grammar', 'vocab', 'theory', 'learn', 'notes', 'srs', 'research'];
  const creationKeywords = ['creative', 'creation', 'drawing', 'sketch', 'art', 'writing', 'story', 'illustrat', 'paint', 'drafting'];
  const drillKeywords = ['drill', 'drills', 'reps', 'practice fundamentals', 'gesture study'];
  const reflectionKeywords = ['reflection', 'reflect', 'journal', 'meditat', 'mindful', 'breathwork', 'stoic'];

  if (practicalKeywords.some((kw) => textToCheck.includes(kw))) {
    explicitTypes.push('practical');
  }
  if (studyKeywords.some((kw) => textToCheck.includes(kw))) {
    explicitTypes.push('study');
  }
  if (creationKeywords.some((kw) => textToCheck.includes(kw))) {
    explicitTypes.push('creation');
  }
  if (drillKeywords.some((kw) => textToCheck.includes(kw))) {
    explicitTypes.push('drill');
  }
  if (reflectionKeywords.some((kw) => textToCheck.includes(kw))) {
    explicitTypes.push('reflection');
  }

  if (explicitTypes.length > 0) {
    return explicitTypes;
  }

  // If no natural language prompt, check if preferredActivityTypes was explicitly specified
  // (i.e. not the default ['practical', 'drill'] array)
  if (intent.preferredActivityTypes && intent.preferredActivityTypes.length > 0) {
    const isDefaultPair =
      intent.preferredActivityTypes.length === 2 &&
      intent.preferredActivityTypes.includes('practical') &&
      intent.preferredActivityTypes.includes('drill') &&
      !intent.userPrompt;
    if (!isDefaultPair && !intent.userPrompt) {
      return intent.preferredActivityTypes;
    }
  }

  return null;
}

/**
 * Determine Current Focus domain strictly following Authoritative Hierarchy:
 * 0. Daily Quest Intent preference
 * 1. Player Forge Path domain (Primary specialization driver)
 * Returns undefined if no Forge Path exists (preventing silent fallback to 'drawing').
 */
export function determineFocusDomain(params: APEQuestGenParams): DevelopmentDomain | undefined {
  const {
    weeklyFocus,
    currentFocus,
    player,
    activeProjectTitle,
    destinies = [],
    activeBuilds,
    skills = [],
    forgePath,
    dailyIntent,
  } = params || {};

  const isDeprioritized = (d: DevelopmentDomain) => Boolean(dailyIntent?.deprioritizedDomains?.includes(d));

  // 0. Daily Quest Intent preference (highest daily priority for temporary calibration)
  if (dailyIntent?.preferredDomains && dailyIntent.preferredDomains.length > 0) {
    const nonDep = dailyIntent.preferredDomains.find((d) => !isDeprioritized(d));
    if (nonDep) return nonDep;
  }
  if (dailyIntent?.domain && !isDeprioritized(dailyIntent.domain)) {
    return dailyIntent.domain;
  }

  // 1. Authoritative Player Forge Path (Primary progression driver)
  if (forgePath?.domain && !isDeprioritized(forgePath.domain)) {
    return forgePath.domain;
  }

  // If no Forge Path exists (and no explicit daily intent domain preference),
  // DO NOT fall back to a hardcoded default specialization like 'drawing'.
  // Return undefined so no specialization-driven quests are generated before Forge Path exists.
  if (!forgePath?.domain) {
    return undefined;
  }

  // 2. Explicit Current Weekly Focus matching forgePath domain
  const explicit = weeklyFocus || currentFocus;
  if (explicit) {
    const matched = parseDomainFromText(explicit, forgePath.domain);
    if (matched && !isDeprioritized(matched)) return matched;
  }

  // 3. Check player.currentQuest, player.currentArc, player.goals
  if (player) {
    const playerText = `${player.currentQuest || ''} ${player.currentArc || ''} ${(player.goals || []).join(' ')}`;
    const matchedPlayer = parseDomainFromText(playerText, forgePath.domain);
    if (matchedPlayer && !isDeprioritized(matchedPlayer)) return matchedPlayer;
  }

  // 4. Active Life Path / selected domain
  if (activeProjectTitle) {
    const matchedProject = parseDomainFromText(activeProjectTitle, forgePath.domain);
    if (matchedProject && !isDeprioritized(matchedProject)) return matchedProject;
  }

  // 5. Active Destiny
  const activeDestiny = destinies.find((d) => d.active);
  if (activeDestiny) {
    const matchedDestiny = parseDomainFromText(`${activeDestiny.title} ${activeDestiny.tagline} ${activeDestiny.description}`, forgePath.domain);
    if (matchedDestiny && !isDeprioritized(matchedDestiny)) return matchedDestiny;
  }

  // 6. Primary Build
  if (activeBuilds?.primaryBuildId) {
    const primaryBuild = PRESET_BUILDS.find((b) => b.id === activeBuilds.primaryBuildId);
    if (primaryBuild) {
      const matchedBuild = parseDomainFromText(`${primaryBuild.id} ${primaryBuild.title} ${primaryBuild.tagline} ${primaryBuild.focusAreas.join(' ')}`, forgePath.domain);
      if (matchedBuild && !isDeprioritized(matchedBuild)) return matchedBuild;
    }
  }

  // 7. Return forgePath domain if still valid
  return forgePath.domain;
}

/**
 * Distinguishes CURRENT FOCUS from ACTIVE LIFE PATHS from AVAILABLE DOMAINS
 */
export function determineActiveLifePaths(
  params: APEQuestGenParams,
  focusDomain?: DevelopmentDomain
): {
  activeLifePaths: DevelopmentDomain[];
  secondaryActiveLifePaths: DevelopmentDomain[];
  availableDomains: DevelopmentDomain[];
} {
  const { activeBuilds, destinies = [], skills = [], activeProjectTitle, weeklyFocus, currentFocus, player, forgePath, dailyIntent } = params || {};
  const allDomains: DevelopmentDomain[] = Array.from(
    new Set<DevelopmentDomain>([
      'drawing',
      'climbing',
      'mental_fortitude',
      'storytelling',
      ...(forgePath?.domain ? [forgePath.domain] : []),
      ...(dailyIntent?.preferredDomains || []),
    ])
  );

  const detected = new Set<DevelopmentDomain>();

  // Add forgePath domain if available (primary driver)
  if (forgePath?.domain) {
    detected.add(forgePath.domain);
  }

  // Add preferred domains from daily adaptation
  if (dailyIntent?.preferredDomains) {
    dailyIntent.preferredDomains.forEach((pd) => detected.add(pd));
  }

  // Explicit weekly focus or player goals count as real player context
  const explicit = weeklyFocus || currentFocus;
  if (explicit) {
    const matched = parseDomainFromText(explicit, forgePath?.domain);
    if (matched) detected.add(matched);
  }

  if (player) {
    const playerText = `${player.currentQuest || ''} ${player.currentArc || ''} ${(player.goals || []).join(' ')}`;
    const matchedPlayer = parseDomainFromText(playerText, forgePath?.domain);
    if (matchedPlayer) detected.add(matchedPlayer);
  }

  // If no custom forgePath domain is set, detect life paths from builds, destinies, and skills
  if (!forgePath?.domain) {
    // 1. Check primary & secondary builds in activeBuilds
    if (activeBuilds?.primaryBuildId) {
      const buildIds = [activeBuilds.primaryBuildId, ...(activeBuilds.secondaryBuildIds || [])].filter(Boolean);
      buildIds.forEach((bId) => {
        const buildObj = PRESET_BUILDS.find((b) => b.id === bId);
        if (buildObj) {
          const text = `${buildObj.id} ${buildObj.title} ${buildObj.tagline} ${(buildObj.focusAreas || []).join(' ')}`;
          const dom = parseDomainFromText(text);
          if (dom) detected.add(dom);
        }
      });
    }

    // 2. Check active destinies
    destinies.filter((d) => d.active).forEach((d) => {
      const dom = parseDomainFromText(`${d.title} ${d.tagline} ${d.description}`);
      if (dom) detected.add(dom);
    });

    // 3. Check skills with level > 1 or XP > 0
    skills.filter((s) => (s.level || 1) > 1 || (s.lifetimeXp || 0) > 0).forEach((s) => {
      if (s.category && allDomains.includes(s.category as DevelopmentDomain)) {
        detected.add(s.category as DevelopmentDomain);
      } else {
        const dom = parseDomainFromText(`${s.id} ${s.name} ${s.category}`);
        if (dom) detected.add(dom);
      }
    });

    // 4. Check active project title / goals
    if (activeProjectTitle) {
      const dom = parseDomainFromText(activeProjectTitle);
      if (dom) detected.add(dom);
    }
  }

  const activeLifePaths = Array.from(detected);
  const secondaryActiveLifePaths = activeLifePaths
    .filter((d) => d !== focusDomain)
    .filter((d) => !dailyIntent?.deprioritizedDomains?.includes(d));

  const availableDomains = allDomains
    .filter((d) => !activeLifePaths.includes(d))
    .filter((d) => !dailyIntent?.deprioritizedDomains?.includes(d));

  return { activeLifePaths, secondaryActiveLifePaths, availableDomains };
}

/**
 * Strict Multi-Factor Legendary Eligibility
 * Legendary represents long-term achievement and requires multi-dimensional progression evidence.
 * A build alone or a single isolated metric NEVER unlocks Legendary.
 */
export function isLegendaryEligible(
  focusDomain: DevelopmentDomain,
  skills: Skill[],
  questLogs: QuestLog[],
  domainRates: Record<DevelopmentDomain, number>,
  domainCompletions: Record<DevelopmentDomain, number>
): boolean {
  const focusConfig = DOMAIN_MAPPINGS[focusDomain];
  if (!focusConfig) return false;

  const focusSkill = skills.find((s) =>
    focusConfig.relatedSkillKeywords.some(
      (kw) => s.id.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw)
    )
  );

  if (!focusSkill) return false;

  const ape = calculateSkillAPE(focusSkill, questLogs);
  const focusLevel = focusSkill.level || 1;
  const focusStage = ape.currentStage || 1;
  const completedMilestones = focusSkill.milestones?.filter((m) => m.completed).length || 0;
  const totalDomainCompletions = domainCompletions[focusDomain] || 0;
  const consistency = ape.consistency || 0;

  // HARD MINIMUM: Must have completed at least 12 quests in this domain
  if (totalDomainCompletions < 12) return false;

  // Must meet AT LEAST 3 out of 5 high achievement criteria:
  let criteriaMet = 0;
  if (focusLevel >= 6) criteriaMet++;
  if (focusStage >= 5) criteriaMet++;
  if (completedMilestones >= 4) criteriaMet++;
  if (consistency >= 75) criteriaMet++;
  if (totalDomainCompletions >= 20) criteriaMet++;

  return criteriaMet >= 3;
}

/**
 * Helper to ensure a valid numeric ID for a generated quest
 */
function resolveQuestNumericId(existingId?: number, indexOffset: number = 0, usedIds?: Set<number>): number {
  if (typeof existingId === 'number' && !isNaN(existingId) && existingId > 0) {
    if (usedIds) usedIds.add(existingId);
    return existingId;
  }
  let generated = Date.now() + indexOffset * 100 + Math.floor(Math.random() * 90);
  if (usedIds) {
    while (usedIds.has(generated)) {
      generated += 1;
    }
    usedIds.add(generated);
  }
  return generated;
}

/**
 * FOCUS-WEIGHTED QUEST ECOSYSTEM ALLOCATION STRATEGY BY QUEST ROLE
 *
 * Daily Ecosystem Standard Active Slots (9 slots total):
 *
 * 1. MAIN QUESTS (3 slots): Primary progression anchor
 *    - Slot 1: Current Focus
 *    - Slot 2: Current Focus
 *    - Slot 3: Secondary Active Life Path (or Focus/Maintenance fallback if no secondary active path exists)
 *
 * 2. WEEKLY QUESTS (2 slots): Multi-day momentum anchors
 *    - Slot 1: Current Focus
 *    - Slot 2: Secondary Active Life Path (or Focus/Maintenance fallback if no secondary active path exists)
 *
 * 3. SIDE QUESTS (4 slots): Daily support actions
 *    - Slot 1: Current Focus
 *    - Slot 2: Current Focus
 *    - Slot 3: Neglect Compensation OR Secondary Active Life Path (or Focus/Maintenance fallback)
 *    - Slot 4: General Maintenance (or Focus fallback if no valid maintenance candidate exists)
 *
 * FOCUS-WEIGHTED QUEST ECOSYSTEM DISTRIBUTION:
 * - Current Focus: ~55.6% dominant weight
 * - Secondary Active Life Paths: ~33.3% support weight
 * - General Maintenance: ~11.1% maintenance weight
 *
 * Note: Legendary (rare landmark) and Epic (multi-week campaign) are distinct
 * landmark tiers and are excluded from the daily percentage calculation.
 */

export interface HeldBackLandmark {
  id?: number;
  title: string;
  category: 'epic' | 'legendary';
  estimatedDuration?: string;
  requiredMinutes: number;
  reason: string;
}

let lastHeldBackLandmarks: HeldBackLandmark[] = [];

export function getHeldBackLandmarks(): HeldBackLandmark[] {
  return [...lastHeldBackLandmarks];
}

const WITHHELD_LANDMARKS_STORAGE_KEY = 'forge_withheld_landmark_quests_v1';

function getStoredWithheldLandmarks(): Quest[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(WITHHELD_LANDMARKS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('[apeEngine] Failed to read withheld landmarks from localStorage:', err);
  }
  return [];
}

function setStoredWithheldLandmarks(quests: Quest[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(WITHHELD_LANDMARKS_STORAGE_KEY, JSON.stringify(quests));
    }
  } catch (err) {
    console.warn('[apeEngine] Failed to write withheld landmarks to localStorage:', err);
  }
}

function saveWithheldLandmark(quest: Quest): void {
  const current = getStoredWithheldLandmarks().filter(
    (q) => q.id !== quest.id && !isSameQuestContent(q, quest)
  );
  current.push(quest);
  setStoredWithheldLandmarks(current);
}

function removeWithheldLandmark(questIdOrQuest: number | Quest): void {
  const current = getStoredWithheldLandmarks();
  const updated = current.filter((q) => {
    if (typeof questIdOrQuest === 'number') {
      return q.id !== questIdOrQuest;
    }
    return q.id !== questIdOrQuest.id && !isSameQuestContent(q, questIdOrQuest);
  });
  setStoredWithheldLandmarks(updated);
}

function findWithheldLandmark(
  category: 'epic' | 'legendary',
  safeExistingQuests: Quest[],
  safeQuestLogs: QuestLog[]
): Quest | undefined {
  const withheld = getStoredWithheldLandmarks();
  return withheld.find((q) => {
    if (q.category !== category && (category !== 'legendary' || q.rarity !== 'legendary')) {
      return false;
    }
    if (q.completedToday || (q.completionCount || 0) > 0 || Boolean(q.lastCompletedAt) || q.isArchived) {
      return false;
    }
    if (safeExistingQuests.some((sq) => (sq.id === q.id || isSameQuestContent(sq, q)) && sq.completedToday)) {
      return false;
    }
    if (safeQuestLogs.some((l) => l.questId === q.id || l.questTitle === q.title)) {
      return false;
    }
    return true;
  });
}

function isQuestInCooldown(item: QuestLibraryItem, logs: QuestLog[], days: number): boolean {
  const nowMs = Date.now();
  return logs.some((l) => {
    const ageDays = (nowMs - new Date(l.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= days) return false;
    return isSameQuestContent(item, { title: l.questTitle });
  });
}

export function generateAPEQuests(params: APEQuestGenParams): Quest[] {
  lastHeldBackLandmarks = [];

  // CRITICAL: Fresh state guard. If no Forge Path has been established, return 0 quests.
  if (!params?.forgePath) {
    return [];
  }

  const forceRefresh = Boolean(params?.forceRefresh);

  const {
    activeBuilds,
    skills = [],
    existingQuests = [],
    questLogs = [],
    destinies = [],
  } = params || {};

  const safeSkills = skills || [];
  const safeExistingQuests = existingQuests || [];
  const safeQuestLogs = questLogs || [];
  const safeDestinies = destinies || [];
  const highestUnlockedBand = getHighestUnlockedBand(safeSkills);

  // Active Skills (up to 3, sorted by activePriority 1, 2, 3)
  const activeSkillsList = safeSkills
    .filter((s) => Boolean(s.active) || (typeof s.activePriority === 'number' && s.activePriority > 0))
    .sort((a, b) => (a.activePriority || 999) - (b.activePriority || 999))
    .slice(0, 3);

  // CRITICAL: NEVER fall back to activeGoalTracks. Active Skills represent the user's explicit current focus.
  const effectiveActiveSkills = activeSkillsList;
  const activeIds = new Set(effectiveActiveSkills.map((s) => s.id));
  const inactiveSkillsList = safeSkills.filter((s) => !activeIds.has(s.id));

  // Authoritative goal tracks for the current Forge Path
  const allResolvedGoalTracks = resolveGoalTracksForForgePath(params?.forgePath);

  // Active Skill Scope definitions (IDs, Goal Tracks, Domains, Names)
  const activeSkillIds = new Set<string>();
  const activeGoalTrackIds = new Set<string>();
  const activeSkillDomains = new Set<string>();
  const activeSkillNamesLower = new Set<string>();

  effectiveActiveSkills.forEach((s) => {
    if (s.id) activeSkillIds.add(s.id);
    if (s.goalTrackId) activeGoalTrackIds.add(s.goalTrackId);
    if (s.domain) activeSkillDomains.add(s.domain.toLowerCase());
    if (s.name) activeSkillNamesLower.add(s.name.toLowerCase().trim());

    // Match associated goal tracks
    const matchingTrack = allResolvedGoalTracks.find(
      (t) =>
        (s.goalTrackId && t.id === s.goalTrackId) ||
        (t.skillId && t.skillId === s.id) ||
        (t.name && s.name && t.name.toLowerCase() === s.name.toLowerCase())
    );
    if (matchingTrack) {
      activeGoalTrackIds.add(matchingTrack.id);
      if (matchingTrack.domain) activeSkillDomains.add(matchingTrack.domain.toLowerCase());
    }
  });

  // Inactive Skill Scope definitions
  const inactiveSkillIds = new Set<string>();
  const inactiveGoalTrackIds = new Set<string>();
  const inactiveSkillDomains = new Set<string>();
  const inactiveSkillNamesLower = new Set<string>();

  inactiveSkillsList.forEach((s) => {
    if (s.id && !activeSkillIds.has(s.id)) inactiveSkillIds.add(s.id);
    if (s.goalTrackId && !activeGoalTrackIds.has(s.goalTrackId)) inactiveGoalTrackIds.add(s.goalTrackId);
    if (s.domain && !activeSkillDomains.has(s.domain.toLowerCase())) inactiveSkillDomains.add(s.domain.toLowerCase());
    if (s.name && !activeSkillNamesLower.has(s.name.toLowerCase().trim())) {
      inactiveSkillNamesLower.add(s.name.toLowerCase().trim());
    }

    const matchingTrack = allResolvedGoalTracks.find(
      (t) =>
        (s.goalTrackId && t.id === s.goalTrackId) ||
        (t.skillId && t.skillId === s.id) ||
        (t.name && s.name && t.name.toLowerCase() === s.name.toLowerCase())
    );
    if (matchingTrack) {
      if (!activeGoalTrackIds.has(matchingTrack.id)) inactiveGoalTrackIds.add(matchingTrack.id);
      if (matchingTrack.domain && !activeSkillDomains.has(matchingTrack.domain.toLowerCase())) {
        inactiveSkillDomains.add(matchingTrack.domain.toLowerCase());
      }
    }
  });

  allResolvedGoalTracks.forEach((t) => {
    if (!activeGoalTrackIds.has(t.id)) {
      inactiveGoalTrackIds.add(t.id);
      if (t.domain && !activeSkillDomains.has(t.domain.toLowerCase())) {
        inactiveSkillDomains.add(t.domain.toLowerCase());
      }
      if (t.name && !activeSkillNamesLower.has(t.name.toLowerCase().trim())) {
        inactiveSkillNamesLower.add(t.name.toLowerCase().trim());
      }
    }
  });

  const primaryBuild = activeBuilds?.primaryBuildId
    ? PRESET_BUILDS.find((b) => b.id === activeBuilds.primaryBuildId)
    : undefined;
  const primaryBuildTitle = primaryBuild?.title || 'General';
  const primaryBuildXpMultiplier = primaryBuild?.xpMultiplier || 1;

  // 1. Authoritative Current Focus & Active Life Path Determination
  const focusDomain = determineFocusDomain(params);
  const { activeLifePaths, secondaryActiveLifePaths, availableDomains } = determineActiveLifePaths(params, focusDomain);

  // 2. Real Completion Rate & Neglect Compensation Detection
  const { overallRate, domainRates, domainCompletions } = calculateCompletionRate(safeQuestLogs, 14);

  const nowMs = Date.now();
  const dayOfYear = Math.floor((nowMs - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const baseSeed = params?.seed !== undefined ? params.seed : dayOfYear;

  // Derive allowed active domains STRICTLY from active skills (not all forge path goal tracks)
  const activeTrackDomains = new Set<string>(activeSkillDomains);
  if (params?.dailyIntent?.preferredDomains) {
    params.dailyIntent.preferredDomains.forEach((d) => {
      if (activeSkillDomains.has(d.toLowerCase())) {
        activeTrackDomains.add(d);
      }
    });
  }

  function checkCandidateSkillEligibility(item: QuestLibraryItem): { eligible: boolean; isInactiveSkill: boolean } {
    // 0. If no active skills exist, no skill-focused candidates are eligible
    if (effectiveActiveSkills.length === 0) {
      const isMaint =
        !item.goalTrackId &&
        !item.skillId &&
        (item.category === 'maintenance' ||
          item.domain === 'general_maintenance' ||
          item.pillarId === 'character' ||
          Boolean(item.tags?.some((t) => ['recovery', 'stretch', 'gentle', 'mobility', 'review', 'breathwork', 'journal'].includes(t))));
      return { eligible: isMaint, isInactiveSkill: !isMaint };
    }

    const isNewlyGeneratedSkillContent = Boolean(
      item.isAIConcept ||
      item.contentOrigin === 'Gemini Quest Intelligence' ||
      item.contentOrigin === 'curriculum_roadmap' ||
      (typeof item.contentOrigin === 'string' && item.contentOrigin.includes('fallback')) ||
      (item.id && (item.id.startsWith('lib_ai_') || item.id.includes('_track_') || item.id.includes('fallback')))
    );

    if (isNewlyGeneratedSkillContent) {
      // IF item is newly generated skill content:
      // skillId MUST exist
      // skillId MUST be active
      // goalTrackId, if present, MUST belong to that Skill
      // Do not allow newly generated skill content to reach the roster solely through:
      // domain, title, skillFocus, goalTrackId
      if (!item.skillId || !activeSkillIds.has(item.skillId)) {
        return { eligible: false, isInactiveSkill: item.skillId ? inactiveSkillIds.has(item.skillId) : false };
      }

      if (item.goalTrackId) {
        if (!activeGoalTrackIds.has(item.goalTrackId)) {
          return { eligible: false, isInactiveSkill: false };
        }
        const activeSkill = effectiveActiveSkills.find((s) => s.id === item.skillId);
        if (activeSkill?.goalTrackId && activeSkill.goalTrackId !== item.goalTrackId) {
          return { eligible: false, isInactiveSkill: false };
        }
        const matchingTrack = params?.forgePath?.goalTracks?.find((gt: any) => gt.id === item.goalTrackId);
        if (matchingTrack) {
          if (matchingTrack.skillId && matchingTrack.skillId !== item.skillId) {
            return { eligible: false, isInactiveSkill: false };
          }
          if (matchingTrack.domain && activeSkill?.domain) {
            const gtDom = matchingTrack.domain.toLowerCase().trim();
            const sDom = activeSkill.domain.toLowerCase().trim();
            if (gtDom !== sDom && !gtDom.includes(sDom) && !sDom.includes(gtDom)) {
              return { eligible: false, isInactiveSkill: false };
            }
          }
        }
      }

      return { eligible: true, isInactiveSkill: false };
    }

    // 1. Exact skillId match - IF candidateItem.skillId EXISTS: ONLY skillId determines Skill ownership!
    if (item.skillId) {
      if (activeSkillIds.has(item.skillId)) return { eligible: true, isInactiveSkill: false };
      return { eligible: false, isInactiveSkill: inactiveSkillIds.has(item.skillId) };
    }

    // 2. Exact goalTrackId match - ONLY for legacy standard library entries!
    if (item.goalTrackId) {
      if (activeGoalTrackIds.has(item.goalTrackId)) return { eligible: true, isInactiveSkill: false };
      return { eligible: false, isInactiveSkill: inactiveGoalTrackIds.has(item.goalTrackId) };
    }

    // Text checking against inactive skill names
    const textToCheck = `${item.title} ${item.action || ''} ${item.description || ''} ${item.skillFocus || ''}`.toLowerCase();
    for (const inName of inactiveSkillNamesLower) {
      if (inName.length >= 3 && textToCheck.includes(inName)) {
        const alsoActive = Array.from(activeSkillNamesLower).some((aName) => textToCheck.includes(aName));
        if (!alsoActive) {
          return { eligible: false, isInactiveSkill: true };
        }
      }
    }

    // 3. Domain match ONLY for legacy standard library when that domain belongs to an Active Skill
    const itemDom = (item.domain || '').toLowerCase();
    if (itemDom && activeSkillDomains.has(itemDom)) {
      return { eligible: true, isInactiveSkill: false };
    }
    if (itemDom && inactiveSkillDomains.has(itemDom)) {
      return { eligible: false, isInactiveSkill: true };
    }

    // 4. Life Maintenance check: ONLY if genuinely independent of skills
    const isMaintenance =
      !item.goalTrackId &&
      !item.skillId &&
      (item.category === 'maintenance' ||
        item.domain === 'general_maintenance' ||
        item.pillarId === 'character' ||
        Boolean(item.tags?.some((t) => ['recovery', 'stretch', 'gentle', 'mobility', 'review', 'breathwork', 'journal'].includes(t))));

    if (isMaintenance) {
      return { eligible: true, isInactiveSkill: false };
    }

    return { eligible: false, isInactiveSkill: false };
  }

  // 1. Concrete curriculum items from resolved goal tracks
  const customItems = synthesizeCustomDomainLibraryItems(params?.forgePath, safeSkills);

  // 2. Verified AI quest concepts
  const aiItems = params?.aiQuestConcepts && params.aiQuestConcepts.length > 0
    ? convertAIConceptsToLibraryItems(params.aiQuestConcepts, params?.forgePath, params?.dailyIntent)
    : [];

  // 3. Standard Quest Library items: ONLY when they genuinely match active skill domains or life maintenance
  const matchingLibraryItems = QUEST_LIBRARY.filter((item) => {
    if (isGenericTitle(item.title)) return false;
    if (!isConcreteAction(item.action || item.title)) return false;

    // Check if it belongs to an inactive skill
    const textLower = `${item.title} ${item.action || ''}`.toLowerCase();
    for (const inName of inactiveSkillNamesLower) {
      if (inName.length >= 3 && textLower.includes(inName)) {
        return false;
      }
    }

    // Life Maintenance items are always eligible as support/recovery
    if (
      item.category === 'maintenance' ||
      item.domain === 'general_maintenance' ||
      item.pillarId === 'character' ||
      Boolean(item.tags?.some((t) => ['recovery', 'stretch', 'gentle', 'mobility', 'review', 'breathwork', 'journal'].includes(t)))
    ) {
      return true;
    }

    // If active track domains exist, library item must match one of the active domains
    if (activeTrackDomains.size > 0 && !activeTrackDomains.has(item.domain)) {
      return false;
    }

    if (activeTrackDomains.size === 0) {
      return false;
    }

    return true;
  });

  // Combined candidate pool before active-skill filtering
  const rawLibrary: QuestLibraryItem[] = [...customItems, ...aiItems, ...matchingLibraryItems];

  const candidatesBeforeActiveFilter = rawLibrary.length;
  let inactiveSkillRejections = 0;

  const filteredLibrary: QuestLibraryItem[] = [];
  for (const item of rawLibrary) {
    const { eligible, isInactiveSkill } = checkCandidateSkillEligibility(item);
    if (isInactiveSkill) {
      inactiveSkillRejections++;
    }
    if (eligible) {
      filteredLibrary.push(item);
    }
  }

  const candidatesAfterActiveFilter = filteredLibrary.length;

  // Strictly filter out generic titles and non-concrete actions, de-duplicating by content
  const seenContentKeys = new Set<string>();
  const effectiveLibrary: QuestLibraryItem[] = [];
  for (const item of filteredLibrary) {
    if (isGenericTitle(item.title)) continue;
    if (!isConcreteAction(item.action || item.title)) continue;
    const key = getQuestContentKey(item);
    if (seenContentKeys.has(key)) continue;
    seenContentKeys.add(key);
    effectiveLibrary.push(item);
  }

  const allDomainsList: DevelopmentDomain[] = Array.from(
    new Set<DevelopmentDomain>([
      'drawing',
      'climbing',
      'mental_fortitude',
      'storytelling',
      ...(params?.forgePath?.domain ? [params.forgePath.domain] : []),
      ...(params?.dailyIntent?.preferredDomains || []),
    ])
  );

  const recent14DomainCounts: Record<string, number> = {};
  allDomainsList.forEach((d) => { recent14DomainCounts[d] = 0; });

  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent14Logs = safeQuestLogs.filter((l) => new Date(l.completedAt).getTime() >= fourteenDaysAgo);

  recent14Logs.forEach((log) => {
    const titleLower = log.questTitle.toLowerCase();
    allDomainsList.forEach((dom) => {
      const config = getDomainMapping(dom);
      if (config.relatedSkillKeywords.some((kw) => titleLower.includes(kw))) {
        recent14DomainCounts[dom] = (recent14DomainCounts[dom] || 0) + 1;
      }
    });
  });

  // Neglected domain: Available/inactive domain with 0 completions in last 14 days
  const neglectedDomains = availableDomains.filter((d) => (recent14DomainCounts[d] || 0) === 0);

  // 3. Domain-Specific Independent Progressive Overload Calculation
  const domainTargetTiers: Record<string, number> = {};
  const domainDifficultyLevels: Record<string, number> = {};

  allDomainsList.forEach((dom) => {
    const config = getDomainMapping(dom);
    const matchingSkill = safeSkills.find((s) =>
      config.relatedSkillKeywords.some((kw) => s.id.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw))
    );

    let domainStage = 1;
    let domainConsistency = 50;

    if (matchingSkill) {
      const ape = calculateSkillAPE(matchingSkill, safeQuestLogs);
      domainStage = ape.currentStage;
      domainConsistency = ape.consistency;
    }

    let targetTier = Math.min(5, Math.max(1, Math.ceil((domainStage / 7) * 5)));
    const domRate = domainRates[dom as DevelopmentDomain] || 0.5;
    if (domRate > 0.8 && domainConsistency >= 60) {
      targetTier = Math.min(5, targetTier + 1);
    } else if (domRate < 0.3 || domainConsistency < 30) {
      targetTier = Math.max(1, targetTier - 1);
    }
    domainTargetTiers[dom] = targetTier;

    let diff = targetTier === 1 ? 1 : targetTier === 2 ? 2 : targetTier === 3 ? 3 : 4;
    if (domRate > 0.8) diff = Math.min(4, diff + 1);
    else if (domRate < 0.3) diff = Math.max(1, diff - 1);

    if (params?.dailyIntent?.energyPreference === 'low' || params?.dailyIntent?.difficultyPreference === 'easy') {
      diff = 1;
    } else if (params?.dailyIntent?.difficultyPreference === 'challenging' || params?.dailyIntent?.difficultyPreference === 'elite') {
      diff = Math.min(4, Math.max(3, diff + 1));
    }

    domainDifficultyLevels[dom] = diff;
  });

  // ====================================================================
  // Helper scoring & budget calculation functions for Daily Quest Intent
  // ====================================================================
  function calculateDurationBudgetScore(item: QuestLibraryItem, availableMinutes?: number): number {
    if (!availableMinutes || availableMinutes <= 0) return 0;
    const duration = parseQuestDurationMinutes(item);

    // Any quest exceeding user's total available time receives a steep penalty
    if (duration > availableMinutes) {
      const overflow = duration - availableMinutes;
      return -100 - overflow * 2;
    }

    // For very tight budgets (5-15 mins), single short focused drills are ideal
    if (availableMinutes <= 15) {
      if (duration <= availableMinutes) return 60;
      return -80;
    }

    // For 20-30 mins, quests between 10 and 20 mins are optimal components
    if (availableMinutes <= 30) {
      if (duration >= 10 && duration <= 20) return 50;
      if (duration <= 10) return 40;
      if (duration <= availableMinutes) return 25;
      return -50;
    }

    // For 45-60 mins, quests between 15 and 30 mins are ideal components
    if (availableMinutes <= 60) {
      if (duration >= 15 && duration <= 30) return 45;
      if (duration <= availableMinutes) return 30;
      return -30;
    }

    // For 75-90+ mins, allow deeper sessions (25-60 mins)
    if (duration >= 25 && duration <= 60) return 40;
    if (duration <= 15) return 10;
    return 20;
  }

  function calculateEnergyDifficultyScore(
    item: QuestLibraryItem,
    energy?: 'low' | 'moderate' | 'high' | 'peak',
    difficulty?: 'easy' | 'moderate' | 'challenging' | 'elite'
  ): number {
    let score = 0;
    const tier = item.developmentTier || 2;
    const intensity = item.intensity || 'moderate';
    const cogLoad = item.cognitiveLoad || 'moderate';
    const physDemand = item.physicalDemand || 'moderate';
    const isLightOrRecovery =
      intensity === 'low' ||
      item.tags?.some((t) => ['recovery', 'stretch', 'gentle', 'mobility', 'review', 'breathwork', 'journal'].includes(t));

    if (energy === 'low') {
      if (isLightOrRecovery) score += 45;
      if (tier <= 2) score += 30;
      if (cogLoad === 'low' || physDemand === 'low') score += 20;
      if (intensity === 'high' || intensity === 'peak') score -= 60;
      if (tier >= 4) score -= 50;
    } else if (energy === 'high' || energy === 'peak') {
      if (intensity === 'high' || intensity === 'peak') score += 35;
      if (tier >= 3) score += 25;
      if (isLightOrRecovery && item.category === 'main') score -= 20;
    }

    if (difficulty === 'easy') {
      if (tier <= 2 || item.difficulty === 'easy') score += 30;
      if (tier >= 4) score -= 40;
    } else if (difficulty === 'challenging' || difficulty === 'elite') {
      if (tier >= 3 || item.difficulty === 'challenging') score += 35;
      if (tier <= 1) score -= 25;
    }

    return score;
  }

  function calculateSemanticTargetSkillsScore(item: QuestLibraryItem, targetSkills?: string[]): number {
    if (!targetSkills || targetSkills.length === 0) return 0;
    let maxScore = 0;

    const itemText = [
      item.title,
      item.description,
      item.reason,
      item.skillFocus,
      item.conceptId,
      item.variationFamily,
      item.domain,
      ...(item.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const node = findBestSkillNodeForQuest(item);
    const nodeText = node
      ? `${node.title} ${node.subtitle || ''} ${node.description} ${node.questTags?.join(' ') || ''}`.toLowerCase()
      : '';

    const SEMANTIC_CLUSTERS: Record<string, string[]> = {
      drawing: ['art', 'sketch', 'illustration', 'figure', 'gesture', 'doodle', 'line', 'pencil', 'ink'],
      gesture: ['gesture', 'figure', 'pose', 'quick sketch', 'contour', 'rhythm', 'motion', 'anatomy'],
      anatomy: ['anatomy', 'figure', 'muscles', 'loomis', 'head', 'planes', 'face', 'proportions', 'skeleton', 'hands'],
      perspective: ['perspective', 'spatial', 'grid', 'vanishing', 'horizon', 'boxes', '3d', 'depth'],
      climbing: ['climb', 'boulder', 'grip', 'hangboard', 'footwork', 'pull', 'tension', 'traverse', 'send'],
      workout: ['workout', 'fitness', 'exercise', 'pushups', 'squats', 'core', 'pullups', 'calisthenics', 'conditioning'],
      japanese: ['japanese', 'kanji', 'hiragana', 'katakana', 'vocab', 'grammar', 'srs', 'anki', 'immersion'],
      language: ['language', 'vocab', 'vocabulary', 'grammar', 'speaking', 'listening', 'pronunciation'],
      meditation: ['meditation', 'breathwork', 'breathing', 'stillness', 'mindfulness', 'calm', 'diaphragmatic'],
      writing: ['writing', 'story', 'journal', 'dialogue', 'scene', 'character', 'plot', 'narrative'],
      coding: ['code', 'programming', 'software', 'algorithm', 'system', 'data structures', 'debug'],
    };

    for (const rawTarget of targetSkills) {
      const target = rawTarget.trim().toLowerCase();
      if (!target) continue;

      if (item.skillFocus?.toLowerCase().includes(target)) {
        maxScore = Math.max(maxScore, 65);
      }
      if (item.tags?.some((t) => t.toLowerCase().includes(target) || target.includes(t.toLowerCase()))) {
        maxScore = Math.max(maxScore, 55);
      }
      if (item.title.toLowerCase().includes(target)) {
        maxScore = Math.max(maxScore, 50);
      }
      if (itemText.includes(target)) {
        maxScore = Math.max(maxScore, 40);
      }
      if (nodeText.includes(target)) {
        maxScore = Math.max(maxScore, 45);
      }

      const targetTokens = target.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
      for (const token of targetTokens) {
        if (itemText.includes(token)) {
          maxScore = Math.max(maxScore, 35);
        }
        if (nodeText.includes(token)) {
          maxScore = Math.max(maxScore, 35);
        }
      }

      for (const [clusterKey, synonyms] of Object.entries(SEMANTIC_CLUSTERS)) {
        const targetMatchesCluster = target.includes(clusterKey) || synonyms.some((s) => target.includes(s));
        if (targetMatchesCluster) {
          const itemMatchesCluster = itemText.includes(clusterKey) || synonyms.some((s) => itemText.includes(s));
          if (itemMatchesCluster) {
            maxScore = Math.max(maxScore, 50);
          }
        }
      }
    }

    return maxScore;
  }

  function calculateActivityTypeScore(
    item: QuestLibraryItem,
    preferredActivityTypes?: ('practical' | 'study' | 'creation' | 'drill' | 'reflection')[]
  ): number {
    if (!preferredActivityTypes || preferredActivityTypes.length === 0) return 0;
    const hasMatch = preferredActivityTypes.some((pref) => isQuestItemMatchingActivityType(item, pref));
    return hasMatch ? 40 : -15;
  }

  function calculateDomainPreferenceScore(
    item: QuestLibraryItem,
    preferredDomains?: string[],
    deprioritizedDomains?: string[]
  ): number {
    let score = 0;
    if (preferredDomains && preferredDomains.length > 0) {
      if (preferredDomains.includes(item.domain)) {
        score += 60;
      }
    }
    if (deprioritizedDomains && deprioritizedDomains.length > 0) {
      if (deprioritizedDomains.includes(item.domain)) {
        score -= 100;
      }
    }
    return score;
  }

  function calculateNoveltyAndRepetitionScore(
    item: QuestLibraryItem,
    noveltyPreference?: 'low' | 'moderate' | 'high',
    avoidRecentlyRepeatedActivities?: boolean,
    questLogs?: QuestLog[]
  ): number {
    let score = 0;
    const recentLogs = (questLogs || []).slice(0, 30);
    const isRecentlyLogged = recentLogs.some((l) => isSameQuestContent(item, { title: l.questTitle }));

    if (avoidRecentlyRepeatedActivities && isRecentlyLogged) {
      score -= 80;
    }

    if (noveltyPreference === 'high') {
      if (!isRecentlyLogged) score += 30;
      const isBrandNew = !questLogs?.some((l) => isSameQuestContent(item, { title: l.questTitle }));
      if (isBrandNew) score += 25;
    } else if (noveltyPreference === 'low') {
      if (isRecentlyLogged) score += 15;
    }

    return score;
  }

  function calculateDailyIntentCandidateBonus(
    item: QuestLibraryItem,
    intent: DailyQuestIntent | undefined,
    questLogs: QuestLog[]
  ): number {
    if (!intent) return 0;
    let bonus = 0;

    bonus += calculateDurationBudgetScore(item, intent.availableMinutes);
    bonus += calculateEnergyDifficultyScore(item, intent.energyPreference, intent.difficultyPreference);
    bonus += calculateSemanticTargetSkillsScore(item, intent.targetSkills);
    bonus += calculateActivityTypeScore(item, intent.preferredActivityTypes);
    bonus += calculateDomainPreferenceScore(item, intent.preferredDomains, intent.deprioritizedDomains);
    bonus += calculateNoveltyAndRepetitionScore(item, intent.noveltyPreference, intent.avoidRecentlyRepeatedActivities, questLogs);

    return bonus;
  }

  /**
   * Deterministic candidate bonus scoring driven by player's current Forge Path.
   * Heavily weights skillConcepts, learningObjectives, path focus, and path domain.
   */
  function calculateForgePathCandidateBonus(
    item: QuestLibraryItem,
    forgePath: ForgePath | undefined,
    currentGeneratedQuests: Quest[]
  ): number {
    if (!forgePath) return 0;
    let bonus = 0;

    const fpDomain = forgePath.domain?.toLowerCase();
    const itemDomain = item.domain?.toLowerCase();

    // 1. Direct Domain Match
    if (fpDomain && itemDomain === fpDomain) {
      bonus += 60;
    }

    // 2. Skill Concepts Match (Authoritative path skill drivers)
    const skillConcepts = forgePath.skillConcepts || [];
    if (skillConcepts.length > 0) {
      const itemText = `${item.title || ''} ${item.description || ''} ${item.reason || ''} ${item.skillFocus || ''} ${(item.tags || []).join(' ')}`.toLowerCase();

      for (const concept of skillConcepts) {
        const cLower = concept.toLowerCase().trim();
        if (!cLower) continue;

        // Exact concept phrase match
        if (itemText.includes(cLower)) {
          bonus += 50;
          continue;
        }

        // Tokenized word match
        const words = cLower.split(/[\s_-]+/).filter((w) => w.length > 2);
        const matchedWords = words.filter((w) => itemText.includes(w));
        if (matchedWords.length > 0) {
          bonus += Math.round((matchedWords.length / words.length) * 35);
        }
      }

      // Bonus if item explicitly sets skillFocus to one of the path concepts
      if (item.skillFocus && skillConcepts.some((sc) => sc.toLowerCase() === item.skillFocus?.toLowerCase())) {
        bonus += 30;
      }
    }

    // 3. Learning Objectives Match
    const objectives = forgePath.learningObjectives || [];
    if (objectives.length > 0) {
      const itemText = `${item.title || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      for (const obj of objectives) {
        const objLower = obj.toLowerCase().trim();
        if (!objLower) continue;
        if (itemText.includes(objLower)) {
          bonus += 40;
          continue;
        }
        const words = objLower.split(/[\s_-]+/).filter((w) => w.length > 2);
        const matchedWords = words.filter((w) => itemText.includes(w));
        if (matchedWords.length >= 2 || (words.length === 1 && matchedWords.length === 1)) {
          bonus += 25;
        }
      }
    }

    // 4. Focus alignment
    const pathFocus = (forgePath.focus || '').toLowerCase();
    if (pathFocus) {
      const itemTitle = (item.title || '').toLowerCase();
      if (itemTitle.includes(pathFocus)) {
        bonus += 25;
      }
    }

    // 5. Promote concept coverage breadth across active roster
    if (
      item.skillFocus &&
      currentGeneratedQuests.some(
        (gq) => (gq.title || '').toLowerCase().includes(item.skillFocus!.toLowerCase())
      )
    ) {
      bonus -= 15;
    }

    // 6. Goal Track Alignment Bonus
    const resolvedTracks = resolveGoalTracksForForgePath(forgePath);
    if (resolvedTracks.length > 0) {
      const matchingTrack = resolvedTracks.find(
        (t) => t.id === item.goalTrackId || t.domain === item.domain
      );
      if (matchingTrack) {
        bonus += 40;
        if (matchingTrack.currentStage === item.developmentTier) {
          bonus += 20;
        }
        if (matchingTrack.concreteActions?.some((ca) => item.title.toLowerCase().includes(ca.toLowerCase()) || ca.toLowerCase().includes(item.title.toLowerCase()))) {
          bonus += 50;
        }
      }
    }

    // 7. AI Concept & Concrete Action Bonus (Strong preference for concrete, craft-specific actions)
    if (item.isAIConcept || item.contentOrigin === 'Gemini Quest Intelligence' || item.contentOrigin === 'gemini' || item.id.startsWith('lib_ai_')) {
      bonus += 200;
    } else if (item.contentOrigin === 'curriculum_roadmap' || item.id.includes('_track_')) {
      bonus += 100;
    }

    return bonus;
  }

  function markQuestUsed(
    q: { id?: string | number; libraryItemId?: string; conceptId?: string; variationFamily?: string; title?: string },
    usedSet: Set<string>
  ) {
    if (!q) return;
    const key = getQuestContentKey(q);
    if (key) usedSet.add(key);
    if (q.libraryItemId) usedSet.add(`concept:${q.libraryItemId.toLowerCase().trim()}`);
    if (q.conceptId) usedSet.add(`concept:${q.conceptId.toLowerCase().trim()}`);
    if (q.variationFamily) usedSet.add(`concept:${q.variationFamily.toLowerCase().trim()}`);
    if (typeof q.id === 'string') usedSet.add(`concept:${q.id.toLowerCase().trim()}`);
    const norm = normalizeQuestTitle(q.title || '');
    if (norm) usedSet.add(`title:${norm}`);
  }

  function isCandidateUsed(item: QuestLibraryItem, usedSet: Set<string>): boolean {
    if (!item) return false;
    const key = getQuestContentKey(item);
    if (key && usedSet.has(key)) return true;
    if (usedSet.has(`concept:${item.id.toLowerCase().trim()}`)) return true;
    if (item.conceptId && usedSet.has(`concept:${item.conceptId.toLowerCase().trim()}`)) return true;
    if (item.variationFamily && usedSet.has(`concept:${item.variationFamily.toLowerCase().trim()}`)) return true;
    const norm = normalizeQuestTitle(item.title || '');
    if (norm && usedSet.has(`title:${norm}`)) return true;
    return false;
  }

  /**
   * Deterministic Murmur-like hash of refreshSeed + full candidate identity.
   * Produces reproducible results for identical seeds, but distinct candidate scoring
   * across different seeds, avoiding single-character dependencies.
   */
  function getCandidateRefreshHash(seed: number, candidateKey: string): number {
    let h = (seed ^ 0x5bd1e995) >>> 0;
    for (let i = 0; i < candidateKey.length; i++) {
      h = (Math.imul(h ^ candidateKey.charCodeAt(i), 0x5bd1e995) + 0x165667b1) >>> 0;
    }
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
    return (h ^ (h >>> 15)) >>> 0;
  }

  // Candidate Selection Helper with Concept-Level Repetition Protection, Strict Taxonomy & Compatible Fallback Rules
  function selectCandidateItem(
    category: QuestCategory | 'side' | 'main' | 'weekly' | 'epic' | 'legendary' | 'maintenance',
    domain: DevelopmentDomain | 'general_maintenance',
    usedItemIds: Set<string>
  ): QuestLibraryItem | null {
    const candidateList = effectiveLibrary.filter((item) => {
      if (isCandidateUsed(item, usedItemIds)) return false;
      if (isGenericTitle(item.title)) return false;

      if (domain === 'general_maintenance') {
        const isSpecializationDomain = item.domain === 'drawing' || item.domain === 'climbing' || item.domain === 'storytelling';
        if (!params?.forgePath && !focusDomain && isSpecializationDomain) {
          return false;
        }

        const isMaintenance =
          item.category === 'maintenance' ||
          item.id.startsWith('mnt_') ||
          item.tags?.some((t) =>
            [
              'reflection',
              'journal',
              'integrity',
              'review',
              'planning',
              'discipline',
              'reading',
              'organization',
              'audit',
              'mindfulness',
              'mindset',
              'focus',
              'self_awareness',
              'study',
              'maintenance',
            ].includes(t)
          ) ||
          item.pillarId === 'character' ||
          (params?.forgePath && item.pillarId === 'purpose');
        if (!isMaintenance) return false;
      } else if (item.domain !== domain) {
        return false;
      }

      // Strict Category Filtering & Fallback Rules
      const itemCat = item.category;
      const allowedCats = item.allowedCategories || [itemCat];

      if (category === 'epic') {
        if (itemCat !== 'epic' && !allowedCats.includes('epic') && item.rarity !== 'epic') return false;
      } else if (category === 'legendary') {
        if (itemCat !== 'legendary' && !allowedCats.includes('legendary') && item.rarity !== 'legendary') return false;
      } else if (category === 'maintenance') {
        if (itemCat !== 'maintenance' && domain !== 'general_maintenance' && !allowedCats.includes('maintenance')) return false;
      } else if (category === 'weekly') {
        if (itemCat !== 'weekly' && !allowedCats.includes('weekly')) {
          const hasWeeklyItems = effectiveLibrary.some(
            (q) => q.domain === domain && (q.category === 'weekly' || q.allowedCategories?.includes('weekly')) && !isCandidateUsed(q, usedItemIds)
          );
          if (hasWeeklyItems) return false;
          if (itemCat !== 'main' && !allowedCats.includes('main')) return false;
        }
      } else if (category === 'side') {
        if (itemCat !== 'side' && !allowedCats.includes('side')) {
          const hasSideItems = effectiveLibrary.some(
            (q) => q.domain === domain && (q.category === 'side' || q.allowedCategories?.includes('side')) && !isCandidateUsed(q, usedItemIds)
          );
          if (hasSideItems) return false;
          if (itemCat !== 'main' && !allowedCats.includes('main')) return false;
        }
      } else if (category === 'main') {
        if (itemCat !== 'main' && !allowedCats.includes('main')) return false;
      }

      // Multi-Level Repetition Protection:
      const cdDays = item.cooldownDays || 3;

      const wasRecentlyCompleted = safeQuestLogs.some((l) => {
        const ageDays = (nowMs - new Date(l.completedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays >= cdDays) return false;
        if (isSameQuestContent(item, { title: l.questTitle })) return true;
        return false;
      });

      if (wasRecentlyCompleted) return false;

      // Intent filter: Avoid recently repeated activities (14-day recency cutoff)
      if (params?.dailyIntent?.avoidRecentlyRepeatedActivities) {
        const completedRecently = safeQuestLogs.some((l) => {
          const ageDays = (nowMs - new Date(l.completedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays > 14) return false;
          return isSameQuestContent(item, { title: l.questTitle });
        });
        if (completedRecently) return false;
      }

      // Intent filter: Candidate cannot individually exceed user's available time budget
      if (params?.dailyIntent?.availableMinutes && params.dailyIntent.availableMinutes > 0) {
        const duration = parseQuestDurationMinutes(item);
        if (duration > params.dailyIntent.availableMinutes) return false;
      }

      // Intent filter: Explicit activity type constraint (Hard eligibility filter)
      const explicitActivityTypes = getExplicitActivityTypesFromIntent(params?.dailyIntent);
      if (explicitActivityTypes && explicitActivityTypes.length > 0) {
        const matchesExplicit = explicitActivityTypes.some((actType) =>
          isQuestItemMatchingActivityType(item, actType)
        );
        if (!matchesExplicit) return false;
      }

      // Quest Band Eligibility Check (Forge Mastery Bands & Curriculum Stage Guard)
      const targetSkillForCand = effectiveActiveSkills.find(
        (s) => (item.goalTrackId && s.goalTrackId === item.goalTrackId) || (s.domain === item.domain)
      );
      const candStage = targetSkillForCand?.currentStage || 1;
      const candidateBand = assignQuestBand(
        {
          questBand: (item as any).questBand || (item as any).band,
          estimatedDuration: item.estimatedDuration,
          estimatedDurationMinutes: item.estimatedDurationMinutes,
          developmentTier: item.developmentTier,
          curriculumStage: candStage,
        },
        highestUnlockedBand,
        candStage
      );
      if (!isQuestBandEligible(candidateBand, highestUnlockedBand, candStage)) {
        return false;
      }

      return true;
    });

    if (candidateList.length === 0) {
      // Relax cooldown check while strictly enforcing domain/maintenance, category rules, and explicit activity filter
      const explicitActivityTypes = getExplicitActivityTypesFromIntent(params?.dailyIntent);
      const relaxedList = effectiveLibrary.filter((item) => {
        if (isCandidateUsed(item, usedItemIds)) return false;
        if (isGenericTitle(item.title)) return false;

        if (explicitActivityTypes && explicitActivityTypes.length > 0) {
          const matchesExplicit = explicitActivityTypes.some((actType) =>
            isQuestItemMatchingActivityType(item, actType)
          );
          if (!matchesExplicit) return false;
        }

        if (domain === 'general_maintenance') {
          const isSpecializationDomain = item.domain === 'drawing' || item.domain === 'climbing' || item.domain === 'storytelling';
          if (!params?.forgePath && !focusDomain && isSpecializationDomain) {
            return false;
          }

          return (
            item.category === 'maintenance' ||
            item.id.startsWith('mnt_') ||
            item.tags?.some((t) =>
              [
                'reflection',
                'journal',
                'integrity',
                'review',
                'planning',
                'discipline',
                'reading',
                'organization',
                'audit',
                'mindfulness',
                'mindset',
                'focus',
                'self_awareness',
                'study',
                'maintenance',
              ].includes(t)
            ) ||
            item.pillarId === 'character' ||
            (params?.forgePath && item.pillarId === 'purpose')
          );
        }
        if (item.domain !== domain) return false;

        if (category === 'epic' && item.category !== 'epic' && item.rarity !== 'epic') return false;
        if (category === 'legendary' && item.category !== 'legendary' && item.rarity !== 'legendary') return false;

        return true;
      });

      if (relaxedList.length > 0) {
        relaxedList.sort((a, b) => {
          const nodeA = findBestSkillNodeForQuest(a) || UNIFIED_SKILL_NODES[0];
          const nodeB = findBestSkillNodeForQuest(b) || UNIFIED_SKILL_NODES[0];
          const targetDiffA = getTargetDifficulty(nodeA, undefined, safeQuestLogs, safeExistingQuests);
          const targetDiffB = getTargetDifficulty(nodeB, undefined, safeQuestLogs, safeExistingQuests);

          const candIdentityA = `${a.id || ''}|${a.conceptId || ''}|${a.title || ''}`;
          const candIdentityB = `${b.id || ''}|${b.conceptId || ''}|${b.title || ''}`;
          const candHashA = getCandidateRefreshHash(baseSeed, candIdentityA);
          const candHashB = getCandidateRefreshHash(baseSeed, candIdentityB);

          const jitterA = (forceRefresh || params?.seed !== undefined)
            ? ((candHashA % 61) - 30)
            : 0;
          const jitterB = (forceRefresh || params?.seed !== undefined)
            ? ((candHashB % 61) - 30)
            : 0;

          const scoreA =
            scoreQuestCandidate(a, {
              targetDifficulty: targetDiffA,
              node: nodeA,
              activeQuests: generatedQuests,
              questLogs: safeQuestLogs,
              seed: baseSeed + (candHashA % 1000),
            }).candidateScore +
            calculateDailyIntentCandidateBonus(a, params?.dailyIntent, safeQuestLogs) +
            calculateForgePathCandidateBonus(a, params?.forgePath, generatedQuests) +
            jitterA;

          const scoreB =
            scoreQuestCandidate(b, {
              targetDifficulty: targetDiffB,
              node: nodeB,
              activeQuests: generatedQuests,
              questLogs: safeQuestLogs,
              seed: baseSeed + (candHashB % 1000),
            }).candidateScore +
            calculateDailyIntentCandidateBonus(b, params?.dailyIntent, safeQuestLogs) +
            calculateForgePathCandidateBonus(b, params?.forgePath, generatedQuests) +
            jitterB;

          return scoreB - scoreA;
        });
        return relaxedList[0];
      }

      // Safe domain fallback: if all candidates in domain were exhausted by cooldown/usedItemIds, select any unassigned item for domain
      if (domain !== 'general_maintenance') {
        const domainFallback = effectiveLibrary.find(
          (item) =>
            item.domain === domain &&
            !isGenericTitle(item.title) &&
            !generatedQuests.some((gq) => gq.libraryItemId === item.id) &&
            (!explicitActivityTypes ||
              explicitActivityTypes.length === 0 ||
              explicitActivityTypes.some((actType) => isQuestItemMatchingActivityType(item, actType)))
        );
        if (domainFallback) return domainFallback;
      }

      return null;
    }

    // Capability-Based Candidate Scoring (0-100 deterministic ranking from Unified Skill Tree + Daily Intent + Forge Path)
    candidateList.sort((a, b) => {
      const nodeA = findBestSkillNodeForQuest(a) || UNIFIED_SKILL_NODES[0];
      const nodeB = findBestSkillNodeForQuest(b) || UNIFIED_SKILL_NODES[0];
      const targetDiffA = getTargetDifficulty(nodeA, undefined, safeQuestLogs, safeExistingQuests);
      const targetDiffB = getTargetDifficulty(nodeB, undefined, safeQuestLogs, safeExistingQuests);

      const candIdentityA = `${a.id || ''}|${a.conceptId || ''}|${a.title || ''}`;
      const candIdentityB = `${b.id || ''}|${b.conceptId || ''}|${b.title || ''}`;
      const candHashA = getCandidateRefreshHash(baseSeed, candIdentityA);
      const candHashB = getCandidateRefreshHash(baseSeed, candIdentityB);

      const jitterA = (forceRefresh || params?.seed !== undefined)
        ? ((candHashA % 61) - 30)
        : 0;
      const jitterB = (forceRefresh || params?.seed !== undefined)
        ? ((candHashB % 61) - 30)
        : 0;

      const scoreA =
        scoreQuestCandidate(a, {
          targetDifficulty: targetDiffA,
          node: nodeA,
          activeQuests: generatedQuests,
          questLogs: safeQuestLogs,
          seed: baseSeed + (candHashA % 1000),
        }).candidateScore +
        calculateDailyIntentCandidateBonus(a, params?.dailyIntent, safeQuestLogs) +
        calculateForgePathCandidateBonus(a, params?.forgePath, generatedQuests) +
        jitterA;

      const scoreB =
        scoreQuestCandidate(b, {
          targetDifficulty: targetDiffB,
          node: nodeB,
          activeQuests: generatedQuests,
          questLogs: safeQuestLogs,
          seed: baseSeed + (candHashB % 1000),
        }).candidateScore +
        calculateDailyIntentCandidateBonus(b, params?.dailyIntent, safeQuestLogs) +
        calculateForgePathCandidateBonus(b, params?.forgePath, generatedQuests) +
        jitterB;

      return scoreB - scoreA;
    });

    return candidateList[0];
  }

  const generatedQuests: Quest[] = [];
  const usedItemIds = new Set<string>();
  // Seed usedItemIds: For automatic daily generation, avoid immediate repeats. For explicit refresh, allow fresh rerolls while locking completed history.
  if (params?.seed === undefined && !forceRefresh) {
    safeExistingQuests.forEach((q) => {
      markQuestUsed(q, usedItemIds);
    });
  } else {
    safeExistingQuests
      .filter((q) => q.completedToday || (q.completionCount || 0) > 0 || Boolean(q.lastCompletedAt))
      .forEach((q) => {
        markQuestUsed(q, usedItemIds);
      });
  }
  safeQuestLogs.forEach((l) => {
    markQuestUsed({ title: l.questTitle }, usedItemIds);
  });
  const usedNumericIds = new Set<number>();

  // Helper to determine if a landmark quest is ACTIVE (incomplete)
  const isLandmarkIncomplete = (q: Quest) => !q.completedToday && (q.completionCount || 0) === 0 && !q.lastCompletedAt && !q.isArchived;

  // Active quests pool for concept-based state preservation (never positional index matching!)
  // On explicit forceRefresh, this is empty so incomplete auto-generated quests are genuinely rerolled (Part 21)
  const availableActiveQuests = forceRefresh
    ? []
    : safeExistingQuests.filter(
        (q) => !q.isArchived && !q.completedToday && (q.completionCount || 0) === 0 && !q.lastCompletedAt
      );

  function findExistingActiveQuestForConcept(item: QuestLibraryItem): Quest | undefined {
    const matchIdx = availableActiveQuests.findIndex((q) => isSameQuestContent(item, q));

    if (matchIdx !== -1) {
      const matched = availableActiveQuests[matchIdx];
      availableActiveQuests.splice(matchIdx, 1);
      return matched;
    }
    return undefined;
  }

  // Preserve ALL historical completed quests (today's completions + past history)
  const completedQuests = safeExistingQuests.filter(
    (q) => q.completedToday || (q.completionCount || 0) > 0 || Boolean(q.lastCompletedAt)
  );
  completedQuests.forEach((cq) => {
    if (!generatedQuests.some((gq) => gq.id === cq.id)) {
      generatedQuests.push(cq);
      if (typeof cq.id === 'number') usedNumericIds.add(cq.id);
    }
  });

  // Helper to find candidate for a given slot preference with graceful reallocation
  function getCandidateForSlot(
    category: QuestCategory | 'side' | 'main' | 'weekly' | 'epic' | 'legendary',
    preferredRole: DevelopmentDomain | 'secondary_slot' | 'maintenance_slot'
  ): { item: QuestLibraryItem; domainRole: DevelopmentDomain | 'general_maintenance' } | null {
    let candidate: QuestLibraryItem | null = null;

    if (preferredRole === 'maintenance_slot') {
      candidate = selectCandidateItem(category, 'general_maintenance', usedItemIds);
      if (candidate) return { item: candidate, domainRole: 'general_maintenance' };
      if (focusDomain) {
        candidate = selectCandidateItem(category, focusDomain, usedItemIds);
        if (candidate) return { item: candidate, domainRole: focusDomain };
      }
      return null;
    }

    if (preferredRole === 'secondary_slot') {
      if (params?.dailyIntent?.preferredDomains && params.dailyIntent.preferredDomains.length > 0) {
        for (const prefDom of params.dailyIntent.preferredDomains) {
          candidate = selectCandidateItem(category, prefDom as DevelopmentDomain, usedItemIds);
          if (candidate) return { item: candidate, domainRole: prefDom as DevelopmentDomain };
        }
      }

      if (params?.forgePath?.domain) {
        candidate = selectCandidateItem(category, params.forgePath.domain, usedItemIds);
        if (candidate) return { item: candidate, domainRole: params.forgePath.domain };
      }

      if (secondaryActiveLifePaths.length > 0) {
        for (const secDomain of secondaryActiveLifePaths) {
          candidate = selectCandidateItem(category, secDomain, usedItemIds);
          if (candidate) return { item: candidate, domainRole: secDomain };
        }
      }
      if (focusDomain) {
        candidate = selectCandidateItem(category, focusDomain, usedItemIds);
        if (candidate) return { item: candidate, domainRole: focusDomain };
      }

      candidate = selectCandidateItem(category, 'general_maintenance', usedItemIds);
      if (candidate) return { item: candidate, domainRole: 'general_maintenance' };

      // Only draw from neglected or all domains if an active Forge Path, focus domain, or secondary path exists
      // If there is no active Forge Path or intent, we MUST NOT invent a specialization!
      if (params?.forgePath || focusDomain || secondaryActiveLifePaths.length > 0) {
        if (neglectedDomains.length > 0) {
          for (const negDomain of neglectedDomains) {
            candidate = selectCandidateItem(category, negDomain, usedItemIds);
            if (candidate) return { item: candidate, domainRole: negDomain };
          }
        }

        for (const dom of allDomainsList) {
          candidate = selectCandidateItem(category, dom, usedItemIds);
          if (candidate) return { item: candidate, domainRole: dom };
        }
      }

      return null;
    }

    if (preferredRole) {
      candidate = selectCandidateItem(category, preferredRole, usedItemIds);
      if (candidate) return { item: candidate, domainRole: preferredRole };
    }

    if (focusDomain && preferredRole !== focusDomain) {
      candidate = selectCandidateItem(category, focusDomain, usedItemIds);
      if (candidate) return { item: candidate, domainRole: focusDomain };
    }

    return null;
  }

  // Helper to infer quest domain from forgePathDomain, libraryItemId, conceptId, or title
  function inferQuestDomain(q: Quest): DevelopmentDomain | null {
    if (q.forgePathDomain) {
      return q.forgePathDomain as DevelopmentDomain;
    }
    if (q.libraryItemId) {
      const libItem = effectiveLibrary.find((item) => item.id === q.libraryItemId);
      if (libItem) return libItem.domain;
    }
    if (q.conceptId) {
      const dotIdx = q.conceptId.indexOf('.');
      if (dotIdx > 0) {
        return q.conceptId.slice(0, dotIdx) as DevelopmentDomain;
      }
    }
    return parseDomainFromText(q.title, params?.forgePath?.domain);
  }

  // Authoritative Current Specialization
  const currentSpecialization = params?.forgePath?.domain;

  // ====================================================================
  // 1. LANDMARK PRESERVATION (No Mandatory Epic/Legendary Generation!)
  // ====================================================================
  const existingLegendary =
    safeExistingQuests.find(
      (q) => (q.category === 'legendary' || q.rarity === 'legendary') && isLandmarkIncomplete(q)
    ) || findWithheldLandmark('legendary', safeExistingQuests, safeQuestLogs);

  const existingLegendaryProvenance = existingLegendary?.forgePathDomain;
  const existingLegendaryDomain = existingLegendary ? inferQuestDomain(existingLegendary) : null;
  let isLegendaryDomainMatch = false;
  let isLegendaryInvalidated = false;

  if (existingLegendary) {
    if (isGenericTitle(existingLegendary.title)) {
      isLegendaryInvalidated = true;
      isLegendaryDomainMatch = false;
    } else if (
      (existingLegendaryDomain && activeTrackDomains.has(existingLegendaryDomain)) ||
      (existingLegendaryProvenance && activeTrackDomains.has(existingLegendaryProvenance)) ||
      (currentSpecialization && (existingLegendaryDomain === currentSpecialization || existingLegendaryProvenance === currentSpecialization))
    ) {
      isLegendaryDomainMatch = true;
    } else {
      isLegendaryInvalidated = true;
      isLegendaryDomainMatch = false;
    }
  }

  const hasHardDailyBudget =
    typeof params?.dailyIntent?.availableMinutes === 'number' &&
    params.dailyIntent.availableMinutes > 0;
  const dailyAvailableMinutes = params?.dailyIntent?.availableMinutes;

  if (existingLegendary && !isLegendaryInvalidated) {
    const legDuration = Math.max(60, parseQuestDurationMinutes(existingLegendary.estimatedDuration));
    const isBudgetSufficient = !hasHardDailyBudget || (dailyAvailableMinutes !== undefined && dailyAvailableMinutes >= legDuration);

    if (!isBudgetSufficient) {
      saveWithheldLandmark(existingLegendary);
      lastHeldBackLandmarks.push({
        id: existingLegendary.id,
        title: existingLegendary.title,
        category: 'legendary',
        estimatedDuration: existingLegendary.estimatedDuration,
        requiredMinutes: legDuration,
        reason: `Your Legendary Quest is paused today — need ~${legDuration} min available`,
      });
    } else {
      removeWithheldLandmark(existingLegendary);
      if (isLegendaryDomainMatch) {
        if (!generatedQuests.some((gq) => gq.id === existingLegendary.id)) {
          generatedQuests.push(existingLegendary);
          if (typeof existingLegendary.id === 'number') usedNumericIds.add(existingLegendary.id);
          markQuestUsed(existingLegendary, usedItemIds);
        }
      }
    }
  } else if (existingLegendary && isLegendaryInvalidated) {
    removeWithheldLandmark(existingLegendary);
  }

  // Check existing Epic landmark
  const existingEpic =
    safeExistingQuests.find((q) => q.category === 'epic' && isLandmarkIncomplete(q)) ||
    findWithheldLandmark('epic', safeExistingQuests, safeQuestLogs);

  const existingEpicProvenance = existingEpic?.forgePathDomain;
  const existingEpicDomain = existingEpic ? inferQuestDomain(existingEpic) : null;
  let isEpicDomainMatch = false;
  let isEpicInvalidated = false;

  if (existingEpic) {
    if (isGenericTitle(existingEpic.title)) {
      isEpicInvalidated = true;
      isEpicDomainMatch = false;
    } else if (
      (existingEpicDomain && activeTrackDomains.has(existingEpicDomain)) ||
      (existingEpicProvenance && activeTrackDomains.has(existingEpicProvenance)) ||
      (currentSpecialization && (existingEpicDomain === currentSpecialization || existingEpicProvenance === currentSpecialization))
    ) {
      isEpicDomainMatch = true;
    } else {
      isEpicInvalidated = true;
      isEpicDomainMatch = false;
    }
  }

  if (existingEpic && !isEpicInvalidated) {
    const epicDuration = Math.max(45, parseQuestDurationMinutes(existingEpic.estimatedDuration));
    const isEpicBudgetSufficient = !hasHardDailyBudget || (dailyAvailableMinutes !== undefined && dailyAvailableMinutes >= epicDuration);

    if (!isEpicBudgetSufficient) {
      saveWithheldLandmark(existingEpic);
      lastHeldBackLandmarks.push({
        id: existingEpic.id,
        title: existingEpic.title,
        category: 'epic',
        estimatedDuration: existingEpic.estimatedDuration,
        requiredMinutes: epicDuration,
        reason: `Your Epic Quest is paused today — need ~${epicDuration} min available`,
      });
    } else {
      removeWithheldLandmark(existingEpic);
      if (isEpicDomainMatch) {
        const hasLegendaryInRoster = generatedQuests.some((gq) => gq.category === 'legendary' || gq.rarity === 'legendary');
        if (!hasLegendaryInRoster && !generatedQuests.some((gq) => gq.id === existingEpic.id)) {
          generatedQuests.push(existingEpic);
          if (typeof existingEpic.id === 'number') usedNumericIds.add(existingEpic.id);
          markQuestUsed(existingEpic, usedItemIds);
        }
      }
    }
  } else if (existingEpic && isEpicInvalidated) {
    removeWithheldLandmark(existingEpic);
  }

  // NOTE: In Forge 2.3, we do NOT force-generate a synthetic Epic or Legendary quest
  // if none legitimately exists. A daily roster does NOT require an Epic or Legendary quest.

  // ====================================================================
  // 2. PRESERVE USER MANUAL QUESTS & CURRENT ACTIVE EXECUTION
  // ====================================================================
  const manualQuests = safeExistingQuests.filter((q) => !q.isAutoGenerated && !q.completedToday);
  manualQuests.forEach((mq) => {
    if (generatedQuests.filter((q) => !q.completedToday).length < MAX_ACTIVE_QUESTS) {
      if (!generatedQuests.some((gq) => gq.id === mq.id || gq.title === mq.title)) {
        generatedQuests.push(mq);
        if (typeof mq.id === 'number') usedNumericIds.add(mq.id);
        markQuestUsed(mq, usedItemIds);
      }
    }
  });

  const currentExec = getActiveQuestExecution();
  if (currentExec && (currentExec.status === 'ACTIVE' || currentExec.status === 'AWAITING_CONFIRMATION' || currentExec.status === 'EXTENSION')) {
    const executingQuest = safeExistingQuests.find((q) => q.id === currentExec.questId);
    if (executingQuest && !generatedQuests.some((gq) => gq.id === executingQuest.id)) {
      generatedQuests.unshift(executingQuest);
      if (typeof executingQuest.id === 'number') usedNumericIds.add(executingQuest.id);
      markQuestUsed(executingQuest, usedItemIds);
    }
  }

  // ====================================================================
  // 3. CURRICULUM-FIRST CANDIDATE SELECTION (Up to MAX_ACTIVE_QUESTS)
  // ====================================================================
  const currentActiveQuests = generatedQuests.filter((q) => !q.completedToday);
  const remainingSlots = Math.max(0, MAX_ACTIVE_QUESTS - currentActiveQuests.length);

  function getCandidateActiveSkillPriority(candidateItem: { skillId?: string; goalTrackId?: string; domain?: string; forgePathDomain?: string; title?: string }): number | null {
    if (effectiveActiveSkills.length === 0) return null;
    if (candidateItem.skillId) {
      const match = effectiveActiveSkills.find((s) => s.id === candidateItem.skillId);
      return match ? (match.activePriority || 1) : null;
    }
    if (candidateItem.goalTrackId) {
      const match = effectiveActiveSkills.find((s) => s.goalTrackId === candidateItem.goalTrackId);
      return match ? (match.activePriority || 1) : null;
    }
    for (const s of effectiveActiveSkills) {
      const cDom = candidateItem.domain || candidateItem.forgePathDomain;
      if (cDom && s.domain && cDom === s.domain) {
        return s.activePriority || 1;
      }
      const sName = (s.name || '').toLowerCase();
      const iTitle = (candidateItem.title || '').toLowerCase();
      if (sName && (iTitle.includes(sName) || sName.includes(cDom || ''))) {
        return s.activePriority || 1;
      }
    }
    return null;
  }

  const hasHardBudget = typeof params?.dailyIntent?.availableMinutes === 'number' && params.dailyIntent.availableMinutes > 0;
  const totalBudget = hasHardBudget ? params.dailyIntent!.availableMinutes! : Infinity;
  const consumedMinutes = currentActiveQuests.reduce(
    (sum, q) => sum + parseQuestDurationMinutes(q.estimatedDuration),
    0
  );
  let remainingBudget = hasHardBudget ? Math.max(0, totalBudget - consumedMinutes) : Infinity;

  interface SelectedCandidate {
    item: QuestLibraryItem;
    variation: any;
    stableId: number;
    existing?: Quest;
    score: number;
    category: QuestCategory;
    rarity: Quest['rarity'];
    prefix: string;
    identityTag: string;
    xpMultiplier?: number;
  }

  const selectedNewCandidates: SelectedCandidate[] = [];

  if (remainingSlots > 0 && remainingBudget >= 5) {
    const candBaseSeed = baseSeed + 50;

    function getEligiblePool(cooldownDays: number): QuestLibraryItem[] {
      return effectiveLibrary.filter((item) => {
        if (isCandidateUsed(item, usedItemIds)) return false;
        if (safeExistingQuests.some((q) => q.completedToday && isSameQuestContent(item, q))) return false;

        if (hasHardBudget) {
          const duration = parseQuestDurationMinutes(item.estimatedDuration);
          if (duration > remainingBudget) return false;
        }

        if (params?.dailyIntent?.deprioritizedDomains?.includes(item.domain as any)) return false;

        // Explicit intent activity types filter
        const explicitActivityTypes = getExplicitActivityTypesFromIntent(params?.dailyIntent);
        if (explicitActivityTypes && explicitActivityTypes.length > 0) {
          const matchesExplicit = explicitActivityTypes.some((actType) =>
            isQuestItemMatchingActivityType(item, actType)
          );
          if (!matchesExplicit) return false;
        }

        // Cooldown check
        if (cooldownDays > 0 && isQuestInCooldown(item, safeQuestLogs, cooldownDays)) return false;

        // Forge Band Eligibility Guard
        const candidateBand = (item as any).questBand || (item as any).band || 1;
        const candStage = (item as any).curriculumStage || (item as any).developmentTier || 1;
        if (!isQuestBandEligible(candidateBand, highestUnlockedBand, candStage)) return false;

        // Landmark candidate constraint: do not over-stack landmarks
        if (item.category === 'legendary' || item.category === 'epic') {
          const hasLandmarkAlready =
            generatedQuests.some((q) => !q.completedToday && (q.category === 'epic' || q.category === 'legendary' || q.rarity === 'legendary')) ||
            selectedNewCandidates.some((c) => c.category === 'epic' || c.category === 'legendary');
          if (hasLandmarkAlready) return false;
          const duration = parseQuestDurationMinutes(item.estimatedDuration);
          if (duration < 45) return false;
        }

        return true;
      });
    }

    function scoreCandidateItem(item: QuestLibraryItem, idx: number): number {
      let score = 100;

      const node = findBestSkillNodeForQuest(item);
      if (node) {
        const targetDiff = getTargetDifficulty(node, undefined, safeQuestLogs, safeExistingQuests);
        const scoredObj = scoreQuestCandidate(item, {
          targetDifficulty: targetDiff,
          node,
          activeQuests: [...generatedQuests, ...selectedNewCandidates.map((c) => c.item as any)],
          questLogs: safeQuestLogs,
          seed: candBaseSeed + idx,
        });
        score += scoredObj.candidateScore;
      }

      score += calculateDailyIntentCandidateBonus(item, params?.dailyIntent, safeQuestLogs);
      score += calculateForgePathCandidateBonus(item, params?.forgePath, [
        ...generatedQuests,
        ...selectedNewCandidates.map((c) => c.item as any),
      ]);

      // Multidisciplinary Track Distribution Bonus
      const allActiveItemsSoFar = [
        ...generatedQuests.filter((q) => !q.completedToday),
        ...selectedNewCandidates.map((c) => c.item),
      ];

      const sameTrackCount = allActiveItemsSoFar.filter((q) => {
        if (item.goalTrackId && (q as any).goalTrackId) {
          return (q as any).goalTrackId === item.goalTrackId;
        }
        const qDom = (q as any).domain || (q as any).forgePathDomain;
        return qDom === item.domain;
      }).length;

      if (sameTrackCount === 0) {
        score += 85;
      } else if (sameTrackCount === 1) {
        score += 15;
      } else {
        score -= 35;
      }

      // Active Skill Priority & Quota Balancing
      // Priority 1 -> target ~2-3 quests (and Main Quest nomination)
      // Priority 2 -> target ~2 quests
      // Priority 3 -> target ~1-2 quests
      const skillPriority = getCandidateActiveSkillPriority(item);
      if (skillPriority !== null) {
        if (skillPriority === 1) score += 110;
        else if (skillPriority === 2) score += 80;
        else if (skillPriority === 3) score += 60;

        const currentCountForPriority = allActiveItemsSoFar.filter((q) => {
          return getCandidateActiveSkillPriority(q as any) === skillPriority;
        }).length;

        if (currentCountForPriority === 0) {
          score += 140; // Massive boost to ensure every active skill gets initial representation
        } else if (currentCountForPriority === 1) {
          score += 60;  // Boost to reach target of ~2
        } else if (currentCountForPriority === 2) {
          score -= 50;  // Allow other skills with 1 quest to reach 2
        } else if (currentCountForPriority >= 3) {
          score -= 130; // Prevent single active skill from starving other active skills
        }
      }

      // Action Diversity Bonus: penalize duplicate questType
      const sameActionTypeCount = allActiveItemsSoFar.filter(
        (q) => (q as any).questType && (q as any).questType === item.questType
      ).length;
      if (sameActionTypeCount > 0) {
        score -= 25;
      }

      // Provenance & Curriculum Hierarchy Bonus
      if (item.isAIConcept || item.contentOrigin === 'Gemini Quest Intelligence' || item.id.startsWith('lib_ai_')) {
        score += 160;
      } else if (item.contentOrigin === 'curriculum_roadmap' || (item.id && item.id.includes('_track_'))) {
        score += 130;
      }

      // Refresh Novelty Jitter (Deterministic Hash of refreshSeed + full candidate identity)
      if (forceRefresh || params?.seed !== undefined) {
        const candIdentity = `${item.id || ''}|${item.conceptId || ''}|${item.title || ''}`;
        const candHash = getCandidateRefreshHash(candBaseSeed, candIdentity);
        // Meaningful variation swing (-45 to +45) to vary candidate selection across refresh seeds
        const refreshJitter = ((candHash % 91) - 45);
        score += refreshJitter;
      }

      return score;
    }

    function addCandidateToRoster(topItem: QuestLibraryItem, score: number) {
      markQuestUsed(topItem, usedItemIds);
      const itemDuration = parseQuestDurationMinutes(topItem.estimatedDuration);
      if (hasHardBudget) remainingBudget -= itemDuration;

      const dom = topItem.domain as DevelopmentDomain;
      const targetTier = domainTargetTiers[dom] || 1;
      const diffLevel = domainDifficultyLevels[dom] || 1;
      const variation = applyDomainProgressiveOverload(
        topItem,
        targetTier,
        diffLevel,
        candBaseSeed + selectedNewCandidates.length * 11,
        primaryBuildTitle
      );

      const existing = findExistingActiveQuestForConcept(topItem);
      const stableId = resolveQuestNumericId(existing?.id, selectedNewCandidates.length + 1, usedNumericIds);

      selectedNewCandidates.push({
        item: topItem,
        variation,
        stableId,
        existing,
        score,
        category: 'side',
        rarity: topItem.rarity || 'uncommon',
        prefix: '',
        identityTag: 'Daily Support Action',
      });
    }

    // ====================================================================
    // PASS 1: Guarantee initial representation for each Active Skill (if candidates exist)
    // Priority order: Skill #1 > Skill #2 > Skill #3
    // ====================================================================
    if (effectiveActiveSkills.length > 0) {
      for (const activeSkill of effectiveActiveSkills) {
        if (selectedNewCandidates.length >= remainingSlots) break;
        if (hasHardBudget && remainingBudget < 5) break;

        const alreadyRepresented = [
          ...currentActiveQuests,
          ...selectedNewCandidates.map((c) => c.item),
        ].some((q) => {
          return (q as any).skillId === activeSkill.id || (activeSkill.goalTrackId && (q as any).goalTrackId === activeSkill.goalTrackId);
        });

        if (!alreadyRepresented) {
          let pool = getEligiblePool(14).filter((item) => item.skillId === activeSkill.id || (activeSkill.goalTrackId && item.goalTrackId === activeSkill.goalTrackId));
          if (pool.length === 0) {
            pool = getEligiblePool(3).filter((item) => item.skillId === activeSkill.id || (activeSkill.goalTrackId && item.goalTrackId === activeSkill.goalTrackId));
          }
          if (pool.length === 0) {
            pool = getEligiblePool(0).filter((item) => item.skillId === activeSkill.id || (activeSkill.goalTrackId && item.goalTrackId === activeSkill.goalTrackId));
          }

          if (pool.length > 0) {
            const scored = pool.map((item, idx) => ({
              item,
              score: scoreCandidateItem(item, idx),
            }));
            scored.sort((a, b) => b.score - a.score);
            addCandidateToRoster(scored[0].item, scored[0].score);
          }
        }
      }
    }

    // ====================================================================
    // PASS 2: Fill remaining slots using existing priority scoring & quota balancing
    // Target ~2 / 2 / 2 when 3 active skills are present
    // Priority order still matters: Skill #1 > Skill #2 > Skill #3
    // ====================================================================
    while (selectedNewCandidates.length < remainingSlots) {
      if (hasHardBudget && remainingBudget < 5) break;
      if (effectiveActiveSkills.length === 0 && selectedNewCandidates.length >= 1) break;

      let eligiblePool = getEligiblePool(14);
      if (eligiblePool.length === 0) eligiblePool = getEligiblePool(3);
      if (eligiblePool.length === 0) eligiblePool = getEligiblePool(0);

      if (eligiblePool.length === 0) break;

      const scoredCandidates = eligiblePool.map((item, idx) => ({
        item,
        score: scoreCandidateItem(item, idx),
      }));

      scoredCandidates.sort((a, b) => b.score - a.score);
      const topChoice = scoredCandidates[0];
      addCandidateToRoster(topChoice.item, topChoice.score);
    }

    // ====================================================================
    // PASS 3: PER-SKILL FALLBACK RECOVERY (Ensure full 6-slot roster)
    // If eligiblePool was exhausted before filling all remainingSlots (e.g. 4/6),
    // derive additional authentic curriculum quests from under-represented Active Skills.
    // ====================================================================
    if (effectiveActiveSkills.length > 0 && selectedNewCandidates.length < remainingSlots) {
      let recoveryAttempts = 0;
      while (selectedNewCandidates.length < remainingSlots && recoveryAttempts < 15) {
        recoveryAttempts++;
        if (hasHardBudget && remainingBudget < 5) break;

        // Count current representation per active skill
        const allCurrentQuests = [
          ...generatedQuests.filter((q) => !q.completedToday),
          ...selectedNewCandidates.map((c) => c.item),
        ];

        const skillRepresentation = effectiveActiveSkills.map((s) => {
          const count = allCurrentQuests.filter((q: any) => {
            if (q.skillId && q.skillId === s.id) return true;
            if (s.goalTrackId && q.goalTrackId === s.goalTrackId) return true;
            if (q.domain && s.domain && q.domain === s.domain) return true;
            return false;
          }).length;
          return { skill: s, count, priority: s.activePriority || 99 };
        });

        // Pick skill with fewest items (break tie with activePriority)
        skillRepresentation.sort((a, b) => a.count - b.count || a.priority - b.priority);
        const targetSkillObj = skillRepresentation[0]?.skill;
        if (!targetSkillObj) break;

        // Look for any remaining eligible item in effectiveLibrary for this skill
        const candidateForSkill = effectiveLibrary.find((item) => {
          if (isCandidateUsed(item, usedItemIds)) return false;
          if (safeExistingQuests.some((q) => q.completedToday && isSameQuestContent(item, q))) return false;
          const matches =
            item.skillId === targetSkillObj.id ||
            (targetSkillObj.goalTrackId && item.goalTrackId === targetSkillObj.goalTrackId) ||
            (targetSkillObj.domain && item.domain === targetSkillObj.domain);
          if (!matches) return false;
          const b = (item as any).questBand || (item as any).band || 1;
          const stg = targetSkillObj.currentStage || 1;
          return isQuestBandEligible(b, highestUnlockedBand, stg);
        });

        if (candidateForSkill) {
          addCandidateToRoster(candidateForSkill, scoreCandidateItem(candidateForSkill, 99));
        } else {
          // Synthesize a structured curriculum drill directly from the active skill
          const sName = targetSkillObj.name || 'Skill';
          const sDom = (targetSkillObj.domain || sName.toLowerCase().replace(/[^a-z0-9_]+/g, '_')).slice(0, 30);
          const sStage = Math.max(1, Math.min(highestUnlockedBand, targetSkillObj.currentStage || 1)) as 1 | 2 | 3 | 4 | 5 | 6;
          const trackMap = getDomainMapping(sDom);

          const drillOptions = [
            {
              title: `${sName} Technical Form & Precision Drill`,
              desc: `Execute 20 minutes of deliberate technical practice in ${sName} isolating proper mechanics and clean form.`,
              act: `Practice 20 minutes of isolated mechanics in ${sName} with strict attention to form`,
              crit: `20 continuous minutes logged with deliberate focus on precision`,
              type: 'drill' as const,
              duration: '20 mins',
            },
            {
              title: `${sName} 25-Minute Targeted Focus Session`,
              desc: `Set a 25-minute timer and engage in single-task deliberate practice on your active ${sName} curriculum.`,
              act: `Execute 25 minutes of continuous deliberate practice in ${sName}`,
              crit: `25 minutes completed with clear focus notes recorded`,
              type: 'fundamentals' as const,
              duration: '25 mins',
            },
            {
              title: `${sName} Stage ${sStage} Core Execution Sprint`,
              desc: `Perform 25 minutes of applied practice consolidating Stage ${sStage} fundamentals in ${sName}.`,
              act: `Execute 25 minutes of applied practice targeting Stage ${sStage} competence in ${sName}`,
              crit: `25 minutes completed with verified execution notes`,
              type: 'application' as const,
              duration: '25 mins',
            },
            {
              title: `${sName} Technique Analysis & Micro-Correction`,
              desc: `Analyze your execution of a key movement or technique in ${sName}. Identify 2 micro-corrections and drill them deliberately.`,
              act: `Analyze key technique in ${sName}, document 2 corrections, and drill them 10 times`,
              crit: `Self-assessment notes recorded with 10 corrective repetitions executed`,
              type: 'technique' as const,
              duration: '15 mins',
            },
          ];

          const synthItemDef = drillOptions.find((dt) => !usedItemIds.has(`title:${normalizeQuestTitle(dt.title)}`)) || drillOptions[0];
          const synthItem: QuestLibraryItem = {
            id: `lib_${sDom}_synth_${targetSkillObj.id}_${selectedNewCandidates.length}_${Date.now() % 1000}`,
            conceptId: `${sDom}.synth.${targetSkillObj.id}.${selectedNewCandidates.length}`,
            variationFamily: `${sDom}_synth_${targetSkillObj.id}`,
            title: synthItemDef.title,
            description: synthItemDef.desc,
            reason: `Targeted curriculum drill for active skill: ${sName}.`,
            domain: sDom,
            pillarId: trackMap.pillarId,
            primaryStatId: trackMap.primaryStatId,
            category: 'side',
            allowedCategories: ['main', 'side', 'weekly'],
            difficulty: sStage === 1 ? 'easy' : 'moderate',
            rarity: 'common',
            estimatedDuration: synthItemDef.duration,
            xpReward: 45 + sStage * 10,
            tags: [sDom, 'curriculum', 'active_skill_recovery', sName],
            skillFocus: sName,
            cooldownDays: 0,
            developmentTier: sStage,
            intensity: 'medium',
            cognitiveLoad: 'medium',
            questType: synthItemDef.type,
            action: synthItemDef.act,
            completionCriteria: synthItemDef.crit,
            masteryOutcome: `Master Stage ${sStage} capability in ${sName}`,
            progressionStage: sStage === 1 ? 'beginner' : sStage <= 3 ? 'intermediate' : 'advanced',
            goalTrackId: targetSkillObj.goalTrackId,
            skillId: targetSkillObj.id,
            questBand: sStage,
            band: sStage,
            contentOrigin: 'curriculum_roadmap',
          };

          addCandidateToRoster(synthItem, scoreCandidateItem(synthItem, 100));
        }
      }
    }
  }

  // ====================================================================
  // 4. CATEGORIZE AFTER SELECTION (Main, Landmark, Weekly, Side)
  // ====================================================================
  const hasActiveMain = generatedQuests.some((q) => !q.completedToday && q.category === 'main');
  let hasActiveLandmark = generatedQuests.some(
    (q) => !q.completedToday && (q.category === 'epic' || q.category === 'legendary' || q.rarity === 'legendary')
  );
  let hasActiveWeekly = generatedQuests.some((q) => !q.completedToday && q.category === 'weekly');

  // 1. Landmark eligibility for selected candidates:
  // Only if legitimate milestone/landmark criteria met and no landmark exists
  if (!hasActiveLandmark) {
    const landmarkCandidate = selectedNewCandidates.find((c) => {
      const isExplicitAI =
        c.item.category === 'legendary' ||
        c.item.category === 'epic' ||
        (c.item.allowedCategories && (c.item.allowedCategories.includes('legendary') || c.item.allowedCategories.includes('epic')));
      const isMilestone = c.item.questType === 'assessment' || (c.item.tags && c.item.tags.includes('milestone'));
      const duration = parseQuestDurationMinutes(c.variation.estimatedDuration || c.item.estimatedDuration);
      return (isExplicitAI || isMilestone) && duration >= 45 && (c.item.difficulty === 'challenging' || c.item.difficulty === 'elite');
    });

    if (landmarkCandidate) {
      hasActiveLandmark = true;
      const isLeg = landmarkCandidate.item.category === 'legendary' || (landmarkCandidate.item.allowedCategories && landmarkCandidate.item.allowedCategories.includes('legendary'));
      landmarkCandidate.category = isLeg ? 'legendary' : 'epic';
      landmarkCandidate.rarity = isLeg ? 'legendary' : 'epic';
      landmarkCandidate.prefix = isLeg ? 'LEGENDARY QUEST: ' : 'EPIC QUEST: ';
      landmarkCandidate.identityTag = isLeg ? 'Legendary Landmark' : 'Epic Landmark';
    }
  }

  // 2. Main Quest (1 Main Quest, highest-impact curriculum quest)
  if (!hasActiveMain) {
    const nonLandmarkCandidates = selectedNewCandidates.filter(
      (c) => c.category !== 'epic' && c.category !== 'legendary'
    );
    if (nonLandmarkCandidates.length > 0) {
      // Prioritize Active Skill Priority 1 for Main Quest candidacy
      const priority1Candidates = nonLandmarkCandidates.filter(
        (c) => getCandidateActiveSkillPriority(c.item) === 1
      );
      let mainChoice: SelectedCandidate;
      if (priority1Candidates.length > 0) {
        priority1Candidates.sort((a, b) => b.score - a.score);
        mainChoice = priority1Candidates[0];
      } else {
        nonLandmarkCandidates.sort((a, b) => b.score - a.score);
        mainChoice = nonLandmarkCandidates[0];
      }
      mainChoice.category = 'main';
      mainChoice.rarity = mainChoice.item.rarity === 'common' ? 'rare' : (mainChoice.item.rarity || 'rare');
      mainChoice.prefix = 'MAIN QUEST: ';
      mainChoice.identityTag = getForgeIdentityTag(
        getDomainPrimaryStatId(mainChoice.item.domain),
        getDomainPillarId(mainChoice.item.domain)
      );
      mainChoice.xpMultiplier = primaryBuildXpMultiplier;
    }
  }

  // 3. Weekly Quest (at most 1)
  if (!hasActiveWeekly) {
    const weeklyCandidate = selectedNewCandidates.find((c) => {
      if (c.category === 'main' || c.category === 'epic' || c.category === 'legendary') return false;
      const duration = parseQuestDurationMinutes(c.variation.estimatedDuration || c.item.estimatedDuration);
      return (c.item.questType === 'assessment' || c.item.questType === 'project' || c.item.allowedCategories?.includes('weekly')) && duration >= 30;
    });

    if (weeklyCandidate) {
      hasActiveWeekly = true;
      weeklyCandidate.category = 'weekly';
      weeklyCandidate.rarity = weeklyCandidate.item.rarity || 'rare';
      weeklyCandidate.prefix = 'WEEKLY QUEST: ';
      weeklyCandidate.identityTag = 'Weekly Momentum';
    }
  }

  // 4. All other candidates remain Side quests
  selectedNewCandidates.forEach((c) => {
    if (c.category !== 'main' && c.category !== 'weekly' && c.category !== 'epic' && c.category !== 'legendary') {
      c.category = 'side';
      c.prefix = '';
      c.identityTag = c.item.domain === 'general_maintenance' ? 'Life Maintenance' : 'Daily Support Action';
    }
  });

  // Add all newly selected & categorized candidates to generatedQuests
  selectedNewCandidates.forEach((cand) => {
    const rawTitle = cand.variation.title;
    const cleanTitle = rawTitle.replace(/^(?:MAIN QUEST|WEEKLY QUEST|EPIC QUEST|LEGENDARY QUEST):\s*/i, '').trim();
    const finalTitle = cand.prefix ? `${cand.prefix}${cleanTitle}` : cleanTitle;

    generatedQuests.push({
      id: cand.stableId,
      libraryItemId: cand.item.id,
      conceptId: cand.item.conceptId || cand.item.id,
      variationFamily: cand.item.variationFamily || cand.item.id,
      forgePathDomain: currentSpecialization || cand.item.domain,
      title: finalTitle,
      description: cand.variation.description,
      reason: cand.variation.reason,
      estimatedDuration: cand.variation.estimatedDuration,
      pillarId: getDomainPillarId(cand.item.domain),
      primaryStatId: getDomainPrimaryStatId(cand.item.domain),
      xpReward: Math.round(cand.item.xpReward * (cand.xpMultiplier || 1)),
      rarity: cand.rarity,
      frequency: cand.category === 'weekly' ? 'weekly' : cand.category === 'legendary' ? 'custom' : 'daily',
      category: cand.category,
      buildId: primaryBuild?.id,
      difficultyLevel: domainDifficultyLevels[cand.item.domain] || 1,
      completedToday: cand.existing ? cand.existing.completedToday : false,
      streak: cand.existing ? cand.existing.streak : 0,
      skipCount: cand.existing?.skipCount || 0,
      completionCount: cand.existing?.completionCount || 0,
      isAutoGenerated: true,
      identityTag: cand.identityTag,
      createdAt: cand.existing ? cand.existing.createdAt : new Date().toISOString(),
      ...(cand.existing?.lastCompletedAt ? { lastCompletedAt: cand.existing.lastCompletedAt } : {}),
      questType: cand.item.questType,
      action: cand.item.action,
      completionCriteria: cand.item.completionCriteria,
      masteryOutcome: cand.item.masteryOutcome,
      goalTrackId: cand.item.goalTrackId,
      skillId: cand.item.skillId || cand.existing?.skillId || (cand.item.goalTrackId ? safeSkills.find((s) => s.goalTrackId === cand.item.goalTrackId)?.id : undefined),
      questBand: Math.max(1, Math.min(highestUnlockedBand, cand.item.questBand || cand.item.band || cand.existing?.questBand || cand.existing?.band || 1)) as 1 | 2 | 3 | 4 | 5 | 6,
      band: Math.max(1, Math.min(highestUnlockedBand, cand.item.questBand || cand.item.band || cand.existing?.questBand || cand.existing?.band || 1)) as 1 | 2 | 3 | 4 | 5 | 6,
      isAIConcept: Boolean(cand.item.isAIConcept || cand.item.contentOrigin === 'Gemini Quest Intelligence' || cand.item.id.startsWith('lib_ai_')),
    });
  });

  // Final map with guaranteed unique numeric ID, rarity inferencing, capability difficulty band, and Forge Quest Band
  const finalQuestsRaw = generatedQuests.map((q, idx) => {
    const questId = resolveQuestNumericId(q.id, idx + 50, usedNumericIds);
    const diffInfo = calculateQuestDifficulty(q);

    const targetSkill = safeSkills.find(
      (s) =>
        (q.skillId && s.id === q.skillId) ||
        (!q.skillId && q.goalTrackId && s.goalTrackId === q.goalTrackId)
    );
    const resolvedSkillId = q.skillId || targetSkill?.id;
    const skillStage = Math.max(1, targetSkill?.currentStage || 1);
    const skillCurriculumReadiness = resolvedSkillId ? skillStage : highestUnlockedBand;

    // Authoritative effective ceiling: min(highestUnlockedForgeBand, skillCurriculumReadiness)
    const effectiveCeiling = Math.min(highestUnlockedBand, skillCurriculumReadiness);

    const assignedBand = assignQuestBand(
      {
        questBand: q.questBand,
        band: q.band,
        difficultyBand: q.difficultyBand,
        difficultyLevel: q.difficultyLevel,
        estimatedDuration: q.estimatedDuration,
        curriculumStage: skillStage,
      },
      highestUnlockedBand,
      skillStage
    );

    // Strictly clamp: Math.max(1, Math.min(highestUnlockedForgeBand, skillStage, assignedBand))
    const finalBand = Math.max(1, Math.min(effectiveCeiling, assignedBand)) as 1 | 2 | 3 | 4 | 5 | 6;

    // Final Invariant Assertion: Must be valid integer [1, 6], <= highestUnlockedBand, and <= skill stage
    const isBandValid =
      Number.isInteger(finalBand) &&
      finalBand >= 1 &&
      finalBand <= 6 &&
      finalBand <= highestUnlockedBand &&
      (!resolvedSkillId || finalBand <= skillCurriculumReadiness);

    if (!isBandValid) {
      console.warn(`[Quest Band Rejection] Quest "${q.title}" failed band invariant (finalBand=${finalBand}, highest=${highestUnlockedBand}, skillReadiness=${skillCurriculumReadiness}). Rejecting.`);
      return null;
    }

    console.log(`[Quest Band Verification]
Quest: "${q.title}"
Skill: "${targetSkill?.name || 'Non-skill / General'}"
Skill Stage: ${skillStage}
Highest Unlocked Forge Band: Band ${highestUnlockedBand}
Assigned Band: Band ${assignedBand}
Final Verified Band: Band ${finalBand}`);

    return {
      ...q,
      id: questId,
      skillId: resolvedSkillId,
      estimatedDuration: q.estimatedDuration,
      rarity: q.rarity || inferQuestRarity(q),
      difficultyScore: q.difficultyScore || diffInfo.intrinsicScore,
      difficultyBand: finalBand, // Synchronized & constrained by Forge Mastery Band
      questBand: finalBand,
      band: finalBand,
    };
  });

  const finalQuests = finalQuestsRaw.filter((q): q is NonNullable<typeof q> => q !== null);

  // Final authoritative safety verification: Filter out any quest that belongs to an inactive skill
  const verifiedQuests = finalQuests.filter((q) => {
    if (q.completedToday || (!q.isAutoGenerated && (q as any).isManual)) return true;

    // Reject inactive skill text leakage
    const textLower = `${q.title} ${q.action || ''} ${q.description || ''}`.toLowerCase();
    for (const inName of inactiveSkillNamesLower) {
      if (inName.length >= 3 && textLower.includes(inName)) {
        const alsoActive = Array.from(activeSkillNamesLower).some((aName) => textLower.includes(aName));
        if (!alsoActive) return false;
      }
    }

    if (effectiveActiveSkills.length > 0) {
      const isNewSkillContent = Boolean(
        q.isAIConcept ||
        q.contentOrigin === 'Gemini Quest Intelligence' ||
        q.contentOrigin === 'curriculum_roadmap' ||
        (typeof q.contentOrigin === 'string' && q.contentOrigin.includes('fallback')) ||
        (q.libraryItemId && (q.libraryItemId.startsWith('lib_ai_') || q.libraryItemId.includes('_track_') || q.libraryItemId.includes('fallback')))
      );

      if (isNewSkillContent) {
        // IF item is newly generated skill content:
        // skillId MUST exist
        // skillId MUST be active
        // goalTrackId, if present, MUST belong to that Skill
        // Do not allow newly generated skill content to reach the roster solely through:
        // domain, title, skillFocus, goalTrackId
        if (!q.skillId || !activeSkillIds.has(q.skillId)) {
          return false;
        }

        if (q.goalTrackId) {
          if (!activeGoalTrackIds.has(q.goalTrackId)) {
            return false;
          }
          const activeSkill = effectiveActiveSkills.find((s) => s.id === q.skillId);
          if (activeSkill?.goalTrackId && activeSkill.goalTrackId !== q.goalTrackId) {
            return false;
          }
          const matchingTrack = params?.forgePath?.goalTracks?.find((gt: any) => gt.id === q.goalTrackId);
          if (matchingTrack) {
            if (matchingTrack.skillId && matchingTrack.skillId !== q.skillId) {
              return false;
            }
            if (matchingTrack.domain && activeSkill?.domain) {
              const gtDom = matchingTrack.domain.toLowerCase().trim();
              const sDom = activeSkill.domain.toLowerCase().trim();
              if (gtDom !== sDom && !gtDom.includes(sDom) && !sDom.includes(gtDom)) {
                return false;
              }
            }
          }
        }
      } else {
        if (q.skillId && !activeSkillIds.has(q.skillId)) return false;
        if (q.goalTrackId && !activeGoalTrackIds.has(q.goalTrackId)) return false;
        if (!q.skillId && !q.goalTrackId) {
          const isMaintenance =
            (q.category as string) === 'maintenance' ||
            q.category === 'recovery' ||
            q.forgePathDomain === 'general_maintenance' ||
            q.pillarId === 'character';
          if (!isMaintenance && q.forgePathDomain && !activeSkillDomains.has(q.forgePathDomain.toLowerCase())) {
            return false;
          }
        }
      }
    }

    return true;
  });

  // Ensure questBand, band, and difficultyBand are strictly verified and synchronized on all verified quests
  verifiedQuests.forEach((q) => {
    const targetSkill = safeSkills.find(
      (s) => (q.skillId && s.id === q.skillId) || (!q.skillId && q.goalTrackId && s.goalTrackId === q.goalTrackId)
    );
    const skillStage = Math.max(1, targetSkill?.currentStage || 1);
    const skillCurriculumReadiness = q.skillId ? skillStage : highestUnlockedBand;
    const effectiveCeiling = Math.min(highestUnlockedBand, skillCurriculumReadiness);
    const rawBand = q.questBand || q.band || 1;
    const clamped = Math.max(1, Math.min(effectiveCeiling, rawBand)) as 1 | 2 | 3 | 4 | 5 | 6;

    q.questBand = clamped;
    q.band = clamped;
    q.difficultyBand = clamped;
  });

  // Diagnostic Roster Audit (APE 2.3 & Forge v72)
  let aiCount = 0;
  let curriculumCount = 0;
  let libraryCount = 0;
  let proceduralCount = 0;
  const offendingProceduralTitles: string[] = [];
  const bandCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  verifiedQuests.forEach((q) => {
    if (q.questBand && bandCounts[q.questBand] !== undefined) {
      bandCounts[q.questBand]++;
    }
    if (isGenericTitle(q.title)) {
      proceduralCount++;
      offendingProceduralTitles.push(q.title);
    } else if (q.isAIConcept || (q.libraryItemId && q.libraryItemId.startsWith('lib_ai_'))) {
      aiCount++;
    } else if (q.libraryItemId && (q.libraryItemId.includes('_track_') || q.libraryItemId.includes('curriculum'))) {
      curriculumCount++;
    } else {
      libraryCount++;
    }
  });

  const trackCoverageCounts: Record<string, number> = {};
  allResolvedGoalTracks.forEach((t) => {
    trackCoverageCounts[t.name || t.id] = 0;
  });

  verifiedQuests.forEach((q) => {
    if (q.goalTrackId) {
      const track = allResolvedGoalTracks.find((t) => t.id === q.goalTrackId);
      const name = track?.name || track?.id || q.goalTrackId;
      trackCoverageCounts[name] = (trackCoverageCounts[name] || 0) + 1;
    } else if (q.libraryItemId) {
      const track = allResolvedGoalTracks.find((t) => t.domain && q.libraryItemId?.includes(t.domain));
      if (track) {
        const name = track.name || track.id;
        trackCoverageCounts[name] = (trackCoverageCounts[name] || 0) + 1;
      }
    }
  });

  const trackCoverageStr = Object.entries(trackCoverageCounts)
    .map(([trackName, count]) => `${trackName}: ${count}`)
    .join(', ');

  const activeLandmark = verifiedQuests.find(
    (q) => !q.completedToday && (q.category === 'epic' || q.category === 'legendary' || q.rarity === 'legendary')
  );
  const landmarkStatusStr = activeLandmark
    ? `1 active (${activeLandmark.title})`
    : 'None';

  // Selected quest distribution by Active Skill
  const selectedDistribution: Record<string, number> = {};
  effectiveActiveSkills.forEach((s) => {
    selectedDistribution[s.name] = 0;
  });

  verifiedQuests.forEach((q) => {
    if (q.completedToday) return;
    const qDom = q.forgePathDomain || inferQuestDomain(q);
    for (const s of effectiveActiveSkills) {
      let match = false;
      if (q.goalTrackId && s.goalTrackId && q.goalTrackId === s.goalTrackId) match = true;
      else if (q.skillId && q.skillId === s.id) match = true;
      else if (qDom && s.domain && qDom === s.domain) match = true;
      else if (s.name && q.title.toLowerCase().includes(s.name.toLowerCase())) match = true;

      if (match) {
        selectedDistribution[s.name] = (selectedDistribution[s.name] || 0) + 1;
        break;
      }
    }
  });

  const activeOrderStr = effectiveActiveSkills.length > 0
    ? effectiveActiveSkills.map((s) => `${s.activePriority || 1}. ${s.name}`).join('\n')
    : 'None';

  const selectedDistStr = effectiveActiveSkills.length > 0
    ? effectiveActiveSkills.map((s) => `${s.name}: ${selectedDistribution[s.name] || 0}`).join('\n')
    : 'None';

  console.log(`[APE 2.3]
Persistent Skills: ${safeSkills.length}
Active Skills: ${effectiveActiveSkills.length}
Active Order:
${activeOrderStr}

Candidate Pipeline Breakdown:
- AI Generated Concepts: ${aiItems.length}
- Curriculum Roadmap Items: ${customItems.length}
- Standard Library Candidates: ${matchingLibraryItems.length}
- Total Candidates Pool: ${effectiveLibrary.length}

Refresh & Novelty Status:
- Refresh Mode: ${forceRefresh ? 'Force Reroll (Fresh Novelty Requested)' : params?.seed !== undefined ? 'Seeded Regeneration' : 'Daily Routine'}
- Refresh Nonce / Seed: ${params?.seed ?? 'None'}
- Cache Invalidation: ${forceRefresh ? 'True (AI cache bypassed)' : 'False (Standard cache)'}

Highest Unlocked Forge Band: Band ${highestUnlockedBand}
Quest Band Distribution: Band 1: ${bandCounts[1]}, Band 2: ${bandCounts[2]}, Band 3: ${bandCounts[3]}, Band 4: ${bandCounts[4]}, Band 5: ${bandCounts[5]}, Band 6: ${bandCounts[6]}

Candidates before active-skill filter: ${candidatesBeforeActiveFilter}
Candidates after active-skill filter: ${candidatesAfterActiveFilter}

Selected Quests: ${verifiedQuests.length} / ${MAX_ACTIVE_QUESTS}
${selectedDistStr}

Inactive skill candidates rejected: ${inactiveSkillRejections}

Daily cap: ${MAX_ACTIVE_QUESTS}
Procedural filler: ${proceduralCount}`);

  console.log(`[APE 2.3] Roster composition: ${aiCount} AI items, ${curriculumCount} curriculum items, ${libraryCount} standard library, ${proceduralCount} procedural (MUST BE 0)`);
  console.log(`[APE 2.3] Track coverage: [${trackCoverageStr || 'None'}]`);
  console.log(`[APE 2.3] Epic/Legendary status: [${landmarkStatusStr}]`);

  verifiedQuests.forEach((q) => {
    const src = q.isAIConcept || (q.libraryItemId && q.libraryItemId.startsWith('lib_ai_'))
      ? 'GEMINI'
      : q.libraryItemId && (q.libraryItemId.includes('_track_') || q.libraryItemId.includes('curriculum'))
      ? 'CURRICULUM'
      : isGenericTitle(q.title)
      ? 'PROCEDURAL (ERROR)'
      : 'LIBRARY';
    console.log(`  - [${q.category.toUpperCase()}] "${q.title}" (source: ${src})`);
  });

  if (proceduralCount > 0) {
    console.warn(`[APE 2.3 CRITICAL WARNING] Procedural quests detected in roster (${proceduralCount}):`, offendingProceduralTitles);
  }

  (verifiedQuests as any).heldBackLandmarks = [...lastHeldBackLandmarks];
  return verifiedQuests;
}
