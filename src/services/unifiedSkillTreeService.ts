import { db } from '../db/database';
import { UNIFIED_SKILL_NODES, UnifiedSkillNode, SKILL_BRANCHES } from '../data/unifiedSkillTreeData';
export {
  SKILL_TREE_SP_COST_BY_DEPTH,
  getSkillPointCostForDepth,
  calculateSkillTreeLayout,
  getNodeVisualSize,
  CANVAS_CENTER_X,
  CANVAS_CENTER_Y,
  CANVAS_SIZE,
  RING_RADII_BY_DEPTH,
  BRANCH_SECTOR_ANGLES,
  SUB_BRANCH_ANGLES,
} from './skillTreeLayoutService';
export type { SkillNodeLayoutPosition } from './skillTreeLayoutService';

const NODE_LEVELS_KEY = 'forge_skill_node_levels';
const UNLOCKED_NODES_KEY = 'forge_unlocked_skill_nodes';
export const SKILL_TREE_ECONOMY_VERSION = '2';
const ECONOMY_VERSION_KEY = 'forge_skill_tree_economy_version';

// Initial default node levels matching the RPG baseline (only root forge node unlocked initially)
const INITIAL_DEFAULT_LEVELS: Record<string, number> = {
  node_root_forge: 1,
};

/**
 * Migration runner: ensures existing stored skill node levels are migrated
 * to the authoritative scarce economy model (version 2).
 */
export function runSkillTreeEconomyMigration(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const currentVersion = localStorage.getItem(ECONOMY_VERSION_KEY);
    if (currentVersion === SKILL_TREE_ECONOMY_VERSION) {
      return; // Already up to date
    }

    // Reset node levels to initial clean baseline for version 2
    localStorage.setItem(NODE_LEVELS_KEY, JSON.stringify(INITIAL_DEFAULT_LEVELS));
    localStorage.setItem(UNLOCKED_NODES_KEY, JSON.stringify(['node_root_forge']));
    localStorage.setItem(ECONOMY_VERSION_KEY, SKILL_TREE_ECONOMY_VERSION);
  } catch (err) {
    console.error('Skill tree economy migration error:', err);
  }
}

/**
 * Get all skill node levels from storage
 */
export function getAllNodeLevels(): Record<string, number> {
  try {
    runSkillTreeEconomyMigration();
    const raw = localStorage.getItem(NODE_LEVELS_KEY);
    if (!raw) {
      localStorage.setItem(NODE_LEVELS_KEY, JSON.stringify(INITIAL_DEFAULT_LEVELS));
      return { ...INITIAL_DEFAULT_LEVELS };
    }
    return JSON.parse(raw);
  } catch {
    return { ...INITIAL_DEFAULT_LEVELS };
  }
}

/**
 * Get level of a specific skill node
 */
export function getNodeLevel(nodeId: string): number {
  const levels = getAllNodeLevels();
  return levels[nodeId] || 0;
}

/**
 * Save node level map to storage
 */
export function saveAllNodeLevels(levels: Record<string, number>): void {
  try {
    localStorage.setItem(NODE_LEVELS_KEY, JSON.stringify(levels));
    // Also sync unlocked nodes list for backward compatibility
    const unlocked = Object.keys(levels).filter((k) => levels[k] > 0);
    localStorage.setItem(UNLOCKED_NODES_KEY, JSON.stringify(unlocked));
  } catch (err) {
    console.error('Failed to save skill node levels:', err);
  }
}

/**
 * Get IDs of all unlocked skill nodes from storage
 */
export function getUnlockedSkillNodeIds(): string[] {
  const levels = getAllNodeLevels();
  return Object.keys(levels).filter((k) => levels[k] > 0);
}

/**
 * Get full node objects of all unlocked skill nodes
 */
export function getUnlockedSkillNodes(): UnifiedSkillNode[] {
  const unlockedIds = new Set(getUnlockedSkillNodeIds());
  return UNIFIED_SKILL_NODES.filter((n) => unlockedIds.has(n.id));
}

