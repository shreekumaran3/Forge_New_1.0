export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface UsableViewportBounds {
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  usableHeight: number;
  usableWidth: number;
}

/**
 * Calculates current safe and usable viewport bounds taking into account
 * top sticky header, fixed bottom navigation, and standard mobile safe areas.
 */
export function getUsableViewportBounds(): UsableViewportBounds {
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Measure actual Header height dynamically
  const headerEl = typeof document !== 'undefined' ? document.querySelector('header') : null;
  const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 56;
  const safeTop = Math.max(64, headerBottom + 12);

  // Measure actual Bottom Navigation height dynamically
  const navEl =
    typeof document !== 'undefined'
      ? document.querySelector('nav') || document.querySelector('[role="navigation"]')
      : null;
  const navTop = navEl ? navEl.getBoundingClientRect().top : windowHeight - 75;
  const safeBottom = Math.min(windowHeight - 75, navTop - 12);

  const safeLeft = 12;
  const safeRight = windowWidth - 12;

  return {
    safeTop,
    safeBottom,
    safeLeft,
    safeRight,
    usableHeight: Math.max(100, safeBottom - safeTop),
    usableWidth: Math.max(100, safeRight - safeLeft),
  };
}

/**
 * Walks up the DOM tree from an element to identify the nearest scrollable container.
 * Falls back to <main> or window if no inner container is scrollable.
 */
export function findScrollableAncestor(element: HTMLElement | null): HTMLElement | Window {
  if (!element || typeof window === 'undefined') return window;

  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    const isScrollableStyle =
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflow === 'auto' ||
      overflow === 'scroll';

    // Must have active scrollable scrollHeight greater than clientHeight
    if (isScrollableStyle && parent.scrollHeight > parent.clientHeight + 4) {
      return parent;
    }
    parent = parent.parentElement;
  }

  // Check main element specifically if present
  const mainEl = document.querySelector('main');
  if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 4) {
    return mainEl;
  }

  return window;
}

/**
 * Checks if a specific DOM element is genuinely visible, non-zero sized, and not transparent
 */
export function isElementVisible(el: HTMLElement): boolean {
  if (!el || !el.isConnected) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(el);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0' ||
    parseFloat(style.opacity || '1') < 0.05
  ) {
    return false;
  }

  return true;
}

/**
 * Verifies that the center point of the element is not obscured by an unrelated overlay
 * or rendered completely offscreen. Temporarily ignores the tour portal itself.
 */
export function isPointVisibleAt(el: HTMLElement, x: number, y: number): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return true;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;

  const tourPortal = document.getElementById('forge-tour-portal');
  let prevPointerEvents = '';
  if (tourPortal) {
    prevPointerEvents = tourPortal.style.pointerEvents;
    tourPortal.style.pointerEvents = 'none';
  }

  let topEl: Element | null = null;
  try {
    topEl = document.elementFromPoint(x, y);
  } finally {
    if (tourPortal) {
      tourPortal.style.pointerEvents = prevPointerEvents;
    }
  }

  if (!topEl) return false;
  return el === topEl || el.contains(topEl) || topEl.contains(el);
}

/**
 * Detects whether a target DOM element is styled as a circle / circular button.
 */
export function isElementCircular(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (el.classList.contains('skill-node-btn') || el.classList.contains('rounded-full')) return true;
  try {
    const style = window.getComputedStyle(el);
    if (style.borderRadius.includes('50%') || style.borderRadius.includes('9999px')) return true;
    const numRadius = parseFloat(style.borderRadius);
    const rect = el.getBoundingClientRect();
    if (numRadius >= Math.min(rect.width, rect.height) / 2 - 2) return true;
  } catch {
    // Fallback
  }
  return false;
}

/**
 * Finds the first actually visible element matching selector across all DOM matches.
 * Handles responsive desktop/mobile alternate nodes having the same tour data attribute.
 */
export function findVisibleTargetElement(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const matches = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  return matches.find(isElementVisible) || null;
}

/**
 * Determines whether a target element is currently fully visible in the usable viewport
 * without any clipping from headers, bottom bars, or scroll parents.
 */
