import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { PILLARS_CONFIG, STATS_CONFIG, getStatXpNextLevel } from '../services/xpService';
import { getQuestRarity } from '../services/questRarityService';
import { StatId, PillarId } from '../types';
import { Shield, BookOpen, Flame, Heart, Compass, Sparkles, ChevronRight, BarChart2 } from 'lucide-react';

export const StatsScreen: React.FC = () => {
  const { stats, quests } = useGame();
  const [selectedStatId, setSelectedStatId] = useState<StatId | null>(null);

  const getPillarIcon = (pillarId: PillarId) => {
    switch (pillarId) {
      case 'strength':
        return <Shield className="w-4 h-4 text-[#D4AF37]" />;
      case 'wisdom':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'character':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'relationships':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'purpose':
        return <Compass className="w-4 h-4 text-emerald-400" />;
    }
  };

  const activeStatDef = selectedStatId ? STATS_CONFIG.find((s) => s.id === selectedStatId) : null;
  const activeStatState = selectedStatId ? stats.find((s) => s.statId === selectedStatId) : null;
  const activeStatQuests = selectedStatId ? quests.filter((q) => q.primaryStatId === selectedStatId) : [];

  return (
    <div id="stats-screen" className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-[#E4E3E0] flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#D4AF37]" />
          The Five Pillars & Stats
        </h1>
        <p className="text-[10px] text-[#8E9299] mt-1 uppercase tracking-widest">
          Every virtue levels independently through daily real-world execution.
        </p>
      </div>

      {/* The 5 Pillars Summary Carousel / Grid */}
      <div className="space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#8E9299] font-bold">
          The Five Pillars
        </h2>

        <div className="grid grid-cols-1 gap-2.5">
          {PILLARS_CONFIG.map((pillar) => {
            const pillarStats = STATS_CONFIG.filter((s) => s.pillarId === pillar.id);
            const pillarStatIds = pillarStats.map((s) => s.id);
            const pillarStatStates = stats.filter((s) => pillarStatIds.includes(s.statId));

            const totalPillarLevel = pillarStatStates.reduce((acc, s) => acc + s.level, 0);
            const totalPillarLifetimeXp = pillarStatStates.reduce((acc, s) => acc + s.lifetimeXp, 0);

            return (
              <Card key={pillar.id} className="p-3.5 space-y-2 hover:border-[#D4AF37]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-sm bg-[#050505] border border-[#1A1A1A]">
                      {getPillarIcon(pillar.id)}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-[#E4E3E0]">{pillar.name}</h3>
                      <p className="text-[10px] text-[#8E9299]">{pillar.description}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-xs font-bold text-[#D4AF37] block">
                      LVL {totalPillarLevel}
                    </span>
                    <span className="text-[9px] text-[#8E9299] font-mono">
                      {totalPillarLifetimeXp} XP
                    </span>
                  </div>
                </div>

                {/* Subcategories tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {pillar.subCategories.map((sub) => (
                    <span
                      key={sub}
                      className="text-[9px] uppercase tracking-wider font-semibold text-[#8E9299] bg-[#050505] px-2 py-0.5 rounded-sm border border-[#1A1A1A]"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 12 Primary Stats Grid */}
      <div className="space-y-3">
        <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#8E9299] font-bold">
          Primary Virtues Mastery
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATS_CONFIG.map((statDef) => {
            const statState = stats.find((s) => s.statId === statDef.id) || {
              statId: statDef.id,
              level: 1,
              currentXp: 0,
              lifetimeXp: 0,
            };

            const nextXp = getStatXpNextLevel(statState.level);

            return (
              <Card
                key={statDef.id}
                onClick={() => setSelectedStatId(statDef.id)}
                className="cursor-pointer hover:border-[#D4AF37]/40 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="font-semibold text-xs text-[#E4E3E0]">{statDef.name}</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#D4AF37] bg-[#050505] px-2 py-0.5 rounded-sm border border-[#1A1A1A]">
                    LVL {statState.level}
                  </span>
                </div>

                <ProgressBar
                  value={statState.currentXp}
                  max={nextXp}
                  size="sm"
                  color="gold"
                  showValues={false}
                />

                <div className="flex justify-between items-center text-[9px] text-[#8E9299] font-mono">
                  <span>
                    {statState.currentXp} / {nextXp} XP
                  </span>
                  <span className="flex items-center text-[#D4AF37] uppercase tracking-wider font-bold">
                    Details <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stat Detail Modal */}
      <Modal
        isOpen={!!selectedStatId}
        onClose={() => setSelectedStatId(null)}
        title={activeStatDef?.name ? activeStatDef.name.toUpperCase() : ''}
        subtitle={activeStatDef?.description}
      >
        {activeStatDef && activeStatState && (
          <div className="space-y-4 pt-2">
            {/* Stat Level Card */}
            <div className="p-4 rounded-sm bg-[#050505] border border-[#1A1A1A] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8E9299] uppercase tracking-wider text-[10px] font-bold">Current Level</span>
                <span className="font-mono text-sm font-bold text-[#D4AF37]">
                  Level {activeStatState.level}
                </span>
              </div>

              <ProgressBar
                value={activeStatState.currentXp}
                max={getStatXpNextLevel(activeStatState.level)}
                color="gold"
              />

              <div className="flex justify-between text-[10px] text-[#8E9299] font-mono pt-1">
                <span>Lifetime Earned XP</span>
                <span className="text-[#E4E3E0] font-bold">{activeStatState.lifetimeXp} XP</span>
              </div>
            </div>

            {/* Quests Associated with this Stat */}
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] mb-2">
                Associated Daily Actions
              </h4>
              {activeStatQuests.length === 0 ? (
                <p className="text-xs text-[#8E9299] italic">No quests mapped to this stat yet.</p>
              ) : (
                <div className="space-y-2">
                  {activeStatQuests.map((q) => {
                    const rarity = getQuestRarity(q.rarity, q.category, q.xpReward);
                    return (
                      <div
                        key={q.id}
                        style={rarity.cardStyle}
                        className="p-2.5 rounded-sm bg-[#050505] border border-[#1A1A1A] text-xs flex justify-between items-center gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={rarity.badgeStyle}
                            className="text-[8px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-xs border shrink-0"
                          >
                            {rarity.label}
                          </span>
                          <span className="text-[#E4E3E0] truncate">{q.title}</span>
                        </div>
                        <span style={rarity.xpBadgeStyle} className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0">
                          +{q.xpReward} XP
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