/**
 * Check if a node is unlocked (level > 0)
 */
export function isNodeUnlocked(nodeId: string): boolean {
  return getNodeLevel(nodeId) > 0;
}

/**
 * Check if a node can be unlocked or leveled up
 */
export function canUnlockNode(
  nodeId: string,
  availableSp: number,
  playerLevel: number = 1,
  skillsList: { id: string; level: number; primaryStatId?: string; name?: string }[] = []
): { canUnlock: boolean; reason?: string } {
  const node = UNIFIED_SKILL_NODES.find((n) => n.id === nodeId);
  if (!node) return { canUnlock: false, reason: 'Node not found' };

  const currentLevel = getNodeLevel(nodeId);
  if (currentLevel >= node.maxLevel) {
    return { canUnlock: false, reason: 'Max level reached' };
  }

  // Check prerequisite
  if (node.prerequisiteId) {
    const prereqLevel = getNodeLevel(node.prerequisiteId);
    if (prereqLevel === 0) {
      const prereq = UNIFIED_SKILL_NODES.find((n) => n.id === node.prerequisiteId);
      return {
        canUnlock: false,
        reason: `Requires ${prereq?.title || 'prerequisite'} Level 1+`,
      };
    }
  }

  // Check player level requirement
  if (node.requiredPlayerLevel && playerLevel < node.requiredPlayerLevel) {
    return {
      canUnlock: false,
      reason: `Requires Character Level ${node.requiredPlayerLevel} (Current: Level ${playerLevel})`,
    };
  }

  // Check skill level requirement
  if (node.requiredSkillId && node.requiredSkillLevel) {
    const skill = skillsList.find(
      (s) => s.id === node.requiredSkillId || s.primaryStatId === node.primaryStatId
    );
    const currentSkillLevel = skill?.level || 1;
    if (currentSkillLevel < node.requiredSkillLevel) {
      return {
        canUnlock: false,
        reason: `Requires ${node.requiredSkillName || skill?.name || 'Skill'} Level ${node.requiredSkillLevel} (Current: Level ${currentSkillLevel})`,
      };
    }
  }

  return { canUnlock: true };
}

/**
 * Upgrade/Unlock a specific skill tree node
 */
export async function unlockSkillNode(
  nodeId: string,
  onCelebration?: (amount: number) => void
): Promise<{ success: boolean; error?: string; newLevel?: number }> {
  const node = UNIFIED_SKILL_NODES.find((n) => n.id === nodeId);
  if (!node) return { success: false, error: 'Node not found' };

  const currentPlayer = await db.player.toCollection().first();
  if (!currentPlayer || !currentPlayer.id) {
    return { success: false, error: 'No player profile found' };
  }

  const currentSkills = await db.skills.toArray();
  const validation = canUnlockNode(nodeId, 0, currentPlayer.level, currentSkills);
  if (!validation.canUnlock) {
    return { success: false, error: validation.reason };
  }

  // Update node level
  const levels = getAllNodeLevels();
  const currentLevel = levels[nodeId] || 0;
  const newLevel = currentLevel + 1;
  levels[nodeId] = newLevel;

  saveAllNodeLevels(levels);

  if (onCelebration) {
    onCelebration(1);
  }

  return { success: true, newLevel };
}

/**
 * Reset all mastered skill tree perks
 */
export async function resetSkillTree(): Promise<{ success: boolean; refundedSp: number; error?: string }> {
  const currentPlayer = await db.player.toCollection().first();
  if (!currentPlayer || !currentPlayer.id) {
    return { success: false, refundedSp: 0, error: 'No player profile found' };
  }

  // Reset levels back to initial baseline ({ node_root_forge: 1 })
  const resetLevels: Record<string, number> = {
    node_root_forge: 1,
  };
  saveAllNodeLevels(resetLevels);

  return { success: true, refundedSp: 0 };
}

/**
 * Get total mastered perks in a branch
 */
