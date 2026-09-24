/**
 * KEEP WALKING - Guided Breathing Audio & Synthesizer
 * Uses Web Audio API for soft bell/chime tones without external audio assets.
 */

import { soundManager } from './soundManager';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a soft bell/chime tone for phase transition or session start
 */
export function playPhaseChime(freq = 432, duration = 0.8, volume = 0.15) {
  try {
    const settings = soundManager.getSettings();
    if (!settings.enabled || settings.volume <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const scaledVolume = volume * (settings.volume / 100);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(scaledVolume, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Graceful fallback if browser restricts audio autoplay
  }
}

/**
 * Play deep Tibetan singing bowl / end bell tone
 */
export function playSessionEndBell() {
  try {
    const settings = soundManager.getSettings();
    if (!settings.enabled || settings.volume <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const masterScale = settings.volume / 100;
    const harmonics = [216, 432, 648, 864];
    harmonics.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const vol = (index === 0 ? 0.25 : 0.08 / index) * masterScale;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 3.0);
    });
  } catch (e) {
    // Fallback
  }
}

/**
 * Trigger mobile vibration if supported
 */
export function triggerHaptic(pattern: number[] = [30, 40, 30]) {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore
    }
  }
}