export function isTargetFullyVisible(
  element: HTMLElement | null,
  safetyMargin = { top: 16, bottom: 16, left: 8, right: 8 }
): boolean {
  if (!element || !isElementVisible(element)) return false;

  const rect = element.getBoundingClientRect();
  const bounds = getUsableViewportBounds();

  // Check safe viewport bounds
  if (
    rect.top < bounds.safeTop + safetyMargin.top ||
    rect.bottom > bounds.safeBottom - safetyMargin.bottom ||
    rect.left < bounds.safeLeft - safetyMargin.left ||
    rect.right > bounds.safeRight + safetyMargin.right
  ) {
    return false;
  }

  // Check nearest scrollable parent clipping if any
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    if (
      ['auto', 'scroll', 'hidden'].includes(style.overflowY) ||
      ['auto', 'scroll', 'hidden'].includes(style.overflow)
    ) {
      const parentRect = parent.getBoundingClientRect();
      if (rect.top < parentRect.top - 2 || rect.bottom > parentRect.bottom + 2) {
        return false;
      }
    }
    parent = parent.parentElement;
  }

  return true;
}

/**
 * Measures the bounding rectangle of a DOM element.
 */
export function measureElementRect(element: HTMLElement | null): TargetRect | null {
  if (!element || !isElementVisible(element)) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Observes element position across animation frames after initial double rAF synchronization
 * until both position and transforms change by < 0.5px for 3 consecutive frames.
 */
export function waitForScrollSettled(element: HTMLElement, maxWaitMs = 500): Promise<void> {
  return new Promise((resolve) => {
    // 1. First ensure 2 full requestAnimationFrame cycles have run for layout/CSS calculation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let lastRect = element.getBoundingClientRect();
        let stableCount = 0;
        const startTime = performance.now();

        const check = () => {
          const currentRect = element.getBoundingClientRect();
          const deltaTop = Math.abs(currentRect.top - lastRect.top);
          const deltaLeft = Math.abs(currentRect.left - lastRect.left);

          if (deltaTop < 0.5 && deltaLeft < 0.5) {
            stableCount++;
          } else {
            stableCount = 0;
          }

          lastRect = currentRect;

          if (stableCount >= 3 || performance.now() - startTime >= maxWaitMs) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };

        requestAnimationFrame(check);
      });
    });
  });
}

// ============================================================================
// TUTORIAL SCROLL LOCK MANAGEMENT
// Prevents manual user scrolling (wheel, trackpad, touch swipe, keyboard scroll)
// while allowing the tutorial's programmatic positioning to execute smoothly.
// ============================================================================

let activeScrollLockCount = 0;
let isProgrammaticScrollActive = false;
let savedScrollX = 0;
let savedScrollY = 0;

let prevBodyOverflow = '';
let prevHtmlOverflow = '';
let prevBodyOverscroll = '';
let prevHtmlOverscroll = '';

const SCROLL_KEYS = new Set([
  'Space',
  ' ',
  'PageUp',
  'PageDown',
  'End',
  'Home',
  'ArrowUp',
  'ArrowDown',
]);