export function getBranchPointsInvested(branchId: string): number {
  const levels = getAllNodeLevels();
  const branchNodes = UNIFIED_SKILL_NODES.filter((n) => n.branchId === branchId && !n.isBranchHub);
  return branchNodes.reduce((acc, n) => acc + (levels[n.id] || 0), 0);
}

/**
 * Get total perks mastered across entire tree
 */
export function getTotalPointsInvested(): number {
  const levels = getAllNodeLevels();
  return Object.keys(levels).reduce((acc, nodeId) => {
    const node = UNIFIED_SKILL_NODES.find((n) => n.id === nodeId);
    if (node && !node.isRoot && !node.isBranchHub) {
      return acc + (levels[nodeId] || 0);
    }
    return acc;
  }, 0);
}

/**
 * Get summary breakdown of skill tree investments by branch
 */
export function getSkillTreeBranchSummary(): {
  branchId: string;
  branchName: string;
  color: string;
  accentColor: string;
  borderColor: string;
  icon: string;
  totalNodes: number;
  unlockedNodes: number;
  pointsInvested: number;
  completionPercent: number;
}[] {
  const levels = getAllNodeLevels();

  return SKILL_BRANCHES.filter((b) => b.id !== 'core').map((branch) => {
    const branchNodes = UNIFIED_SKILL_NODES.filter((n) => n.branchId === branch.id);
    const unlockedBranchNodes = branchNodes.filter((n) => (levels[n.id] || 0) > 0);
    const pointsInvested = branchNodes.reduce((acc, n) => acc + (levels[n.id] || 0), 0);
    const maxPoints = branchNodes.reduce((acc, n) => acc + n.maxLevel, 0);

    return {
      branchId: branch.id,
      branchName: branch.name,
      color: branch.color,
      accentColor: branch.accentColor,
      borderColor: branch.borderColor,
      icon: branch.icon,
      totalNodes: branchNodes.length,
      unlockedNodes: unlockedBranchNodes.length,
      pointsInvested,
      completionPercent: maxPoints > 0 ? Math.round((pointsInvested / maxPoints) * 100) : 0,
    };
  });
}

/**
 * Calculate dynamic RPG Character Archetype from top invested skill tree branches
 */
export function getCharacterArchetype(): {
  title: string;
  subtitle: string;
  primaryBranchId: string;
  secondaryBranchId?: string;
  totalPointsInvested: number;
} {
  const summaries = getSkillTreeBranchSummary().sort((a, b) => b.pointsInvested - a.pointsInvested);
  const primary = summaries[0] || { branchId: 'physical', pointsInvested: 0 };
  const secondary = summaries[1];

  const totalPointsInvested = getTotalPointsInvested();

  if (totalPointsInvested <= 4) {
    return {
      title: 'Initiate of the Forge',
      subtitle: 'Forging foundational habits and core virtues across all paths.',
      primaryBranchId: 'physical',
      totalPointsInvested,
    };
  }

  if (primary.pointsInvested >= 4 && primary.branchId === 'physical') {
    return {
      title: 'Peak Mountaineer & Athlete',
      subtitle: 'Forged in high-altitude endurance, rough trail rucking, and physical power.',
      primaryBranchId: 'physical',
      secondaryBranchId: secondary?.branchId,
      totalPointsInvested,
    };
  }

  if (primary.pointsInvested >= 4 && primary.branchId === 'mental') {
    return {
      title: 'Polymath & Visionary Scholar',
      subtitle: 'Mastering deep non-fiction absorption, critical synthesis, and sovereign focus.',
      primaryBranchId: 'mental',
      secondaryBranchId: secondary?.branchId,
      totalPointsInvested,
    };
  }

  if (primary.pointsInvested >= 4 && primary.branchId === 'social') {
    return {
      title: 'Orator & Community Leader',
      subtitle: 'Guiding others through persuasive rhetoric, active empathy, and generational legacy.',
      primaryBranchId: 'social',
      secondaryBranchId: secondary?.branchId,
      totalPointsInvested,
    };
  }

  return {
    title: 'Balanced Path Master',
    subtitle: 'Harmoniously advancing physical endurance, creative intellect, and leadership.',
    primaryBranchId: primary.branchId,
    secondaryBranchId: secondary?.branchId,
    totalPointsInvested,
  };
}

