const FORGE_TUTORIAL_COMPLETED_KEY = 'forgeTutorialCompleted';

/**
 * Check if the user has completed or dismissed the first-time Forge tutorial.
 */
export function isForgeTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(FORGE_TUTORIAL_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark the Forge tutorial as completed in local storage.
 */
export function setForgeTutorialCompleted(completed: boolean = true): void {
  try {
    localStorage.setItem(FORGE_TUTORIAL_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (err) {
    console.error('Failed to set forge tutorial status:', err);
  }
}

/**
 * Reset tutorial completion flag (useful for testing or manual triggers).
 */
export function resetForgeTutorialStatus(): void {
  try {
    localStorage.removeItem(FORGE_TUTORIAL_COMPLETED_KEY);
  } catch (err) {
    console.error('Failed to reset forge tutorial status:', err);
  }
}