const handleWheelLock = (e: WheelEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleTouchMoveLock = (e: TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleKeyDownLock = (e: KeyboardEvent) => {
  if (SCROLL_KEYS.has(e.key)) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }
};

const handleScrollGuard = () => {
  if (isProgrammaticScrollActive) {
    savedScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    return;
  }
  // User or accidental layout scroll while locked: immediately revert
  window.scrollTo({
    left: savedScrollX,
    top: savedScrollY,
    behavior: 'instant' as ScrollBehavior,
  });
};

/**
 * Enables lock on user-initiated manual scrolling while keeping programmatic scrolling intact.
 * Returns an idempotent cleanup function that restores styles and listeners when the tour concludes.
 */
export function enableTutorialScrollLock(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  activeScrollLockCount++;

  if (activeScrollLockCount === 1) {
    // Preserve current scroll position
    savedScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;

    // Preserve original overflow and overscroll styles
    prevBodyOverflow = document.body.style.overflow;
    prevHtmlOverflow = document.documentElement.style.overflow;
    prevBodyOverscroll = document.body.style.overscrollBehavior;
    prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    // Apply strict non-scrolling constraints
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    // Intercept manual scrolling inputs in capture phase
    window.addEventListener('wheel', handleWheelLock, { passive: false, capture: true });
    window.addEventListener('touchmove', handleTouchMoveLock, { passive: false, capture: true });
    window.addEventListener('keydown', handleKeyDownLock, { capture: true });
    window.addEventListener('scroll', handleScrollGuard, { passive: true, capture: true });
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    activeScrollLockCount = Math.max(0, activeScrollLockCount - 1);
    if (activeScrollLockCount === 0) {
      // Clean up event listeners
      window.removeEventListener('wheel', handleWheelLock, { capture: true });
      window.removeEventListener('touchmove', handleTouchMoveLock, { capture: true });
      window.removeEventListener('keydown', handleKeyDownLock, { capture: true });
      window.removeEventListener('scroll', handleScrollGuard, { capture: true });

      // Restore original styles exactly
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;

      isProgrammaticScrollActive = false;
    }
  };
}

export function isTutorialScrollLocked(): boolean {
  return activeScrollLockCount > 0;
}

/**
 * Automatically scrolls the appropriate container smoothly so that the target
 * element is positioned within the safe usable viewport (centered when height permits).
 * Waits for layout and scroll stabilization, and executes a one-time verification check.
 */
export async function scrollTargetIntoViewIfNeeded(element: HTMLElement): Promise<boolean> {
  if (typeof window === 'undefined' || !isElementVisible(element)) return true;

  // 1. If already fully visible with comfortable margins, skip scrolling
  if (isTargetFullyVisible(element, { top: 24, bottom: 24, left: 8, right: 8 })) {
    return true;
  }

  isProgrammaticScrollActive = true;
  const isLocked = activeScrollLockCount > 0;

  // Temporarily release body/html overflow styles so programmatic scroll animation can execute
  if (isLocked) {
    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
  }

  try {
    const bounds = getUsableViewportBounds();
    const targetRect = element.getBoundingClientRect();
    const container = findScrollableAncestor(element);

    if (container === window) {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const elementAbsoluteTop = currentScrollY + targetRect.top;

      let targetScrollTop: number;
      if (targetRect.height >= bounds.usableHeight) {
        // Large element: align comfortably with top safe margin
        targetScrollTop = elementAbsoluteTop - bounds.safeTop - 12;
      } else {
        // Center vertically within the usable viewport
        const targetCenterInDoc = elementAbsoluteTop + targetRect.height / 2;
        const viewportUsableCenter = bounds.safeTop + bounds.usableHeight / 2;
        targetScrollTop = targetCenterInDoc - viewportUsableCenter;
      }

      window.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    } else {
      const containerEl = container as HTMLElement;
      const containerRect = containerEl.getBoundingClientRect();
      const containerScrollTop = containerEl.scrollTop;
      const relativeTop = targetRect.top - containerRect.top + containerScrollTop;
      const containerUsableHeight = containerEl.clientHeight;

      let targetScrollTop: number;
      if (targetRect.height >= containerUsableHeight) {
        targetScrollTop = relativeTop - 16;
      } else {
        // Center in container
        targetScrollTop = relativeTop + targetRect.height / 2 - containerUsableHeight / 2;
      }

      containerEl.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }

    // 2. Wait for smooth scroll animation to stabilize
    await waitForScrollSettled(element);

    // 3. Post-scroll verification & 1-shot corrective adjustment
    const finalRect = element.getBoundingClientRect();
    if (finalRect.top < bounds.safeTop + 8) {
      const correctiveDiff = finalRect.top - (bounds.safeTop + 16);
      if (container === window) {
        window.scrollBy({ top: correctiveDiff, behavior: 'instant' });
      } else {
        (container as HTMLElement).scrollBy({ top: correctiveDiff, behavior: 'instant' });
      }
      await new Promise((r) => requestAnimationFrame(r));
    } else if (finalRect.bottom > bounds.safeBottom - 8) {
      const correctiveDiff = finalRect.bottom - (bounds.safeBottom - 16);
      if (container === window) {
        window.scrollBy({ top: correctiveDiff, behavior: 'instant' });
      } else {
        (container as HTMLElement).scrollBy({ top: correctiveDiff, behavior: 'instant' });
      }
      await new Promise((r) => requestAnimationFrame(r));
    }

    return true;
  } finally {
    // Record settled coordinates into saved scroll tracker
    savedScrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;

    // Restore lock styles if still locked
    if (isLocked && activeScrollLockCount > 0) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    isProgrammaticScrollActive = false;
  }
}

/**
 * Continuously polls / observes the DOM to locate an active, visible target element.
 * Resolves with the found HTMLElement with verified non-zero dimensions, or null after timeout.
 */
export function resolveTargetElement(
  selector: string,
  timeoutMs = 2400
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    // Immediate check
    const initialEl = findVisibleTargetElement(selector);
    if (initialEl) {
      resolve(initialEl);
      return;
    }

    const startTime = performance.now();
    let rafId: number | null = null;
    let observer: MutationObserver | null = null;
    let isFinished = false;

    const cleanup = () => {
      isFinished = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    const attemptFind = () => {
      if (isFinished) return;

      const el = findVisibleTargetElement(selector);
      if (el) {
        cleanup();
        resolve(el);
        return;
      }

      if (performance.now() - startTime >= timeoutMs) {
        cleanup();
        resolve(null);
      }
    };

    // Watch for dynamic DOM insertions with MutationObserver
    try {
      observer = new MutationObserver(() => {
        attemptFind();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    } catch {
      // Fallback
    }

    // Throttled periodic check loop for cases where style/transform changed without DOM mutation
    const checkLoop = () => {
      if (isFinished) return;
      attemptFind();
      if (!isFinished) {
        rafId = requestAnimationFrame(checkLoop);
      }
    };

    rafId = requestAnimationFrame(checkLoop);
  });
}

/**
 * Calculates optimal tutorial card positioning relative to the target element and
 * usable viewport boundaries.
 */
export function calculateTourCardLayout(
  targetRect: TargetRect | null,
  preferredPlacement: 'top' | 'bottom' | 'left' | 'right' | 'auto' = 'auto'
): { top: number; left: number; width: number; placement: 'top' | 'bottom' | 'center' } {
  const bounds = getUsableViewportBounds();
  const cardWidth = Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 24 : 360);
  const estimatedCardHeight = 230;
  const margin = 14;

  if (!targetRect) {
    return {
      top: Math.max(
        bounds.safeTop,
        bounds.safeTop + (bounds.usableHeight - estimatedCardHeight) / 2
      ),
      left: Math.max(
        bounds.safeLeft,
        (typeof window !== 'undefined' ? window.innerWidth : 400 - cardWidth) / 2
      ),
      width: cardWidth,
      placement: 'center',
    };
  }

  const spaceAbove = targetRect.top - bounds.safeTop;
  const spaceBelow = bounds.safeBottom - (targetRect.top + targetRect.height);

  let placement: 'top' | 'bottom';

  // If preferred placement is top and there's enough space, use top
  if (preferredPlacement === 'top' && spaceAbove >= estimatedCardHeight + margin) {
    placement = 'top';
  } else if (preferredPlacement === 'bottom' && spaceBelow >= estimatedCardHeight + margin) {
    placement = 'bottom';
  } else {
    // If target is in lower portion of screen (e.g. mobile bottom sheet), place on top
    if (targetRect.top > bounds.safeTop + bounds.usableHeight * 0.45) {
      placement = 'top';
    } else if (spaceBelow >= spaceAbove) {
      placement = 'bottom';
    } else {
      placement = 'top';
    }
  }

  let top: number;
  if (placement === 'bottom') {
    top = targetRect.top + targetRect.height + margin;
    if (top + estimatedCardHeight > bounds.safeBottom) {
      top = Math.max(bounds.safeTop, bounds.safeBottom - estimatedCardHeight);
    }
  } else {
    top = targetRect.top - estimatedCardHeight - margin;
    if (top < bounds.safeTop) {
      top = bounds.safeTop;
    }
  }

  // Center horizontally relative to target center, clamped within safe margins
  const targetCenter = targetRect.left + targetRect.width / 2;
  const windowW = typeof window !== 'undefined' ? window.innerWidth : 400;
  let left = targetCenter - cardWidth / 2;
  left = Math.max(bounds.safeLeft, Math.min(windowW - cardWidth - bounds.safeLeft, left));

  return {
    top,
    left,
    width: cardWidth,
    placement,
  };
}
