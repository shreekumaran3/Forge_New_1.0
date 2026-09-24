/**
 * Quest Quality Validator
 * Strict quality gates to detect and purge generic procedural quests
 * and guarantee concrete, actionable, craft-specific content.
 */

export const GENERIC_TITLE_PATTERNS = [
  /\bMastery Benchmark Challenge\b/i,
  /\bMasterwork Horizon\b/i,
  /\bLandmark Capstone Project\b/i,
  /\bComprehensive synthesis portfolio\b/i,
  /\bDeliberate Practice\b/i,
  /\bContextual Application\b/i,
  /\bMilestone Sprint\b/i,
  /\bObjective Sprint\b/i,
  /\bObjective Capstone\b/i,
  /\bRapid Micro-Drill\b/i,
  /\bDiagnostic Review\b/i,
  /^Personal Pursuit:/i,
  /\bPersonal Pursuit\b/i,
  /^Monotask Sprint$/i,
  /:\s*Monotask Sprint\b/i,
  /\bExecution Sprint\b/i,
  /\bSkill Calibration\b/i,
  /\bTechnical Fundamentals Drill\b/i,
  /\bPrecision Drill\b/i,
  /:\s*Deliberate Practice\b/i,
  /:\s*Contextual Application\b/i,
  /:\s*Milestone Sprint\b/i,
  /:\s*Rapid Micro-Drill\b/i,
  /:\s*Diagnostic Review\b/i,
];

export const VAGUE_ACTION_PHRASES = [
  /\bwork on\b/i,
  /\bpractice your\b/i,
  /\bmake progress on\b/i,
  /\bspend time on\b/i,
  /\bdo some\b/i,
  /\bfocus on\b/i,
  /\bcalibrate mechanics\b/i,
  /\bdeep practice\b/i,
];

export function isGenericTitle(title?: string): boolean {
  if (!title || typeof title !== 'string') return true;
  const trimmed = title.trim();
  if (trimmed.length < 3) return true;
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function isConcreteAction(action?: string): boolean {
  if (!action || typeof action !== 'string') return false;
  const trimmed = action.trim();
  if (trimmed.length < 10) return false;

  // Reject if it is purely a vague phrase without concrete substance
  const isVague = VAGUE_ACTION_PHRASES.some((phrase) => phrase.test(trimmed));
  if (isVague && trimmed.split(/\s+/).length <= 6) {
    return false;
  }

  // Must contain at least one concrete constraint:
  // 1. Duration (e.g. 15-minute, 20m, 30s)
  // 2. Quantity (e.g. 20 gesture, 3 sets, 500-word, 1 page)
  // 3. Concrete action verbs (draw, climb, read, write, sketch, execute, synthesize, sprint, walk, log, hold, code)
  const hasDuration = /\b\d+\s*(?:min|mins|minute|minutes|sec|second|seconds|s|m|hour|hr|hrs)\b/i.test(trimmed);
  const hasQuantity = /\b(?:\d+|three|five|ten|twenty)\b/i.test(trimmed);
  const hasActionVerb = /\b(?:draw|sketch|paint|render|write|draft|read|code|debug|refactor|traverse|hang|boulder|climb|walk|run|plank|squat|lift|review|annotate|outline|study|summarize|execute|produce)\b/i.test(trimmed);

  return hasDuration || hasQuantity || hasActionVerb;
}