/**
 * Get active quest tags enabled by unlocked skill nodes
 */
export function getUnlockedQuestTags(): string[] {
  const levels = getAllNodeLevels();
  const tags = new Set<string>();

  UNIFIED_SKILL_NODES.forEach((node) => {
    if ((levels[node.id] || 0) > 0) {
      node.questTags.forEach((t) => tags.add(t.toLowerCase()));
    }
  });

  return Array.from(tags);
}

export interface TutorialNodeState {
  node: UnifiedSkillNode | null;
  status: 'available' | 'locked' | 'none';
  reason?: string;
}

/**
 * Evaluates the precise availability state of skill nodes for the tutorial walkthrough.
 * Returns an explicit status ('available', 'locked', or 'none') so onboarding can teach
 * the real state of the player's progression without hallucinating unlockable nodes.
 */
export function getTutorialAvailableNodeState(
  playerLevel: number = 1,
  availableSp: number = 0,
  skillsList: { id: string; level: number; primaryStatId?: string; name?: string }[] = []
): TutorialNodeState {
  const levels = getAllNodeLevels();

  // 1. Check for a non-root node that meets all unlock requirements (prerequisite met, player level met, skill level met, not maxed)
  const availableNode = UNIFIED_SKILL_NODES.find((node) => {
    if (node.isRoot || node.id === 'node_root_forge') return false;
    const currentLvl = levels[node.id] || 0;
    if (currentLvl >= node.maxLevel) return false;

    // Prerequisite check
    if (node.prerequisiteId) {
      const prereqLvl = levels[node.prerequisiteId] || 0;
      if (prereqLvl === 0) return false;
    }

    // Player level check
    if (node.requiredPlayerLevel && playerLevel < node.requiredPlayerLevel) {
      return false;
    }

    // Skill level check
    if (node.requiredSkillId && node.requiredSkillLevel) {
      const skill = skillsList.find(
        (s) => s.id === node.requiredSkillId || s.primaryStatId === node.primaryStatId
      );
      const currentSkillLvl = skill?.level || 1;
      if (currentSkillLvl < node.requiredSkillLevel) return false;
    }

    return true;
  });

  if (availableNode) {
    return {
      node: availableNode,
      status: 'available',
    };
  }

  // 2. If no node meets all requirements, find the next candidate locked node (e.g. prerequisite met)
  const candidateLockedNode = UNIFIED_SKILL_NODES.find((node) => {
    if (node.isRoot || node.id === 'node_root_forge') return false;
    const currentLvl = levels[node.id] || 0;
    if (currentLvl >= node.maxLevel) return false;

    if (node.prerequisiteId) {
      const prereqLvl = levels[node.prerequisiteId] || 0;
      if (prereqLvl === 0) return false;
    }

    return true;
  });

  if (candidateLockedNode) {
    return {
      node: candidateLockedNode,
      status: 'locked',
      reason: 'Node requires higher player or skill level to unlock',
    };
  }

  return {
    node: null,
    status: 'none',
    reason: 'No skill nodes available in current tree state',
  };
}

/**
 * Dynamically resolve the primary available (unlockable) node for the tutorial spotlight.
 * Never returns the root node. Finds an un-unlocked node whose prerequisites are met.
 */
export function getTutorialAvailableNode(playerLevel: number = 1): UnifiedSkillNode {
  const state = getTutorialAvailableNodeState(playerLevel);
  if (state.node) {
    return state.node;
  }
  return (
    UNIFIED_SKILL_NODES.find((n) => !n.isRoot && n.id !== 'node_root_forge') ||
    UNIFIED_SKILL_NODES[0]
  );
}

