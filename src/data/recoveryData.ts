import { PillarId, StatId } from '../types';

export interface RecoveryActivity {
  id: string;
  title: string;
  description: string;
  category: 'physical' | 'mental' | 'sleep';
  icon: string; // Lucide icon name
  xpReward: number;
  pillarId: PillarId;
  statId: StatId;
  durationMins?: number;
  completedToday?: boolean;
  completedAt?: string;
  actionType?: 'breathing' | 'journal' | 'custom' | 'normal';
}

export const INITIAL_RECOVERY_ACTIVITIES: RecoveryActivity[] = [
  // PHYSICAL RECOVERY
  {
    id: 'rec_stretch',
    title: 'Full Body Stretching',
    description: '10-minute restorative stretch targeting hamstrings, hips, and back.',
    category: 'physical',
    icon: 'Activity',
    xpReward: 20,
    pillarId: 'strength',
    statId: 'health',
    durationMins: 10,
  },
  {
    id: 'rec_mobility',
    title: 'Hip & Ankle Mobility',
    description: 'Dynamic joint rotations to enhance leg recovery and joint health.',
    category: 'physical',
    icon: 'Flame',
    xpReward: 20,
    pillarId: 'strength',
    statId: 'health',
    durationMins: 8,
  },
  {
    id: 'rec_hydrate',
    title: 'Hydration Reset (500ml)',
    description: 'Drink a full glass of water upon waking or post-workout to restore fluids.',
    category: 'physical',
    icon: 'Droplets',
    xpReward: 15,
    pillarId: 'strength',
    statId: 'health',
  },
  {
    id: 'rec_walk',
    title: 'Recovery Stroll / Light Walk',
    description: '15–20 minutes low-intensity walk to boost circulation and flush fatigue.',
    category: 'physical',
    icon: 'Footprints',
    xpReward: 25,
    pillarId: 'strength',
    statId: 'health',
    durationMins: 15,
  },
  {
    id: 'rec_posture',
    title: 'Posture Reset & Spinal Decompress',
    description: '12 wall angels and gentle doorframe chest openers for desk recovery.',
    category: 'physical',
    icon: 'UserCheck',
    xpReward: 15,
    pillarId: 'strength',
    statId: 'health',
    durationMins: 5,
  },

  // MENTAL RECOVERY
  {
    id: 'rec_box_breath',
    title: 'Box Breathing (4-4-4-4)',
    description: 'Inhale 4s, hold 4s, exhale 4s, hold 4s to rapidly calm nervous system.',
    category: 'mental',
    icon: 'Wind',
    xpReward: 25,
    pillarId: 'character',
    statId: 'emotional_resilience',
    durationMins: 5,
    actionType: 'breathing',
  },
  {
    id: 'rec_diaphragm',
    title: 'Diaphragmatic Belly Breathing',
    description: 'Deep belly breathing focusing on slow, full diaphragmatic expansion.',
    category: 'mental',
    icon: 'Heart',
    xpReward: 20,
    pillarId: 'character',
    statId: 'emotional_resilience',
    durationMins: 5,
    actionType: 'breathing',
  },
  {
    id: 'rec_meditation',
    title: 'Mindful Stillness Meditation',
    description: 'Sit in quiet observation for 5–10 minutes, anchoring to breath.',
    category: 'mental',
    icon: 'Brain',
    xpReward: 25,
    pillarId: 'wisdom',
    statId: 'focus',
    durationMins: 8,
  },
  {
    id: 'rec_prayer',
    title: 'Prayer & Spiritual Grounding',
    description: 'Quiet reflection or prayer to align values and cultivate peace.',
    category: 'mental',
    icon: 'Sparkles',
    xpReward: 20,
    pillarId: 'purpose',
    statId: 'faith',
    durationMins: 5,
  },
  {
    id: 'rec_gratitude',
    title: 'Gratitude Reflection',
    description: 'Acknowledge 3 specific things you are genuinely grateful for today.',
    category: 'mental',
    icon: 'Sun',
    xpReward: 20,
    pillarId: 'character',
    statId: 'emotional_resilience',
    actionType: 'journal',
  },

  // SLEEP RECOVERY
  {
    id: 'rec_evening_stretch',
    title: 'Evening Wind-Down Stretch',
    description: 'Relaxing stretches on floor before bed to signal sleep readiness to body.',
    category: 'sleep',
    icon: 'Moon',
    xpReward: 20,
    pillarId: 'strength',
    statId: 'health',
    durationMins: 10,
  },
  {
    id: 'rec_reading',
    title: 'Bedtime Reading (Offline)',
    description: 'Read 15 minutes of a physical book before sleep instead of screens.',
    category: 'sleep',
    icon: 'BookOpen',
    xpReward: 20,
    pillarId: 'wisdom',
    statId: 'knowledge',
    durationMins: 15,
  },
  {
    id: 'rec_screen_cutoff',
    title: 'Blue Light Cutoff',
    description: 'Put phones and bright screens away 30 minutes before target bedtime.',
    category: 'sleep',
    icon: 'Smartphone',
    xpReward: 25,
    pillarId: 'character',
    statId: 'discipline',
  },
  {
    id: 'rec_sleep_prep',
    title: 'Sleep Sanctuary Setup',
    description: 'Ensure dark room, cool temperature (65–68°F), and quiet atmosphere.',
    category: 'sleep',
    icon: 'Bed',
    xpReward: 20,
    pillarId: 'strength',
    statId: 'health',
  },
];
