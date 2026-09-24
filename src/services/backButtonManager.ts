/**
 * FORGE — Android System Back Button & Navigation Manager
 * 
 * Provides centralized, priority-based Android hardware/gesture Back button
 * handling with strict double-event protection, LIFO modal dismissals,
 * hierarchical Forge navigation, and full web/desktop safety.
 */

import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { playUISound } from './soundManager';

export interface BackHandlerItem {
  id: string;
  priority: number; // Higher number = executed first (e.g. Modals = 100, Tour = 80, SubView = 50, Tabs = 20)
  handler: () => boolean | void; // Return true or void if handled. Return false if fell through.
  timestamp: number;
}

class BackButtonManager {
  private handlers: BackHandlerItem[] = [];
  private lastBackEventTime = 0;
  private isCapacitorListenerAttached = false;
  private readonly THROTTLE_MS = 250;

  constructor() {
    this.initCapacitorListener();
  }

  /**
   * Initializes the native Capacitor App backButton event listener
   * with defensive checks for web/desktop environment.
   */
  private initCapacitorListener(): void {
    if (typeof window === 'undefined') return;
    if (this.isCapacitorListenerAttached) return;

    try {
      if (Capacitor.isPluginAvailable('App') || Capacitor.isNativePlatform()) {
        CapApp.addListener('backButton', () => {
          this.handleBackEvent();
        });
        this.isCapacitorListenerAttached = true;
      }
    } catch (err) {
      console.warn('[Forge Navigation] Native Back Button listener initialization bypassed:', err);
    }
  }

  /**
   * Register a back button handler.
   * Returns an unregister cleanup function.
   */
  public registerHandler(id: string, priority: number, handler: () => boolean | void): () => void {
    // Remove any existing handler with the same ID first
    this.handlers = this.handlers.filter((h) => h.id !== id);

    const item: BackHandlerItem = {
      id,
      priority,
      handler,
      timestamp: Date.now(),
    };

    this.handlers.push(item);

    // Sort descending by priority, then by timestamp (LIFO within same priority)
    this.handlers.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.timestamp - a.timestamp;
    });

    return () => {
      this.unregisterHandler(id);
    };
  }

  /**
   * Unregister a back button handler by ID.
   */
  public unregisterHandler(id: string): void {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  /**
   * Central Back Event dispatcher with rapid-press throttling and priority execution.
   * Returns true if the back event was intercepted and handled by Forge,
   * or false if it reached the root (allowing native Android exit/minimize).
   */
  public handleBackEvent(): boolean {
    const now = Date.now();
    if (now - this.lastBackEventTime < this.THROTTLE_MS) {
      // Rapid repeated press dropped for stability
      return true;
    }
    this.lastBackEventTime = now;

    // Iterate through registered handlers in priority order
    for (const item of [...this.handlers]) {
      try {
        const result = item.handler();
        // If handler didn't explicitly return false, consider it successfully handled
        if (result !== false) {
          playUISound('tap');
          return true;
        }
      } catch (err) {
        console.error(`[Forge Navigation] Error in back handler "${item.id}":`, err);
      }
    }

    // No handler caught the event - at genuine app root
    return false;
  }
}

// Global Singleton Instance
export const backButtonManager = new BackButtonManager();

/**
 * React Hook to cleanly register a back button handler in any component.
 * Automatically unregisters when the component unmounts or `enabled` becomes false.
 */
export function useBackHandler(
  id: string,
  priority: number,
  handler: () => boolean | void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;
    const unregister = backButtonManager.registerHandler(id, priority, handler);
    return () => {
      unregister();
    };
  }, [id, priority, handler, enabled]);
}
