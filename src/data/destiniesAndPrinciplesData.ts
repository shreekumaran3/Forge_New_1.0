import { Destiny, UserPrinciple } from '../types';

export const INITIAL_DESTINIES: Destiny[] = [
  {
    id: 'dest_builder',
    title: 'Master Craftsman & Builder',
    tagline: 'Designing physical & visual works, launching projects, and mastering creative discipline.',
    description: 'Constructing meaningful works, honing creative craftsmanship, and building long-term project mastery.',
    pillarId: 'purpose',
    milestones: ['Complete 5 Design Modules', 'Publish First Creative Project', 'Solve 50 Complex Design Challenges', 'Launch Original Venture'],
    progress: 0,
    active: true,
    icon: 'Hammer',
  },
  {
    id: 'dest_story_weaver',
    title: 'Master Visual Storyteller',
    tagline: 'Learning anatomy, mastering perspective, finishing comic pages.',
    description: 'Transforming ideas into vivid visual narratives, mastering character construction, perspective, and comic production.',
    pillarId: 'wisdom',
    milestones: ['Complete Gesture Studies', 'Master Perspective Drawing', 'Complete 10 Comic Pages', 'Publish Graphic Novel'],
    progress: 0,
    active: true,
    icon: 'Palette',
  },
  {
    id: 'dest_summit_seeker',
    title: 'Summit Seeker & Endurance Mountaineer',
    tagline: 'Hiking trails, ascending peaks, building unshakeable physical stamina.',
    description: 'Scaling mountain summits, increasing pack carry capacity, and maintaining peak physical resilience.',
    pillarId: 'strength',
    milestones: ['Complete 10km Trail Hike', 'Climb Local Ridge Peak', 'Summit Mount Kinabalu', 'Complete 50km Expedition'],
    progress: 0,
    active: true,
    icon: 'Compass',
  },
  {
    id: 'dest_family_sovereign',
    title: 'Sovereign Pillar & Family Protector',
    tagline: 'Communication, spiritual strength, health, financial stability, and character.',
    description: 'Providing steady leadership, emotional grounding, financial wisdom, and unwavering commitment to loved ones.',
    pillarId: 'relationships',
    milestones: ['Maintain 30-Day Gratitude Practice', 'Establish Emergency Reserve', 'Daily Prayer / Reflection', 'Family Vision Retreat'],
    progress: 0,
    active: true,
    icon: 'Shield',
  },
];

export const INITIAL_PRINCIPLES: UserPrinciple[] = [
  {
    text: 'I keep my word, even when it is difficult.',
    category: 'character',
    createdAt: new Date().toISOString(),
  },
  {
    text: 'I choose discipline over comfort.',
    category: 'action',
    createdAt: new Date().toISOString(),
  },
  {
    text: 'I stay calm and steady under pressure.',
    category: 'mindset',
    createdAt: new Date().toISOString(),
  },
  {
    text: 'I leave places and people better than I found them.',
    category: 'relationship',
    createdAt: new Date().toISOString(),
  },
  {
    text: 'I build enduring value instead of pursuing transient distraction.',
    category: 'character',
    createdAt: new Date().toISOString(),
  },
];
