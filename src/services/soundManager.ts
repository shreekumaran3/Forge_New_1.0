import { useState, useEffect } from 'react';
import { UI_NAVIGATION_SHWOOP_BASE64 } from '../assets/audio/navigationSoundAsset';

/**
 * FORGE — Premium Centralized Sound System
 * 
 * Provides responsive, satisfying, futuristic RPG-like audio feedback
 * built natively on the Web Audio API with zero external dependencies.
 * 
 * Features:
 * - Pre-rendered low-latency AudioBuffers for zero GC overhead during clicks
 * - Autonomous AudioContext unlock on first user interaction
 * - Built-in cooldown / debounce protection to prevent sound spam
 * - LocalStorage-persisted Master Volume & Mute configuration
 * - Safe error handling (never crashes UI if audio is blocked or unsupported)
 */

export type UISoundType =
  | 'tap'
  | 'shwoop'
  | 'uiBubble'
  | 'confirm'
  | 'success'
  | 'questStart'
  | 'questTimerComplete'
  | 'questExtend'
  | 'questAbandon'
  | 'questComplete'
  | 'questReverse'
  | 'skillUnlock'
  | 'levelUp'
  | 'retentionConfirm'
  | 'retentionLate'
  | 'relapse'
  | 'achievement'
  | 'tutorialStep'
  | 'tutorialComplete'
  | 'breatheIn'
  | 'breatheOut';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0 to 100
}

const SETTINGS_STORAGE_KEY = 'forge_sound_settings';

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 70,
};

// Relative volume hierarchy according to sound design guidelines
const SOUND_VOLUME_FACTORS: Record<UISoundType, number> = {
  tap: 0.22, // Soft, non-intrusive shwoop navigation
  shwoop: 0.22,
  uiBubble: 0.18, // Subtle bubbly micro-pop for secondary UI toggles and items
  tutorialStep: 0.16,
  confirm: 0.28,
  questStart: 0.36,
  questTimerComplete: 0.40,
  questExtend: 0.25,
  questAbandon: 0.20,
  questReverse: 0.20,
  relapse: 0.22,
  breatheIn: 0.16,
  breatheOut: 0.16,
  questComplete: 0.32,
  success: 0.32,
  tutorialComplete: 0.32,
  skillUnlock: 0.38,
  achievement: 0.40,
  retentionLate: 0.32,
  retentionConfirm: 0.44,
  levelUp: 0.55,
};

