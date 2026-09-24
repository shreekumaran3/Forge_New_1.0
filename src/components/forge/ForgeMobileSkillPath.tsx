import React, { useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../../theme/ThemeContext';
import {
  UNIFIED_SKILL_NODES,
  UnifiedSkillNode,
  SKILL_BRANCHES,
  SkillBranchId,
} from '../../data/unifiedSkillTreeData';
import {
  canUnlockNode,
} from '../../services/unifiedSkillTreeService';
import {
  Zap,
  Shield,
  Flame,
  Brain,
  Users,
  Sparkles,
  Crown,
  Dumbbell,
  Heart,
  Footprints,
  Compass,
  Lock,
  Check,
  Eye,
  Award,
  MessageSquare,
  Handshake,
  BookOpen,
  Hourglass,
  Target,
  Hammer,
  ChevronDown,
} from 'lucide-react';

interface ForgeMobileSkillPathProps {
  nodeLevels: Record<string, number>;
  selectedNodeId: string;
  onSelectNode: (node: UnifiedSkillNode) => void;
  playerLevel: number;
  availableSp: number;
  skills: { id: string; level: number; primaryStatId?: string; name?: string }[];
  selectedBranch: SkillBranchId;
  onSelectBranch: (branchId: SkillBranchId) => void;
  tourStepId?: string;
  tutorialNodeId?: string | null;
}

export const ForgeMobileSkillPath: React.FC<ForgeMobileSkillPathProps> = ({
  nodeLevels,
  selectedNodeId,
  onSelectNode,
  playerLevel,
  availableSp,
  skills,
  selectedBranch,
  onSelectBranch,
  tourStepId,
  tutorialNodeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentMode } = useTheme();
  const isLight = currentMode === 'light';

  // Normalize active branch (fallback to 'physical' if 'core' or unknown)
  const activeBranchId: 'physical' | 'mental' | 'social' =
    selectedBranch === 'mental' || selectedBranch === 'social' || selectedBranch === 'physical'
      ? selectedBranch
      : 'physical';

  // Get active branch metadata from SKILL_BRANCHES
  const activeBranchMeta = useMemo(() => {
    return (
      SKILL_BRANCHES.find((b) => b.id === activeBranchId) ||
      SKILL_BRANCHES.find((b) => b.id === 'physical')!
    );
  }, [activeBranchId]);

  // Root Forge Node
  const rootNode = useMemo(() => {
    return (
      UNIFIED_SKILL_NODES.find((n) => n.id === 'node_root_forge' || n.isRoot) ||
      UNIFIED_SKILL_NODES[0]
    );
  }, []);

  // Branch Hub Node (Tier 1) for the active branch
  const branchHubNode = useMemo(() => {
    return UNIFIED_SKILL_NODES.find(
      (n) => n.branchId === activeBranchId && (n.isBranchHub || n.tier === 1)
    );
  }, [activeBranchId]);

  // Sub-branch Nodes (Tier 2) connected to branch hub
  const subBranchNodes = useMemo(() => {
    if (!branchHubNode) return [];
    return UNIFIED_SKILL_NODES.filter((n) => n.prerequisiteId === branchHubNode.id);
  }, [branchHubNode]);

  // Build the progression chains for each sub-branch column
  // For each sub-branch (Tier 2), we follow prerequisiteId downward: Tier 2 -> 3 -> 4 -> 5 -> 6
  const subBranchChains = useMemo(() => {
    return subBranchNodes.map((subNode) => {
      const chain: UnifiedSkillNode[] = [subNode];
      let current = subNode;

      while (current) {
        const nextNode = UNIFIED_SKILL_NODES.find((n) => n.prerequisiteId === current.id);
        if (nextNode) {
          chain.push(nextNode);
          current = nextNode;
        } else {
          break;
        }
      }

      return {
        subNode,
        chain,
      };
    });
  }, [subBranchNodes]);

  // Helper for concise lock reasons
  const getConciseLockReason = (node: UnifiedSkillNode): string => {
    const validation = canUnlockNode(node.id, availableSp, playerLevel, skills);
    if (validation.canUnlock) return '';

    // Check prerequisite
    if (node.prerequisiteId) {
      const prereqLvl = nodeLevels[node.prerequisiteId] || 0;
      if (prereqLvl === 0) {
        const prereq = UNIFIED_SKILL_NODES.find((n) => n.id === node.prerequisiteId);
        return `Req ${prereq?.title || 'Prereq'}`;
      }
    }

    // Check character level
    if (node.requiredPlayerLevel && playerLevel < node.requiredPlayerLevel) {
      return `Req Lvl ${node.requiredPlayerLevel}`;
    }

    // Check skill level
    if (node.requiredSkillId && node.requiredSkillLevel) {
      const skill = skills.find(
        (s) => s.id === node.requiredSkillId || s.primaryStatId === node.primaryStatId
      );
      const currentLvl = skill?.level || 1;
      if (currentLvl < node.requiredSkillLevel) {
        const label = node.requiredSkillName?.split('/')[0].trim() || 'Skill';
        return `Req ${label} Lvl ${node.requiredSkillLevel}`;
      }
    }

    return 'Locked';
  };

  // Branch color helper
  const getBranchColor = (branchId: string): string => {
    switch (branchId) {
      case 'physical':
        return '#F97316';
      case 'mental':
        return '#06B6D4';
      case 'social':
        return '#10B981';
      case 'core':
      default:
        return '#D4AF37';
    }
  };

  // Render Lucide Icon helper
  const renderIcon = (iconName: string, color: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Hammer':
        return <Hammer className={className} style={{ color }} />;
      case 'Flame':
        return <Flame className={className} style={{ color }} />;
      case 'Brain':
        return <Brain className={className} style={{ color }} />;
      case 'Users':
        return <Users className={className} style={{ color }} />;
      case 'Heart':
        return <Heart className={className} style={{ color }} />;
      case 'Dumbbell':
        return <Dumbbell className={className} style={{ color }} />;
      case 'Target':
        return <Target className={className} style={{ color }} />;
      case 'BookOpen':
        return <BookOpen className={className} style={{ color }} />;
      case 'MessageSquare':
        return <MessageSquare className={className} style={{ color }} />;
      case 'Crown':
        return <Crown className={className} style={{ color }} />;
      case 'Footprints':
        return <Footprints className={className} style={{ color }} />;
      case 'Zap':
        return <Zap className={className} style={{ color }} />;
      case 'Hourglass':
        return <Hourglass className={className} style={{ color }} />;
      case 'Compass':
        return <Compass className={className} style={{ color }} />;
      case 'Eye':
        return <Eye className={className} style={{ color }} />;
      case 'Handshake':
        return <Handshake className={className} style={{ color }} />;
      case 'Shield':
        return <Shield className={className} style={{ color }} />;
      case 'Sparkles':
        return <Sparkles className={className} style={{ color }} />;
      case 'Award':
        return <Award className={className} style={{ color }} />;
      case 'Lock':
        return <Lock className={className} style={{ color }} />;
      default:
        return <Sparkles className={className} style={{ color }} />;
    }
  };

  // Auto-scroll when tutorial targets a node
  useEffect(() => {
    if (!tourStepId) return;

    const targetId = tutorialNodeId || selectedNodeId;
    if (targetId) {
      // Find node branch to auto-switch if needed
      const node = UNIFIED_SKILL_NODES.find((n) => n.id === targetId);
      if (node && node.branchId !== 'core' && node.branchId !== activeBranchId) {
        onSelectBranch(node.branchId);
      }

      // Smooth scroll to the target card
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-skill-node-id="${targetId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [tourStepId, tutorialNodeId, selectedNodeId, activeBranchId, onSelectBranch]);

  // Render individual Node Card
  const renderNodeCard = (
    node: UnifiedSkillNode,
    options: {
      isProminent?: boolean;
      tierLabel?: string;
      customWidthClass?: string;
    } = {}
  ) => {
    const level = nodeLevels[node.id] || 0;
    const isUnlocked = level > 0;
    const isMaxed = level >= node.maxLevel;
    const validation = canUnlockNode(node.id, availableSp, playerLevel, skills);
    const isAvailable = validation.canUnlock && !isMaxed;
    const isLocked = !isUnlocked && !isAvailable;
    const isSelected = selectedNodeId === node.id;
    const branchColor = getBranchColor(node.branchId);
    const lockReason = isLocked ? getConciseLockReason(node) : '';
    const isMastery = node.isMastery || node.tier >= 5;

    return (
      <button
        key={node.id}
        type="button"
        data-skill-node-id={node.id}
        data-forge-tour="skill-tree-mobile-node"
        onClick={() => onSelectNode(node)}
        aria-label={`${node.title} - ${isUnlocked ? 'Unlocked' : isAvailable ? 'Available' : 'Locked'}`}
        aria-pressed={isSelected}
        className={`relative w-full text-left rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden p-3.5 select-none flex flex-col justify-between ${
          options.customWidthClass || ''
        } ${
          isMastery ? 'min-h-[88px]' : 'min-h-[78px]'
        } ${
          isSelected
            ? 'ring-2 ring-[var(--forge-border-accent)] ring-offset-2 ring-offset-[var(--forge-bg)]'
            : ''
        } ${
          isUnlocked
            ? 'bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] shadow-xs'
            : isAvailable
            ? 'bg-[var(--forge-surface-elevated)] border-2 border-[var(--forge-border-accent)] shadow-md animate-pulse'
            : 'bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[var(--forge-text-muted)] hover:border-[var(--forge-border-strong)]'
        }`}
        style={
          isUnlocked
            ? {
                borderColor: `${branchColor}60`,
                boxShadow: `0 2px 12px ${branchColor}12`,
              }
            : undefined
        }
      >
        {/* Subtle background glow for available / unlocked */}
        {isAvailable && (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--forge-primary-muted)] via-transparent to-transparent pointer-events-none" />
        )}
        {isUnlocked && (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              background: `radial-gradient(circle at top right, ${branchColor} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Card Header: Icon + Title + SP/Tier */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 border"
              style={{
                backgroundColor: isUnlocked
                  ? `${branchColor}20`
                  : isAvailable
                  ? 'var(--forge-primary-muted)'
                  : 'var(--forge-surface-interactive)',
                borderColor: isUnlocked
                  ? `${branchColor}50`
                  : isAvailable
                  ? 'var(--forge-border-accent)'
                  : 'var(--forge-border)',
              }}
            >
              {isUnlocked ? (
                renderIcon(node.icon, branchColor, 'w-3.5 h-3.5')
              ) : isAvailable ? (
                renderIcon(node.icon, 'var(--forge-text-accent)', 'w-3.5 h-3.5')
              ) : (
                <Lock className="w-3.5 h-3.5 text-[var(--forge-text-muted)]" />
              )}
            </div>

            <div className="min-w-0">
              <h4
                className={`text-xs font-black uppercase tracking-wide truncate ${
                  isUnlocked
                    ? 'text-[var(--forge-text-primary)]'
                    : isAvailable
                    ? 'text-[var(--forge-text-accent)]'
                    : 'text-[var(--forge-text-secondary)]'
                }`}
              >
                {node.title}
              </h4>
              <p className="text-[10px] text-[var(--forge-text-secondary)] truncate font-medium">
                {node.subtitle || (node.isBranchHub ? 'Branch Hub' : `Tier ${node.tier}`)}
              </p>
            </div>
          </div>

          {/* Tier badge */}
          <div className="shrink-0 flex flex-col items-end">
            <span
              className={`text-[10px] font-mono font-extrabold ${
                isUnlocked
                  ? 'text-[#10B981]'
                  : isAvailable
                  ? 'text-[var(--forge-text-accent)]'
                  : 'text-[var(--forge-text-muted)]'
              }`}
            >
              {node.tier > 0 ? `RING ${node.tier}` : 'ORIGIN'}
            </span>
          </div>
        </div>

        {/* Card Footer: Level & Unlock Status Pill */}
        <div className="relative z-10 flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-[var(--forge-border)] text-[10px]">
          <span className="font-mono text-[var(--forge-text-secondary)]">
            Lvl {level}/{node.maxLevel}
          </span>

          {isMaxed ? (
            <span className="flex items-center gap-1 font-bold text-[#10B981]">
              <Check className="w-3 h-3" /> {isMastery ? 'MASTERED' : 'MAX'}
            </span>
          ) : isUnlocked ? (
            <span className="flex items-center gap-1 font-bold text-[#10B981]">
              <Check className="w-3 h-3" /> UNLOCKED
            </span>
          ) : isAvailable ? (
            <span className="flex items-center gap-1 font-extrabold text-[var(--forge-text-accent)] tracking-wider">
              <Zap className="w-3 h-3 fill-current" /> AVAILABLE
            </span>
          ) : (
            <span className="text-[var(--forge-text-muted)] font-medium truncate max-w-[110px]" title={lockReason}>
              {lockReason || 'Locked'}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      data-forge-tour="skill-tree-mobile"
      className="w-full flex flex-col space-y-4 pb-16 select-none text-[var(--forge-text-primary)]"
    >
      {/* ========================================================================= */}
      {/* 1. BRANCH SELECTOR (CHOOSE YOUR SPECIALIZATION) */}
      {/* ========================================================================= */}
      <section
        aria-label="Choose Your Specialization"
        data-forge-tour="skill-tree-mobile-branch"
        className="w-full p-3.5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] space-y-2.5 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--forge-text-secondary)] uppercase flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            CHOOSE YOUR SPECIALIZATION
          </span>
          <span className="text-[10px] font-mono text-[var(--forge-text-accent)] font-semibold">Tap to Switch</span>
        </div>

        {/* 3 Main Branches: PHYSICAL, MENTAL, SOCIAL */}
        <div className="grid grid-cols-3 gap-2">
          {SKILL_BRANCHES.filter((b) => b.id !== 'core' && b.id !== 'lifestyle').map((branch) => {
            const isSelected = activeBranchId === branch.id;
            const branchUnlockedCount = UNIFIED_SKILL_NODES.filter(
              (n) => n.branchId === branch.id && (nodeLevels[n.id] || 0) > 0
            ).length;
            const branchTotal = UNIFIED_SKILL_NODES.filter((n) => n.branchId === branch.id).length;

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => onSelectBranch(branch.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-center relative overflow-hidden ${
                  isSelected
                    ? 'bg-[var(--forge-surface-elevated)] shadow-sm'
                    : 'bg-[var(--forge-surface)] border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:border-[var(--forge-border-accent)]'
                }`}
                style={{
                  borderColor: isSelected ? branch.color : undefined,
                  boxShadow: isSelected ? `0 2px 14px ${branch.color}25` : undefined,
                }}
              >
                {isSelected && (
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{ backgroundColor: branch.color }}
                  />
                )}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 border"
                  style={{
                    backgroundColor: isSelected ? `${branch.color}25` : 'var(--forge-surface-interactive)',
                    borderColor: isSelected ? branch.color : 'var(--forge-border)',
                  }}
                >
                  {renderIcon(branch.icon, isSelected ? branch.color : 'var(--forge-text-muted)', 'w-4 h-4')}
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider truncate w-full ${
                    isSelected ? 'text-[var(--forge-text-primary)]' : 'text-[var(--forge-text-secondary)]'
                  }`}
                >
                  {branch.name.split('&')[0].trim()}
                </span>
                <span className="text-[10px] font-mono text-[var(--forge-text-muted)] mt-0.5">
                  {branchUnlockedCount}/{branchTotal}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ROOT FORGE ORIGIN NODE */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center">
        <div className="text-[10px] font-mono font-bold tracking-widest text-[var(--forge-text-accent)] uppercase mb-1.5 flex items-center gap-1">
          <Hammer className="w-3 h-3 text-[var(--forge-text-accent)]" />
          ORIGIN • TIER 0
        </div>

        <div className="w-full max-w-sm">
          {renderNodeCard(rootNode, { isProminent: true, tierLabel: 'Universal Crucible' })}
        </div>

        {/* Downward Vertical Connector Line to Branch Foundation */}
        <div className="flex flex-col items-center my-1">
          <div
            className="w-0.5 h-6 transition-colors duration-300"
            style={{ backgroundColor: activeBranchMeta.color }}
          />
          <ChevronDown className="w-3.5 h-3.5 -mt-1" style={{ color: activeBranchMeta.color }} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SELECTED BRANCH PROGRESSION PATH */}
      {/* ========================================================================= */}
      <section
        aria-label={`${activeBranchMeta.name} Progression Path`}
        className="w-full flex flex-col items-center space-y-4 pt-1"
      >
        {/* Tier 1: Branch Foundation Node */}
        {branchHubNode && (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="text-[10px] font-mono font-bold tracking-widest uppercase mb-1.5 flex items-center gap-1" style={{ color: activeBranchMeta.color }}>
              <Shield className="w-3 h-3" />
              TIER 1 • BRANCH FOUNDATION
            </div>
            {renderNodeCard(branchHubNode, { isProminent: true })}
          </div>
        )}

        {/* Branching Line Structure (T-Split into the 2 Sub-Branches) */}
        <div className="w-full max-w-md flex flex-col items-center my-0">
          {/* Vertical Stem */}
          <div
            className="w-0.5 h-5"
            style={{ backgroundColor: `${activeBranchMeta.color}80` }}
          />
          {/* Horizontal Split Line */}
          <div className="w-[50%] h-0.5 relative" style={{ backgroundColor: `${activeBranchMeta.color}80` }}>
            {/* Left drop line */}
            <div
              className="absolute left-0 top-0 w-0.5 h-4"
              style={{ backgroundColor: `${activeBranchMeta.color}80` }}
            />
            {/* Right drop line */}
            <div
              className="absolute right-0 top-0 w-0.5 h-4"
              style={{ backgroundColor: `${activeBranchMeta.color}80` }}
            />
          </div>
          <div className="h-4" />
        </div>

        {/* Tier 2 to Tier 6: 2-Column Progression Grid for Sub-Branches */}
        <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {subBranchChains.map(({ subNode, chain }) => (
            <div key={subNode.id} className="flex flex-col space-y-3">
              {chain.map((node, index) => {
                const tierNumber = node.tier;
                const isMasteryNode = node.isMastery || tierNumber >= 5;

                return (
                  <React.Fragment key={node.id}>
                    {index > 0 && (
                      /* Vertical connector line between tier nodes */
                      <div className="flex flex-col items-center py-0.5">
                        <div
                          className="w-0.5 h-4 transition-colors"
                          style={{
                            backgroundColor:
                              (nodeLevels[node.id] || 0) > 0
                                ? activeBranchMeta.color
                                : isLight ? '#BEB6A6' : '#2A2A35',
                          }}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${isLight ? 'text-[#8E8E93]' : 'text-[#475569]'}`}
                          style={{
                            color:
                              (nodeLevels[node.id] || 0) > 0
                                ? activeBranchMeta.color
                                : undefined,
                          }}
                        />
                      </div>
                    )}

                    {/* Section Depth Indicator before special tiers */}
                    {index === 0 && (
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] text-center mb-0.5">
                        Sub-Branch
                      </div>
                    )}
                    {tierNumber === 3 && index === 1 && (
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] text-center mb-0.5">
                        Specialization
                      </div>
                    )}
                    {tierNumber === 4 && (
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-secondary)] text-center mb-0.5">
                        Advanced
                      </div>
                    )}
                    {isMasteryNode && tierNumber === 5 && (
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--forge-text-accent)] text-center mb-0.5 flex items-center justify-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-[var(--forge-text-accent)]" />
                        Mastery
                      </div>
                    )}
                    {tierNumber === 6 && (
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#F59E0B] text-center mb-0.5 flex items-center justify-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />
                        Apex
                      </div>
                    )}

                    {renderNodeCard(node)}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
