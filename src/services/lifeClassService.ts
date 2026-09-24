import { Skill, PlayerStatState } from '../types';

export function calculateDynamicLifeClass(skills: Skill[], stats: PlayerStatState[] = []): string {
  let warriorXp = 0;
  let scholarXp = 0;
  let artistXp = 0;
  let strategistXp = 0;

  // Evaluate skills
  skills.forEach((skill) => {
    const xp = skill.lifetimeXp || 0;
    const id = skill.id.toLowerCase();
    const cat = (skill.category || '').toLowerCase();

    if (id.includes('mountaineer') || id.includes('hike') || id.includes('fit') || cat.includes('outdoor')) {
      warriorXp += xp;
    } else if (id.includes('read') || cat.includes('intellectual')) {
      scholarXp += xp;
    } else if (id.includes('draw') || id.includes('art') || cat.includes('creative')) {
      artistXp += xp;
    } else if (id.includes('communicat') || id.includes('speak') || id.includes('leader') || cat.includes('interpersonal')) {
      strategistXp += xp;
    }
  });

  // Evaluate stats
  stats.forEach((st) => {
    const xp = st.lifetimeXp || 0;
    if (st.statId === 'strength' || st.statId === 'endurance' || st.statId === 'health') {
      warriorXp += xp * 0.5;
    } else if (st.statId === 'knowledge') {
      scholarXp += xp * 0.5;
    } else if (st.statId === 'focus') {
      scholarXp += xp * 0.5;
    } else if (st.statId === 'creativity') {
      artistXp += xp * 0.5;
    } else if (st.statId === 'communication' || st.statId === 'leadership' || st.statId === 'financial_literacy') {
      strategistXp += xp * 0.5;
    }
  });

  const totalClassXp = warriorXp + scholarXp + artistXp + strategistXp;

  if (totalClassXp < 50) {
    return 'Polymath';
  }

  const scores = [
    { name: 'Warrior', score: warriorXp },
    { name: 'Scholar', score: scholarXp },
    { name: 'Artist', score: artistXp },
    { name: 'Strategist', score: strategistXp },
  ].sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];

  if (top.score / totalClassXp >= 0.35 && top.score > second.score * 1.15) {
    return top.name;
  }

  return 'Polymath';
}