// Cooldown in milliseconds to prevent audio spam on repeated triggers
const SOUND_COOLDOWNS: Record<UISoundType, number> = {
  tap: 80, // 80ms debounce protects against machine-gun rapid navigation
  shwoop: 80,
  uiBubble: 90,
  tutorialStep: 60,
  confirm: 150,
  questStart: 400,
  questTimerComplete: 500,
  questExtend: 300,
  questAbandon: 300,
  questReverse: 200,
  relapse: 500,
  breatheIn: 1000,
  breatheOut: 1000,
  questComplete: 300,
  success: 300,
  tutorialComplete: 400,
  skillUnlock: 400,
  achievement: 600,
  retentionLate: 500,
  retentionConfirm: 500,
  levelUp: 1200,
};

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private bufferCache: Map<UISoundType, AudioBuffer> = new Map();
  private navAssetBuffer: AudioBuffer | null = null;
  private lastPlayTimes: Map<UISoundType, number> = new Map();
  private isUnlocked = false;
  private listeners: Set<(settings: SoundSettings) => void> = new Set();

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      this.attachUnlockListeners();
    }
  }

  /**
   * Load sound settings from localStorage
   */
  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = {
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
          volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(100, parsed.volume)) : DEFAULT_SETTINGS.volume,
        };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Persist sound settings to localStorage and notify subscribers
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      this.applyMasterGain();
      this.notifyListeners();
    } catch {
      // Ignore
    }
  }

  /**
   * Attach passive one-time listeners to unlock AudioContext on user gesture
   */
  private attachUnlockListeners(): void {
    const unlockEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
    const onGesture = () => {
      this.initAudio();
      unlockEvents.forEach((ev) => window.removeEventListener(ev, onGesture, true));
    };
    unlockEvents.forEach((ev) => window.addEventListener(ev, onGesture, { capture: true, once: true, passive: true }));
  }

  /**
   * Initialize and resume the Web Audio Context
   */
  public initAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
          this.masterGain = this.audioCtx.createGain();
          this.applyMasterGain();
          this.masterGain.connect(this.audioCtx.destination);
          this.preloadCommonBuffers();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else if (this.audioCtx && this.audioCtx.state === 'running') {
        this.isUnlocked = true;
      }
    } catch {
      // Graceful fallback
    }

    return this.audioCtx;
  }

  /**
   * Update master gain node volume
   */
  private applyMasterGain(): void {
    if (!this.masterGain || !this.audioCtx) return;
    try {
      const targetGain = this.settings.enabled ? (this.settings.volume / 100) : 0;
      this.masterGain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
    } catch {
      // Ignore
    }
  }

  /**
   * Pre-render commonly used sound waveforms into offline AudioBuffers
   * to eliminate any runtime lag or allocations on first tap.
   */
  private preloadCommonBuffers(): void {
    if (!this.audioCtx) return;
    const prioritizedSounds: UISoundType[] = [
      'tap',
      'uiBubble',
      'confirm',
      'success',
      'questComplete',
      'questReverse',
      'skillUnlock',
      'levelUp',
      'retentionConfirm',
      'retentionLate',
      'relapse',
      'achievement',
      'tutorialStep',
      'tutorialComplete',
    ];

    // Asynchronously render all buffers during idle / background time
    prioritizedSounds.forEach((type) => {
      try {
        const buffer = this.renderSoundBuffer(type);
        if (buffer) {
          this.bufferCache.set(type, buffer);
        }
      } catch {
        // Fallback to procedural synthesis at runtime
      }
    });
  }

  /**
   * Decodes and caches the canonical UI navigation audio asset buffer
   * directly from the pre-bundled 16-bit PCM WAV asset.
   */
  private getNavAssetBuffer(audioCtx: AudioContext): AudioBuffer | null {
    if (this.navAssetBuffer) return this.navAssetBuffer;
    try {
      const binaryString = atob(UI_NAVIGATION_SHWOOP_BASE64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const dataView = new DataView(bytes.buffer);
      // Standard WAV header is 44 bytes, 16-bit PCM mono 44100Hz
      const numSamples = Math.floor((bytes.buffer.byteLength - 44) / 2);
      const audioBuffer = audioCtx.createBuffer(1, numSamples, 44100);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(44 + i * 2, true);
        channelData[i] = int16 / 32768;
      }
      this.navAssetBuffer = audioBuffer;
      return audioBuffer;
    } catch {
      return null;
    }
  }

  /**
   * Procedurally generates a pristine AudioBuffer for a specific UI sound type
   */
  private renderSoundBuffer(type: UISoundType): AudioBuffer | null {
    if (!this.audioCtx) return null;
    const sampleRate = this.audioCtx.sampleRate;

    switch (type) {
      case 'tap':
      case 'shwoop': {
        return this.getNavAssetBuffer(this.audioCtx);
      }

      case 'uiBubble': {
        // Subtle bubbly pop for secondary UI toggles and filter items (110ms, upward pitch sweep 320Hz -> 540Hz)
        const duration = 0.11;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          // Smooth bell-like envelope with crisp 4ms attack and exponential decay
          const attack = Math.min(1, t / 0.004);
          const decay = Math.exp(-progress * 6.2);
          const env = attack * decay;

          // Upward bubble frequency glide from 320Hz to 540Hz
          const freq = 320 + Math.sin(progress * Math.PI * 0.5) * 220;
          const sine = Math.sin(2 * Math.PI * freq * t);
          const harmonic = Math.sin(4 * Math.PI * freq * t) * 0.18;

          // Tiny initial high-frequency pop transient (<12ms) for tactile organic texture
          let click = 0;
          if (t < 0.012) {
            click = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 300) * 0.15;
          }

          data[i] = (sine + harmonic + click) * env * 0.72;
        }
        return buffer;
      }

      case 'tutorialStep': {
        // Minimal clean micro-ping (40ms, 1200Hz)
        const duration = 0.04;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 90);
          data[i] = Math.sin(2 * Math.PI * 1200 * t) * env;
        }
        return buffer;
      }

      case 'confirm': {
        // Meaningful action: deeper confirmation bloop (120ms, warm sine + triangle sweep 440Hz -> 600Hz)
        const duration = 0.12;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          // Smooth bell-like envelope with soft attack
          const attack = Math.min(1, t / 0.008);
          const decay = Math.exp(-progress * 5.5);
          const env = attack * decay;
          const freq = 440 + Math.sin(progress * Math.PI * 0.5) * 180;
          const sine = Math.sin(2 * Math.PI * freq * t);
          const warm = Math.sin(4 * Math.PI * freq * t) * 0.2;
          data[i] = (sine + warm) * env * 0.9;
        }
        return buffer;
      }

      case 'questStart': {
        // Mission Accepted: Impactful futuristic chord (Sub punch 110Hz + dual energy sweep 330Hz/495Hz + crystal top chime)
        const duration = 0.45;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const bassEnv = Math.exp(-t * 14) * Math.min(1, t / 0.005);
          const bass = Math.sin(2 * Math.PI * 110 * t) * bassEnv * 0.7;

          const sweepEnv = Math.exp(-t * 7) * Math.min(1, t / 0.015);
          const chord =
            Math.sin(2 * Math.PI * 329.63 * t) * 0.4 +
            Math.sin(2 * Math.PI * 493.88 * t) * 0.35 +
            Math.sin(2 * Math.PI * 659.25 * t) * 0.3;

          let ping = 0;
          if (t >= 0.08) {
            const dt = t - 0.08;
            const pingEnv = Math.exp(-dt * 12);
            ping = Math.sin(2 * Math.PI * 1318.5 * dt) * pingEnv * 0.35;
          }

          data[i] = (bass + chord * sweepEnv + ping) * 0.65;
        }
        return buffer;
      }

      case 'questTimerComplete': {
        // Timer Complete Alert: High-clarity double resonant chime (880Hz -> 1046.5Hz)
        const duration = 0.6;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;

          // First chime (0.0s)
          if (t >= 0.0 && t <= 0.4) {
            const dt = t;
            const env = Math.exp(-dt * 9) * Math.min(1, dt / 0.004);
            sample += (Math.sin(2 * Math.PI * 880 * dt) + Math.sin(4 * Math.PI * 880 * dt) * 0.2) * env * 0.6;
          }

          // Second higher chime (0.16s)
          if (t >= 0.16) {
            const dt = t - 0.16;
            const env = Math.exp(-dt * 8) * Math.min(1, dt / 0.004);
            sample += (Math.sin(2 * Math.PI * 1046.5 * dt) + Math.sin(4 * Math.PI * 1046.5 * dt) * 0.25) * env * 0.75;
          }

          data[i] = sample * 0.6;
        }
        return buffer;
      }

      case 'questExtend': {
        // Subtle continuation tone: Warm rising interval (440Hz -> 554Hz)
        const duration = 0.25;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 8) * Math.min(1, t / 0.006);
          const freq = 440 + (t / duration) * 114;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
        }
        return buffer;
      }

      case 'questAbandon': {
        // Subdued cancellation tone: Low soft decay (220Hz -> 180Hz)
        const duration = 0.22;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 9) * Math.min(1, t / 0.005);
          const freq = 220 - (t / duration) * 40;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
        }
        return buffer;
      }

      case 'questComplete':
      case 'success': {
        // Quest Completion: 3-note ascending crystal chime (C5=523.25, E5=659.25, G5=783.99)
        const duration = 0.38;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [
          { freq: 523.25, start: 0.0, end: 0.25, vol: 0.65 },
          { freq: 659.25, start: 0.07, end: 0.32, vol: 0.75 },
          { freq: 783.99, start: 0.14, end: 0.38, vol: 0.95 },
        ];

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;

          for (const note of notes) {
            if (t >= note.start && t <= note.end) {
              const dt = t - note.start;
              const noteLen = note.end - note.start;
              const env = Math.exp(-dt * 12) * Math.min(1, dt / 0.005);
              const tone = Math.sin(2 * Math.PI * note.freq * dt) + Math.sin(4 * Math.PI * note.freq * dt) * 0.25;
              sample += tone * env * note.vol;
            }
          }
          data[i] = sample * 0.6;
        }
        return buffer;
      }

      case 'questReverse': {
        // Subtle descending reversal tone (D5=587Hz -> A4=440Hz, soft lowpass dampening)
        const duration = 0.22;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const env = Math.sin(progress * Math.PI) * Math.exp(-progress * 4);
          const freq = 587 - progress * 147;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
        }
        return buffer;
      }

      case 'skillUnlock': {
        // Energy pulse + rising crystal chime (Sub thump 140Hz + sweep 300->880Hz + high chime 1046Hz)
        const duration = 0.42;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;

          // Sub/body energy punch
          const subEnv = Math.exp(-t * 18) * Math.min(1, t / 0.004);
          const subTone = Math.sin(2 * Math.PI * 140 * t) * subEnv * 0.6;

          // Rising energetic sweep
          const sweepEnv = Math.exp(-t * 9) * Math.min(1, t / 0.01);
          const sweepFreq = 300 + Math.pow(progress, 1.4) * 600;
          const sweepTone = Math.sin(2 * Math.PI * sweepFreq * t) * sweepEnv * 0.5;

          // High sparkle shimmer chime entering at 100ms
          let chimeTone = 0;
          if (t >= 0.09) {
            const dt = t - 0.09;
            const chimeEnv = Math.exp(-dt * 11) * Math.min(1, dt / 0.005);
            chimeTone = (Math.sin(2 * Math.PI * 1046.5 * dt) + Math.sin(2 * Math.PI * 1567.98 * dt) * 0.3) * chimeEnv * 0.7;
          }

          data[i] = (subTone + sweepTone + chimeTone) * 0.65;
        }
        return buffer;
      }

      case 'retentionConfirm': {
        // Calm, powerful, mature discipline sound: deep soft impact (85Hz) + warm rising triad (261Hz/392Hz/523Hz) + resonant finish
        const duration = 0.65;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;

          // Sub-bass grounded resonance
          const bassEnv = Math.exp(-t * 6) * Math.min(1, t / 0.006);
          const bassTone = Math.sin(2 * Math.PI * 85 * t) * bassEnv * 0.6;

          // Warm harmonic pad
          const padEnv = Math.exp(-t * 5.5) * Math.min(1, t / 0.02);
          const chord =
            Math.sin(2 * Math.PI * 261.63 * t) * 0.4 +
            Math.sin(2 * Math.PI * 392.0 * t) * 0.35 +
            Math.sin(2 * Math.PI * 523.25 * t) * 0.3;

          // High clarity chime resonance (60ms in)
          let bellTone = 0;
          if (t >= 0.06) {
            const dt = t - 0.06;
            const bellEnv = Math.exp(-dt * 8);
            bellTone = (Math.sin(2 * Math.PI * 1046.5 * dt) + Math.sin(2 * Math.PI * 1318.5 * dt) * 0.25) * bellEnv * 0.4;
          }

          data[i] = (bassTone + chord * padEnv + bellTone) * 0.6;
        }
        return buffer;
      }

      case 'retentionLate': {
        // Softer, warmer version of retention confirm ("I corrected the record")
        const duration = 0.5;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const padEnv = Math.exp(-t * 7) * Math.min(1, t / 0.02);
          const chord =
            Math.sin(2 * Math.PI * 261.63 * t) * 0.4 +
            Math.sin(2 * Math.PI * 329.63 * t) * 0.3 +
            Math.sin(2 * Math.PI * 392.0 * t) * 0.3;
          data[i] = chord * padEnv * 0.6;
        }
        return buffer;
      }

      case 'relapse': {
        // Restrained, neutral, non-judgmental descending tone (240Hz -> 160Hz, gentle warm envelope)
        const duration = 0.42;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const env = Math.sin(progress * Math.PI) * Math.exp(-progress * 3.5);
          const freq = 240 - progress * 80;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
        }
        return buffer;
      }

      case 'achievement': {
        // Short achievement sting: 3 ascending crystal tones (F#5=739.99, A#5=932.33, C#6=1108.73) + sparkle
        const duration = 0.65;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [
          { freq: 739.99, start: 0.0, end: 0.35, vol: 0.6 },
          { freq: 932.33, start: 0.09, end: 0.48, vol: 0.75 },
          { freq: 1108.73, start: 0.18, end: 0.65, vol: 0.95 },
        ];

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;

          for (const note of notes) {
            if (t >= note.start && t <= note.end) {
              const dt = t - note.start;
              const env = Math.exp(-dt * 9) * Math.min(1, dt / 0.005);
              const tone = Math.sin(2 * Math.PI * note.freq * dt) + Math.sin(4 * Math.PI * note.freq * dt) * 0.2;
              sample += tone * env * note.vol;
            }
          }
          data[i] = sample * 0.55;
        }
        return buffer;
      }

      case 'tutorialComplete': {
        // Uplifting completion chime (E5=659.25 -> B5=987.77)
        const duration = 0.45;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [
          { freq: 659.25, start: 0.0, end: 0.3, vol: 0.7 },
          { freq: 987.77, start: 0.12, end: 0.45, vol: 0.9 },
        ];

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;
          for (const note of notes) {
            if (t >= note.start && t <= note.end) {
              const dt = t - note.start;
              const env = Math.exp(-dt * 10) * Math.min(1, dt / 0.005);
              sample += Math.sin(2 * Math.PI * note.freq * dt) * env * note.vol;
            }
          }
          data[i] = sample * 0.6;
        }
        return buffer;
      }

      case 'levelUp': {
        // Strongest RPG-style Level Up Fanfare (~1.4s):
        // Low impact punch (110Hz) -> Rising fanfare chord (C4/G4/C5/E5/G5/C6) -> Shimmering golden sustain
        const duration = 1.4;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const fanfareNotes = [
          { freq: 261.63, start: 0.0, end: 0.9, vol: 0.5 }, // C4
          { freq: 392.0, start: 0.08, end: 1.0, vol: 0.55 }, // G4
          { freq: 523.25, start: 0.16, end: 1.2, vol: 0.7 }, // C5
          { freq: 659.25, start: 0.24, end: 1.3, vol: 0.8 }, // E5
          { freq: 783.99, start: 0.32, end: 1.4, vol: 0.95 }, // G5
          { freq: 1046.5, start: 0.40, end: 1.4, vol: 0.9 }, // C6
        ];

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;

          // Low bass impact
          const bassEnv = Math.exp(-t * 8) * Math.min(1, t / 0.006);
          const bassTone = Math.sin(2 * Math.PI * 110 * t) * bassEnv * 0.7;

          // Fanfare notes
          let fanfareSample = 0;
          for (const note of fanfareNotes) {
            if (t >= note.start && t <= note.end) {
              const dt = t - note.start;
              const env = Math.exp(-dt * 4.2) * Math.min(1, dt / 0.008);
              const shimmer = Math.sin(2 * Math.PI * note.freq * dt) + Math.sin(4 * Math.PI * note.freq * dt) * 0.25;
              fanfareSample += shimmer * env * note.vol;
            }
          }

          data[i] = (bassTone + fanfareSample) * 0.5;
        }
        return buffer;
      }

      case 'breatheIn': {
        // Very soft rising ambient tone (200Hz -> 280Hz, 1.2s)
        const duration = 1.2;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const env = Math.sin(progress * Math.PI) * 0.5;
          const freq = 200 + progress * 80;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env;
        }
        return buffer;
      }

      case 'breatheOut': {
        // Very soft falling ambient tone (280Hz -> 200Hz, 1.2s)
        const duration = 1.2;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const env = Math.sin(progress * Math.PI) * 0.5;
          const freq = 280 - progress * 80;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env;
        }
        return buffer;
      }

      default:
        return null;
    }
  }

  /**
   * Main entry point to play a UI Sound.
   * Handles cooldowns, muted state, master volume scaling, and buffer node creation.
   */
  public play(soundType: UISoundType, options?: { volumeMultiplier?: number; force?: boolean }): boolean {
    if (!this.settings.enabled) return false;
    if (this.settings.volume <= 0) return false;

    // Cooldown check (unless forced)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldownKey = (soundType === 'tap' || soundType === 'shwoop') ? 'tap' : soundType;
    const cooldown = SOUND_COOLDOWNS[soundType] || 80;
    const lastPlayed = this.lastPlayTimes.get(cooldownKey) || 0;

    if (!options?.force && now - lastPlayed < cooldown) {
      return false;
    }

    this.lastPlayTimes.set(cooldownKey, now);
    this.lastPlayTimes.set(soundType, now);

    try {
      const ctx = this.initAudio();
      if (!ctx || !this.masterGain) return false;

      // Retrieve or render buffer
      let buffer: AudioBuffer | null | undefined = null;
      if (soundType === 'tap' || soundType === 'shwoop') {
        buffer = this.getNavAssetBuffer(ctx);
      } else {
        buffer = this.bufferCache.get(soundType);
        if (!buffer) {
          const rendered = this.renderSoundBuffer(soundType);
          if (rendered) {
            this.bufferCache.set(soundType, rendered);
            buffer = rendered;
          }
        }
      }

      if (!buffer) return false;

      // Create audio node pipeline
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buffer;

      const baseVolumeFactor = SOUND_VOLUME_FACTORS[soundType] ?? 0.25;
      const customMultiplier = options?.volumeMultiplier ?? 1.0;
      gainNode.gain.setValueAtTime(baseVolumeFactor * customMultiplier, ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start();
      return true;
    } catch {
      // Audio failures must NEVER break UI execution
      return false;
    }
  }

  // --- Public Settings API ---

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<SoundSettings>): void {
    this.settings = {
      ...this.settings,
      ...partial,
      volume: partial.volume !== undefined ? Math.max(0, Math.min(100, partial.volume)) : this.settings.volume,
    };
    this.saveSettings();
  }

  public toggleEnabled(): boolean {
    this.updateSettings({ enabled: !this.settings.enabled });
    return this.settings.enabled;
  }

  public setVolume(volume: number): void {
    this.updateSettings({ volume });
  }

  public subscribe(listener: (settings: SoundSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getSettings());
      } catch {
        // Ignore
      }
    });
  }
}

// Global Singleton Instance
export const soundManager = new SoundManager();

/**
 * Universal helper for playing UI sounds anywhere in Forge
 */
export function playUISound(
  soundType: UISoundType,
  options?: { volumeMultiplier?: number; force?: boolean }
): boolean {
  return soundManager.play(soundType, options);
}

/**
 * React Hook to subscribe to Sound settings changes
 */
export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(() => soundManager.getSettings());

  useEffect(() => {
    return soundManager.subscribe((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  return {
    ...settings,
    updateSettings: (partial: Partial<SoundSettings>) => soundManager.updateSettings(partial),
    toggleEnabled: () => soundManager.toggleEnabled(),
    setVolume: (vol: number) => soundManager.setVolume(vol),
    playSound: (soundType: UISoundType, options?: { volumeMultiplier?: number; force?: boolean }) =>
      soundManager.play(soundType, options),
  };
}

