import { UnifiedSkillNode } from '../data/unifiedSkillTreeData';

export interface SkillNodeLayoutPosition {
  nodeId: string;
  x: number;
  y: number;
  depth: number;
  angle: number; // in degrees (0 to 360)
  radius: number; // in pixels from center
}

// Center of the radial constellation canvas
export const CANVAS_CENTER_X = 800;
export const CANVAS_CENTER_Y = 800;
export const CANVAS_SIZE = 1600;

// Centralized SP Cost Progression by Depth/Tier
export const SKILL_TREE_SP_COST_BY_DEPTH: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 9,
  6: 13,
  7: 18,
};

/**
 * Authoritative SP cost calculator based on node depth/tier and mastery
 */
export function getSkillPointCostForDepth(depthOrTier: number, isMastery: boolean = false): number {
  if (isMastery) {
    if (depthOrTier >= 6) return 25; // Apex Peak Mastery
    return 13; // Tier 5 Mastery Capstones
  }
  const depth = Math.max(0, Math.round(depthOrTier));
  if (depth in SKILL_TREE_SP_COST_BY_DEPTH) {
    return SKILL_TREE_SP_COST_BY_DEPTH[depth];
  }
  return depth >= 6 ? 25 : 18;
}

// Concentric ring radii (in pixels)
export const RING_RADII_BY_DEPTH: Record<number, number> = {
  0: 0,    // Center Core Root
  1: 150,  // Ring 1: Branch Hubs (Physical, Mental, Social)
  2: 270,  // Ring 2: Sub-Branch Hubs
  3: 390,  // Ring 3: Specialization Tier 1
  4: 510,  // Ring 4: Specialization Tier 2
  5: 630,  // Ring 5: Mastery & Capstones
  6: 750,  // Ring 6: Peak Performance / Apex
};

// Base sector angles for primary branches (in degrees)
export const BRANCH_SECTOR_ANGLES: Record<string, number> = {
  physical: 270, // Top / North (12 o'clock)
  mental: 150,   // South-West / Bottom-Left (8 o'clock)
  social: 30,    // South-East / Bottom-Right (4 o'clock)
  lifestyle: 90, // South / Bottom (6 o'clock)
  core: 0,       // Center
};

// Specific sub-branch angular offsets from their branch center
export const SUB_BRANCH_ANGLES: Record<string, number> = {
  // Physical sub-branches (around 270°)
  Endurance: 246,  // -24° (North-West)
  Strength: 294,   // +24° (North-East)

  // Mental sub-branches (around 150°)
  Focus: 126,      // -24° (West-South-West)
  Knowledge: 174,  // +24° (South-South-West)

  // Social sub-branches (around 30°)
  Communication: 6, // -24° (East-North-East)
  Leadership: 54,   // +24° (East-South-East)
};

/**
 * Deterministically compute the radial constellation layout position for all skill tree nodes
 */
export function calculateSkillTreeLayout(
  nodes: UnifiedSkillNode[],
  centerX: number = CANVAS_CENTER_X,
  centerY: number = CANVAS_CENTER_Y
): Record<string, SkillNodeLayoutPosition> {
  const layoutMap: Record<string, SkillNodeLayoutPosition> = {};

  nodes.forEach((node) => {
    const depth = node.tier;

    // 1. Determine Radius
    let radius = 0;
    if (depth in RING_RADII_BY_DEPTH) {
      radius = RING_RADII_BY_DEPTH[depth];
    } else if (depth > 6) {
      radius = 860 + (depth - 6) * 140;
    }

    // 2. Determine Angle
    let angle = 0;
    if (node.isRoot || node.branchId === 'core' || depth === 0) {
      angle = 0;
      radius = 0;
    } else if (node.isBranchHub || depth === 1) {
      angle = BRANCH_SECTOR_ANGLES[node.branchId] ?? 0;
    } else if (node.subBranch && node.subBranch in SUB_BRANCH_ANGLES) {
      angle = SUB_BRANCH_ANGLES[node.subBranch];
    } else if (node.branchId in BRANCH_SECTOR_ANGLES) {
      angle = BRANCH_SECTOR_ANGLES[node.branchId];
    }

    // 3. Convert Polar Coordinates (r, theta) to Cartesian (x, y)
    const angleRad = (angle * Math.PI) / 180;
    const x = Math.round(centerX + radius * Math.cos(angleRad));
    const y = Math.round(centerY + radius * Math.sin(angleRad));

    layoutMap[node.id] = {
      nodeId: node.id,
      x,
      y,
      depth,
      angle,
      radius,
    };
  });

  return layoutMap;
}

/**
 * Get visual node size based on depth / tier hierarchy
 */
export function getNodeVisualSize(node: UnifiedSkillNode): {
  outerSize: number;
  iconSizeClass: string;
  borderWidth: string;
} {
  if (node.isRoot) {
    return { outerSize: 76, iconSizeClass: 'w-8 h-8', borderWidth: '3px' };
  }
  if (node.isBranchHub) {
    return { outerSize: 66, iconSizeClass: 'w-7 h-7', borderWidth: '2.5px' };
  }
  if (node.tier === 2) {
    return { outerSize: 56, iconSizeClass: 'w-5 h-5', borderWidth: '2px' };
  }
  if (node.tier === 3) {
    return { outerSize: 58, iconSizeClass: 'w-5 h-5', borderWidth: '2px' };
  }
  if (node.tier === 4) {
    return { outerSize: 62, iconSizeClass: 'w-6 h-6', borderWidth: '2.5px' };
  }
  if (node.tier >= 5 || node.isMastery) {
    return { outerSize: 68, iconSizeClass: 'w-6 h-6', borderWidth: '3px' };
  }
  return { outerSize: 54, iconSizeClass: 'w-5 h-5', borderWidth: '2px' };
}
