import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BackButton } from '../components/ui/BackButton';
import { useBackHandler } from '../services/backButtonManager';
import {
  Download,
  Upload,
  RotateCcw,
  User,
  Smartphone,
  Shield,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Database,
  Palette,
  Loader2,
  FileCheck,
  Save,
  Clock,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Sparkles,
  Check,
  Layers,
  Bell,
  BellOff,
  Moon,
  Sun,
  Flame,
  Swords,
  ArrowLeft,
} from 'lucide-react';
import {
  createForgeBackup,
  saveBackupFile,
  parseAndValidateBackup,
  executeAtomicRestore,
  BackupValidationResult,
} from '../services/backupService';
import { useSoundSettings, playUISound, UISoundType } from '../services/soundManager';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getNotificationBudgetState,
  checkNotificationPermissions,
  requestNotificationPermissions,
  sendTestNotification,
  reconcileNotifications,
  MAX_NOTIFICATIONS_PER_DAY,
} from '../services/notificationManager';
import { ForgeNotificationSettings, NotificationBudgetState } from '../types';

interface SettingsScreenProps {
  onBack?: () => void;
}

function formatDate(isoString?: string): string {
  if (!isoString) return 'Never';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'Never';
  }
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { player, updatePlayer, resetApp } = useGame();
  const { currentMode, currentTheme, setThemeMode } = useTheme();
  const {
    enabled: soundEnabled,
    volume: soundVolume,
    toggleEnabled: toggleSound,
    setVolume: setSoundVolume,
    playSound,
  } = useSoundSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Form
  const [name, setName] = useState(player?.name || '');
  const [age, setAge] = useState(player?.age || 28);
  const [lifeClass, setLifeClass] = useState(player?.lifeClass || '');
  const [chapter, setChapter] = useState(player?.currentChapter || '');
  const [currentQuest, setCurrentQuest] = useState(player?.currentQuest || '');
  const [motto, setMotto] = useState(player?.lifeMotto || '');

  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Backup & Restore System State
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ts = localStorage.getItem('forge_last_backup_timestamp');
      if (ts) setLastBackupTime(ts);
    } catch (e) {
      // ignore
    }
  }, []);

  // Export Modal Flow States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStage, setExportStage] = useState<'idle' | 'exporting' | 'validating' | 'saving' | 'success' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedInfo, setExportedInfo] = useState<{
    filename: string;
    savedVia: string;
    recordCounts: Record<string, number>;
    totalRecords: number;
  } | null>(null);

  // Import Modal Flow States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importValidation, setImportValidation] = useState<BackupValidationResult | null>(null);
  const [importStage, setImportStage] = useState<'review' | 'restoring' | 'success' | 'error'>('review');
  const [importError, setImportError] = useState<string | null>(null);
  const [isSafetyBackupInProgress, setIsSafetyBackupInProgress] = useState(false);
  const [safetyBackupSuccess, setSafetyBackupSuccess] = useState(false);

  // Notification System State
  const [notifSettings, setNotifSettings] = useState<ForgeNotificationSettings>(getNotificationSettings());
  const [budgetState, setBudgetState] = useState<NotificationBudgetState>(getNotificationBudgetState());
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  useEffect(() => {
    checkNotificationPermissions().then(setNotifPermission);
    const handleSettingsChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setNotifSettings(custom.detail);
      }
    };
    window.addEventListener('forge_notification_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('forge_notification_settings_changed', handleSettingsChange);
  }, []);

  const handleToggleNotifMaster = () => {
    const updated = saveNotificationSettings({ enabled: !notifSettings.enabled });
    setNotifSettings(updated);
    playSound('tap');
    if (updated.enabled) {
      reconcileNotifications();
    }
  };

  const handleToggleNotifFeature = (key: keyof ForgeNotificationSettings) => {
    const updated = saveNotificationSettings({ [key]: !notifSettings[key] });
    setNotifSettings(updated);
    playSound('tap');
    reconcileNotifications();
  };

  const handleRequestNotifPermission = async () => {
    const granted = await requestNotificationPermissions();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      playSound('achievement');
      reconcileNotifications();
    } else {
      playSound('questAbandon');
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestingNotif(true);
    setTestResult(null);
    try {
      const res = await sendTestNotification();
      setTestResult(res);
      setBudgetState(getNotificationBudgetState());
      if (res.success) {
        playSound('questComplete');
      } else {
        playSound('questAbandon');
      }
    } catch {
      setTestResult({ success: false, message: 'Could not trigger test notification.' });
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePlayer({
      name,
      age: Number(age),
      lifeClass,
      currentChapter: chapter,
      currentQuest,
      lifeMotto: motto,
    });
    playSound('confirm');
    setImportMessage({ type: 'success', text: 'Character profile updated successfully.' });
  };

  // Execute Export Process
  const handleStartExport = async () => {
    setIsExportModalOpen(true);
    setExportStage('exporting');
    setExportError(null);

    try {
      await new Promise((r) => setTimeout(r, 250));
      setExportStage('validating');

      const { jsonString, filename, backupPackage } = await createForgeBackup();
      await new Promise((r) => setTimeout(r, 250));

      setExportStage('saving');
      const saveResult = await saveBackupFile(jsonString, filename);

      setExportedInfo({
        filename,
        savedVia: saveResult.savedVia,
        recordCounts: backupPackage.recordCounts,
        totalRecords: backupPackage.totalRecords,
      });
      setExportStage('success');

      const nowIso = new Date().toISOString();
      setLastBackupTime(nowIso);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError(err.message || 'Export failed.');
      setExportStage('error');
    }
  };

  // Handle File Selection for Import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseAndValidateBackup(text);
      setImportValidation(result);
      setImportStage('review');
      setImportError(null);
      setSafetyBackupSuccess(false);
      setIsImportModalOpen(true);
    } catch (err: any) {
      setImportValidation({
        isValid: false,
        error: 'Failed to read backup file.',
        formatVersion: 0,
        recordCounts: {},
        totalRecords: 0,
        data: {},
      });
      setImportStage('review');
      setIsImportModalOpen(true);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Create Safety Backup Before Restoring
  const handleSafetyBackup = async () => {
    setIsSafetyBackupInProgress(true);
    try {
      const { jsonString, filename } = await createForgeBackup();
      await saveBackupFile(jsonString, filename);
      setSafetyBackupSuccess(true);
      const nowIso = new Date().toISOString();
      setLastBackupTime(nowIso);
    } catch (err: any) {
      alert(`Safety backup note: ${err.message || 'Unable to save safety backup.'}`);
    } finally {
      setIsSafetyBackupInProgress(false);
    }
  };

  // Execute Atomic Import
  const handleConfirmImport = async () => {
    if (!importValidation || !importValidation.isValid) return;

    setImportStage('restoring');
    setImportError(null);

    try {
      await new Promise((r) => setTimeout(r, 300));
      const success = await executeAtomicRestore(importValidation.data);
      if (success) {
        setImportStage('success');
        const nowIso = new Date().toISOString();
        setLastBackupTime(nowIso);
      } else {
        setImportError('Atomic restore failed during transaction.');
        setImportStage('error');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(err.message || 'Failed to restore database from backup.');
      setImportStage('error');
    }
  };

  const handleReloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleConfirmReset = async () => {
    await resetApp();
    setIsResetModalOpen(false);
    setImportMessage({ type: 'success', text: 'Application state reset to factory defaults.' });
  };

  // Android Back button handler to return from Settings to Profile/Home (Priority 35)
  useBackHandler(
    'settings-screen',
    35,
    () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    },
    Boolean(onBack)
  );

  return (
    <div id="settings-screen" className="space-y-6 pb-32">
      {/* Header Area */}
      <div className="space-y-2.5">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wider uppercase text-[var(--forge-text-primary)] flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[var(--forge-text-accent)] shrink-0" />
            <span>Vault & Settings</span>
          </h1>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-1">
            Data sovereignty. Offline-first, no tracking, full user control.
          </p>
        </div>

        {onBack && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={onBack}
              id="settings-back-btn"
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-[var(--forge-surface-interactive)] hover:bg-[var(--forge-surface-elevated)] active:bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] text-[var(--forge-text-primary)] transition-all cursor-pointer group shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--forge-text-accent)] group-hover:-translate-x-0.5 transition-transform shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-serif font-bold uppercase tracking-wider text-[var(--forge-text-accent)]">
                  Profile
                </span>
                <span className="text-xs text-[var(--forge-text-muted)] font-mono uppercase">
                  / Vault
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {importMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            importMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{importMessage.text}</span>
        </div>
      )}

      {/* Character Profile Dossier Card */}
      <Card data-system-guide="settings-profile" className="space-y-4 rounded-xl p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
          <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--forge-text-accent)] shrink-0" />
            <span>Character Profile</span>
          </h2>
          <span className="text-xs font-mono text-[var(--forge-text-muted)] uppercase tracking-wider">
            Dossier
          </span>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="profile-name" className="block text-xs uppercase tracking-wider font-mono font-semibold text-[var(--forge-text-secondary)] mb-1.5">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-sm text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-disabled)] transition-all focus:outline-none focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-border-accent)]"
              />
            </div>
            <div>
              <label htmlFor="profile-age" className="block text-xs uppercase tracking-wider font-mono font-semibold text-[var(--forge-text-secondary)] mb-1.5">
                Age
              </label>
              <input
                id="profile-age"
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-sm text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-disabled)] transition-all focus:outline-none focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-border-accent)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-life-class" className="block text-xs uppercase tracking-wider font-mono font-semibold text-[var(--forge-text-secondary)] mb-1.5">
              Life Class
            </label>
            <input
              id="profile-life-class"
              type="text"
              value={lifeClass}
              onChange={(e) => setLifeClass(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-sm text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-disabled)] transition-all focus:outline-none focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-border-accent)]"
            />
          </div>

          <div>
            <label htmlFor="profile-chapter" className="block text-xs uppercase tracking-wider font-mono font-semibold text-[var(--forge-text-secondary)] mb-1.5">
              Current Life Chapter
            </label>
            <input
              id="profile-chapter"
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-sm text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-disabled)] transition-all focus:outline-none focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-border-accent)]"
            />
          </div>

          <div>
            <label htmlFor="profile-focus" className="block text-xs uppercase tracking-wider font-mono font-semibold text-[var(--forge-text-secondary)] mb-1.5">
              Current Primary Focus / Quest
            </label>
            <input
              id="profile-focus"
              type="text"
              value={currentQuest}
              onChange={(e) => setCurrentQuest(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-sm text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-disabled)] transition-all focus:outline-none focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-border-accent)]"
            />
          </div>

          <div>
            <label htmlFor="profile-motto" className="block text-xs uppercase tracking-wider font-mono font-semibold text-[var(--forge-text-secondary)] mb-1.5">
              Life Motto
            </label>
            <textarea
              id="profile-motto"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              rows={2}
              className="w-full p-3.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-sm text-[var(--forge-text-primary)] placeholder:text-[var(--forge-text-disabled)] transition-all focus:outline-none focus:border-[var(--forge-border-accent)] focus:ring-1 focus:ring-[var(--forge-border-accent)] resize-none leading-relaxed"
            />
          </div>

          <Button type="submit" variant="gold" size="md" className="w-full mt-2 min-h-[44px] rounded-lg font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            <span>Update Profile</span>
          </Button>
        </form>
      </Card>

      {/* Appearance & Visual Theme (Binary Dark / Light) */}
      <Card data-system-guide="settings-theme" className="space-y-4 rounded-xl p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs" id="settings-theme-selector">
        <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
          <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--forge-text-accent)]" />
            <span>Appearance</span>
          </h2>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--forge-text-secondary)]">
            {currentMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              setThemeMode('dark');
            }}
            className={`p-3.5 sm:p-4 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              currentMode === 'dark'
                ? 'bg-[var(--forge-surface-elevated)] border-[var(--forge-primary)] shadow-sm ring-1 ring-[var(--forge-primary)]'
                : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-primary)]">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-serif font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
                  Dark
                </span>
              </div>
            </div>
            {currentMode === 'dark' && (
              <Check className="w-4 h-4 text-[var(--forge-primary)] shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('tap');
              setThemeMode('light');
            }}
            className={`p-3.5 sm:p-4 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              currentMode === 'light'
                ? 'bg-[var(--forge-surface-elevated)] border-[var(--forge-primary)] shadow-sm ring-1 ring-[var(--forge-primary)]'
                : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-accent)]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-serif font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
                  Light
                </span>
              </div>
            </div>
            {currentMode === 'light' && (
              <Check className="w-4 h-4 text-[var(--forge-primary)] shrink-0" />
            )}
          </button>
        </div>
      </Card>

      {/* Audio & Sound Feedback System */}
      <Card data-system-guide="settings-audio" className="space-y-4 rounded-xl p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--forge-border)] pb-3">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[var(--forge-text-accent)]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[var(--forge-text-muted)]" />
              )}
              <span>Audio & Sound</span>
            </h2>
            <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
              Procedural Web Audio feedback engine. Low-latency local sound design.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const newState = toggleSound();
              if (newState) {
                playSound('confirm', { force: true });
              }
            }}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              soundEnabled
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-[var(--forge-surface-interactive)] border-[var(--forge-border)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)]'
            }`}
          >
            {soundEnabled ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ENABLED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--forge-text-muted)]" />
                <span>MUTED</span>
              </>
            )}
          </button>
        </div>

        {/* Master Volume Slider */}
        <div className={`space-y-2 p-3.5 rounded-lg border transition-all ${
          soundEnabled
            ? 'bg-[var(--forge-surface-elevated)] border-[var(--forge-border)]'
            : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-50 pointer-events-none'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-xs uppercase font-mono font-semibold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
              <Volume1 className="w-4 h-4 text-[var(--forge-text-accent)]" />
              Master Audio Volume
            </span>
            <span className="font-mono text-[var(--forge-text-accent)] font-bold text-xs">{soundVolume}%</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={soundVolume}
              onChange={(e) => setSoundVolume(Number(e.target.value))}
              onMouseUp={() => playSound('tap', { force: true })}
              onTouchEnd={() => playSound('tap', { force: true })}
              className="w-full h-2 bg-[var(--forge-surface-interactive)] rounded-lg appearance-none cursor-pointer accent-[var(--forge-accent)]"
            />
          </div>
        </div>

        {/* Sound Test Bench / Sound Library Preview */}
        <div className="space-y-2 pt-1">
          <span className="text-xs uppercase font-mono font-semibold text-[var(--forge-text-secondary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            Audio Language Preview
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { type: 'tap' as UISoundType, label: 'Navigation', desc: 'Tactile pop' },
              { type: 'uiBubble' as UISoundType, label: 'Micro Touch', desc: 'Gentle cue' },
              { type: 'confirm' as UISoundType, label: 'Confirm', desc: 'Save action' },
              { type: 'questComplete' as UISoundType, label: 'Quest Done', desc: 'Ascending chime' },
              { type: 'questReverse' as UISoundType, label: 'Quest Undo', desc: 'Descending tone' },
              { type: 'skillUnlock' as UISoundType, label: 'Skill Forge', desc: 'Energy shimmer' },
              { type: 'retentionConfirm' as UISoundType, label: 'Discipline', desc: 'Grounded chord' },
              { type: 'achievement' as UISoundType, label: 'Achievement', desc: 'Triumph sting' },
              { type: 'levelUp' as UISoundType, label: 'Level Up', desc: 'Fanfare' },
            ].map((snd) => (
              <button
                key={snd.type}
                type="button"
                onClick={() => playSound(snd.type, { force: true })}
                disabled={!soundEnabled}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer group flex flex-col justify-between ${
                  soundEnabled
                    ? 'bg-[var(--forge-surface-elevated)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] hover:bg-[var(--forge-surface-interactive)]'
                    : 'bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-serif font-bold text-[var(--forge-text-primary)] group-hover:text-[var(--forge-text-accent)] transition-colors">
                    {snd.label}
                  </span>
                  <Play className="w-3 h-3 text-[var(--forge-text-muted)] group-hover:text-[var(--forge-text-accent)] shrink-0" />
                </div>
                <span className="text-xs font-mono text-[var(--forge-text-muted)] leading-tight truncate">
                  {snd.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Forge Smart Notification & Quiet Hours Architecture */}
      <Card data-system-guide="settings-notifications" className="space-y-5 border border-[var(--forge-border)] bg-[var(--forge-surface)] rounded-xl p-4 sm:p-5 shadow-xs" id="settings-notifications-card">
        {/* Header with Master Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[var(--forge-border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
                {notifSettings.enabled ? (
                  <Bell className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-[var(--forge-text-muted)]" />
                )}
                <span>Notification Architecture</span>
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] font-bold">
                QUIET COMPANION
              </span>
            </div>
            <p className="text-xs text-[var(--forge-text-secondary)] mt-1 max-w-lg leading-relaxed">
              Local, privacy-first Android notifications. Forge stays silent until an active quest completes, a daily retention check-in approaches, or an action needs attention.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleNotifMaster}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto ${
              notifSettings.enabled
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-500 dark:text-amber-300 hover:bg-amber-900/40 shadow-xs'
                : 'bg-[var(--forge-surface-interactive)] border-[var(--forge-border)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)]'
            }`}
          >
            {notifSettings.enabled ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--forge-text-accent)] animate-pulse" />
                <span>ENABLED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--forge-text-muted)]" />
                <span>SILENCED</span>
              </>
            )}
          </button>
        </div>

        {/* Permission Banner if not granted */}
        {notifPermission !== 'granted' && (
          <div className="p-3 bg-amber-950/20 border border-amber-600/40 rounded-lg flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Permission required to deliver local Android notifications.</span>
            </div>
            <Button
              variant="gold"
              size="sm"
              onClick={handleRequestNotifPermission}
              className="text-xs shrink-0 font-mono py-1 px-2.5"
            >
              GRANT PERMISSION
            </Button>
          </div>
        )}

        {/* Strict 3/Day Daily Budget Gauge */}
        <div className="p-3.5 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
              <span className="text-xs uppercase font-bold tracking-wider text-[var(--forge-text-primary)]">
                Daily Rate Limit & Budget
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-[var(--forge-text-accent)]">
              {budgetState.sentCount} / {MAX_NOTIFICATIONS_PER_DAY} TODAY
            </span>
          </div>

          {/* Meter Bar */}
          <div className="h-1.5 w-full bg-[var(--forge-progress-track)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                budgetState.sentCount >= MAX_NOTIFICATIONS_PER_DAY
                  ? 'bg-red-500'
                  : 'bg-[var(--forge-text-accent)]'
              }`}
              style={{
                width: `${Math.min(100, (budgetState.sentCount / MAX_NOTIFICATIONS_PER_DAY) * 100)}%`,
              }}
            />
          </div>

          <p className="text-xs text-[var(--forge-text-secondary)] leading-snug font-mono">
            Strict cap of 3 notifications per calendar day. Typically delivers 0–2 notifications only when meaningful events occur.
          </p>
        </div>

        {/* Granular Feature Notification Toggles */}
        <div className="space-y-2.5">
          <h3 className="text-xs uppercase tracking-widest text-[var(--forge-text-secondary)] font-bold">
            Category Triggers
          </h3>

          {/* 1. Quest Completion */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] shrink-0 mt-0.5">
                <Swords className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--forge-text-primary)]">Quest Countdown Alerts</span>
                  <span className="text-xs font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 font-bold">
                    CRITICAL
                  </span>
                </div>
                <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
                  Completely silent during quests. Alerts only when active quest countdown timer completes.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!notifSettings.enabled}
              onClick={() => handleToggleNotifFeature('questReminders')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                notifSettings.questReminders && notifSettings.enabled
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                  : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-muted)] border border-[var(--forge-border)]'
              }`}
            >
              {notifSettings.questReminders && notifSettings.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 2. Retention Daily Check-in */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-emerald-950/30 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--forge-text-primary)]">Retention Discipline Reminder</span>
                  <span className="text-xs font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold">
                    HIGH (10 PM)
                  </span>
                </div>
                <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
                  10:00 PM check-in reminder & morning review for missed days. Automatically cancelled if confirmed beforehand.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!notifSettings.enabled}
              onClick={() => handleToggleNotifFeature('retentionReminders')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                notifSettings.retentionReminders && notifSettings.enabled
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                  : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-muted)] border border-[var(--forge-border)]'
              }`}
            >
              {notifSettings.retentionReminders && notifSettings.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 3. Inactivity Encouragement */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-md bg-purple-950/30 border border-purple-500/30 text-purple-500 dark:text-purple-400 shrink-0 mt-0.5">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--forge-text-primary)]">Inactivity Momentum Prompt</span>
                  <span className="text-xs font-mono uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                    LOW (3-DAY)
                  </span>
                </div>
                <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
                  Sent only after 3 consecutive days of zero completed quests with a 72-hour cooldown.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!notifSettings.enabled}
              onClick={() => handleToggleNotifFeature('inactivityReminders')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                notifSettings.inactivityReminders && notifSettings.enabled
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40'
                  : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-muted)] border border-[var(--forge-border)]'
              }`}
            >
              {notifSettings.inactivityReminders && notifSettings.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Quiet Hours & Night Mode Protection */}
        <div className="p-3.5 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--forge-text-primary)]">Quiet Hours Window</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                  {notifSettings.quietHoursStart} → {notifSettings.quietHoursEnd}
                </span>
              </div>
              <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5 leading-relaxed">
                Notifications are strictly silenced overnight (11:00 PM – 8:00 AM) to preserve focus and sleep discipline.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!notifSettings.enabled}
            onClick={() => handleToggleNotifFeature('quietHoursEnabled')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
              notifSettings.quietHoursEnabled && notifSettings.enabled
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40'
                : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-muted)] border border-[var(--forge-border)]'
            }`}
          >
            {notifSettings.quietHoursEnabled && notifSettings.enabled ? 'ENFORCED' : 'OFF'}
          </button>
        </div>

        {/* Diagnostic Testing Action */}
        <div className="pt-2 border-t border-[var(--forge-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[var(--forge-text-secondary)]">
            {testResult ? (
              <span className={testResult.success ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                {testResult.message}
              </span>
            ) : (
              <span>Verify Android channel and notification readiness.</span>
            )}
          </div>

          <Button
            type="button"
            variant="dark"
            size="sm"
            disabled={isTestingNotif || !notifSettings.enabled}
            onClick={handleSendTestNotification}
            className="text-xs font-mono py-1.5 px-3 flex items-center justify-center gap-1.5 border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]"
          >
            {isTestingNotif ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            )}
            <span>TEST NOTIFICATION</span>
          </Button>
        </div>
      </Card>

      {/* Physical Tracking & Local Privacy Integration */}
      <Card data-system-guide="settings-health" className="space-y-4 border border-[var(--forge-border)] bg-[var(--forge-surface)] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
            <span>Physical Health Tracking</span>
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 bg-[var(--forge-primary-muted)] border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] rounded-md">
            MANUAL ENTRY MODE
          </span>
        </div>

        <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed">
          Log steps, sleep, water, distance, and weight manually directly in The Forge. 100% offline and stored in local IndexedDB.
        </p>

        {/* Data Privacy Notice */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-xs text-emerald-600 dark:text-emerald-300 flex items-start gap-2">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider block">100% Local Storage Guarantee</span>
            <span>All health records, workouts, habits, and journals are stored exclusively on your device in IndexedDB. No cloud server or telemetry exists.</span>
          </div>
        </div>
      </Card>

      {/* Backup & Restore OVERHAUL 2.0 */}
      <Card data-system-guide="settings-backup" className="space-y-4 rounded-xl p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            <span>DATA & BACKUPS</span>
          </h2>

          {/* Last Backup Timestamp Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs font-mono text-[var(--forge-text-secondary)]">
            <Clock className="w-3 h-3 text-[var(--forge-text-accent)]" />
            <span>LAST BACKUP: <strong className="text-[var(--forge-text-primary)]">{formatDate(lastBackupTime || undefined)}</strong></span>
          </div>
        </div>

        <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed">
          Save a complete, native-safe backup of your Forge character profile, stats, quests, workouts, and vault entries, or restore from a previous backup file.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Button variant="gold" size="sm" onClick={handleStartExport} className="w-full flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            <span>EXPORT FORGE BACKUP</span>
          </Button>

          <Button
            variant="dark"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 text-[var(--forge-text-accent)]" />
            <span>IMPORT FORGE BACKUP</span>
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            className="hidden"
          />
        </div>
      </Card>

      {/* PWA & System Status */}
      <Card data-system-guide="settings-pwa" className="space-y-3 rounded-xl p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs">
        <h2 className="text-xs uppercase tracking-widest text-[var(--forge-text-accent)] font-bold flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5" />
          <span>Progressive Web App</span>
        </h2>

        <div className="p-3 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-xs space-y-1.5 text-[var(--forge-text-primary)]">
          <div className="flex justify-between items-center">
            <span className="text-[var(--forge-text-secondary)] text-xs uppercase tracking-wider font-bold">Offline Vault:</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold text-xs">IndexedDB Active</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--forge-text-secondary)] text-xs uppercase tracking-wider font-bold">Database Engine:</span>
            <span className="text-[var(--forge-text-primary)] font-mono text-xs">Dexie.js</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--forge-text-secondary)] text-xs uppercase tracking-wider font-bold">PWA Mode:</span>
            <span className="text-[var(--forge-text-accent)] font-mono text-xs">Mobile PWA Ready</span>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card data-system-guide="settings-danger" className="border-red-900/40 bg-[var(--forge-surface)] space-y-3 rounded-xl p-4 sm:p-5 shadow-xs">
        <h2 className="text-xs uppercase tracking-widest text-red-500 font-bold flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Danger Zone</span>
        </h2>

        <p className="text-xs text-[var(--forge-text-secondary)]">
          Resetting will clear all local character data, stats, and logs. This action cannot be undone.
        </p>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsResetModalOpen(true)}
          className="w-full"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Character Data</span>
        </Button>
      </Card>

      {/* Export Process & Confirmation Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => {
          if (exportStage === 'success' || exportStage === 'error') {
            setIsExportModalOpen(false);
          }
        }}
        title={
          exportStage === 'success'
            ? 'BACKUP COMPLETE ✓'
            : exportStage === 'error'
            ? 'EXPORT FAILED'
            : 'EXPORTING FORGE BACKUP'
        }
        subtitle={
          exportStage === 'success'
            ? 'Your Forge data has been safely exported'
            : exportStage === 'error'
            ? 'An error occurred during export'
            : 'Generating native-safe vault package'
        }
      >
        <div className="space-y-4 pt-2">
          {/* Progress State */}
          {exportStage !== 'success' && exportStage !== 'error' && (
            <div className="space-y-3 p-4 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg text-xs">
              <div className="flex items-center gap-3">
                {exportStage === 'exporting' ? (
                  <Loader2 className="w-4 h-4 text-[var(--forge-text-accent)] animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span className={exportStage === 'exporting' ? 'text-[var(--forge-text-primary)] font-bold' : 'text-[var(--forge-text-secondary)]'}>
                  1. Reading Dexie vault tables...
                </span>
              </div>

              <div className="flex items-center gap-3">
                {exportStage === 'validating' ? (
                  <Loader2 className="w-4 h-4 text-[var(--forge-text-accent)] animate-spin shrink-0" />
                ) : exportStage === 'saving' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[var(--forge-border)] shrink-0" />
                )}
                <span className={exportStage === 'validating' ? 'text-[var(--forge-text-primary)] font-bold' : 'text-[var(--forge-text-secondary)]'}>
                  2. Verifying backup integrity & schema...
                </span>
              </div>

              <div className="flex items-center gap-3">
                {exportStage === 'saving' ? (
                  <Loader2 className="w-4 h-4 text-[var(--forge-text-accent)] animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[var(--forge-border)] shrink-0" />
                )}
                <span className={exportStage === 'saving' ? 'text-[var(--forge-text-primary)] font-bold' : 'text-[var(--forge-text-secondary)]'}>
                  3. Saving backup file...
                </span>
              </div>
            </div>
          )}

          {/* Success Summary State */}
          {exportStage === 'success' && exportedInfo && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg text-xs text-emerald-600 dark:text-emerald-300 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-emerald-600 dark:text-emerald-400">Export Saved Successfully</span>
                  <p className="text-xs text-emerald-700 dark:text-emerald-200/80 mt-0.5">
                    Vault records serialized and validated cleanly.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">File Name:</span>
                  <span className="font-mono text-[var(--forge-text-accent)] text-xs font-bold">{exportedInfo.filename}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">Storage Method:</span>
                  <span className="font-mono text-[var(--forge-text-primary)] text-xs">{exportedInfo.savedVia}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[var(--forge-border)] pt-1.5">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">Total Vault Records:</span>
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 text-xs font-bold">{exportedInfo.totalRecords}</span>
                </div>
              </div>

              {/* Record Summary Breakdown Grid */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-[var(--forge-text-secondary)] block mb-2">
                  Vault Contents Summary
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] p-3 rounded-lg">
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Quests:</span>
                    <strong className="text-[var(--forge-text-primary)]">{exportedInfo.recordCounts.quests || 0}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Quest Logs:</span>
                    <strong className="text-[var(--forge-text-primary)]">{exportedInfo.recordCounts.questLogs || 0}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Workouts:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(exportedInfo.recordCounts.workoutTemplates || 0) + (exportedInfo.recordCounts.workoutLogs || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Chronicle:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(exportedInfo.recordCounts.chronicle || 0) + (exportedInfo.recordCounts.legacyMilestones || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Journal:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(exportedInfo.recordCounts.journalEntries || 0) + (exportedInfo.recordCounts.dailyReflections || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Skills & Builds:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(exportedInfo.recordCounts.skills || 0) + (exportedInfo.recordCounts.activeBuilds || 0)}
                    </strong>
                  </div>
                </div>
              </div>

              <Button variant="gold" size="sm" onClick={() => setIsExportModalOpen(false)} className="w-full">
                DONE
              </Button>
            </div>
          )}

          {/* Export Error State */}
          {exportStage === 'error' && (
            <div className="space-y-4">
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-red-400">Export Unsuccessful</span>
                  <p className="text-xs text-red-200/80 mt-0.5">{exportError}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsExportModalOpen(false)}>
                  Close
                </Button>
                <Button variant="gold" size="sm" onClick={handleStartExport}>
                  Retry Export
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Import Review & Confirmation Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (importStage !== 'restoring') {
            setIsImportModalOpen(false);
          }
        }}
        title={
          importStage === 'success'
            ? 'FORGE RESTORED ✓'
            : importValidation && !importValidation.isValid
            ? 'INVALID FORGE BACKUP'
            : 'IMPORT FORGE BACKUP?'
        }
        subtitle={
          importStage === 'success'
            ? 'Database successfully restored'
            : importValidation && !importValidation.isValid
            ? 'Validation check failed'
            : 'Review backup details before restoring'
        }
      >
        <div className="space-y-4 pt-2">
          {/* Invalid Backup File Warning */}
          {importValidation && !importValidation.isValid && (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-950/50 border border-red-900/60 rounded-lg text-xs text-red-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-400 text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Invalid or Unrecognized File Format</span>
                </div>
                <p className="text-xs leading-relaxed text-red-200/90">
                  {importValidation.error || 'The selected file does not match a valid Forge backup schema.'}
                </p>
              </div>

              <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)} className="w-full">
                CLOSE
              </Button>
            </div>
          )}

          {/* Valid Backup Review Screen */}
          {importValidation && importValidation.isValid && importStage === 'review' && (
            <div className="space-y-4">
              {/* High-Visibility Warning Box */}
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/50 rounded-lg text-xs text-amber-600 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>DESTRUCTIVE DATABASE REPLACEMENT</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-100/80">
                  Importing a backup will replace your current Forge data. Make sure to export a safety backup if you wish to keep your current state.
                </p>
              </div>

              {/* Backup Metadata Summary */}
              <div className="p-3 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">Backup Date:</span>
                  <span className="font-mono text-[var(--forge-text-accent)] text-xs font-bold">{formatDate(importValidation.exportedAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">Format Version:</span>
                  <span className="font-mono text-[var(--forge-text-primary)] text-xs">
                    v{importValidation.formatVersion} ({importValidation.isLegacy ? 'Legacy' : 'forge-backup'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">App & DB Engine:</span>
                  <span className="font-mono text-[var(--forge-text-primary)] text-xs">
                    v{importValidation.appVersion || '2.2.0'} (DB v{importValidation.databaseVersion || 10})
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-[var(--forge-border)] pt-1.5">
                  <span className="text-[var(--forge-text-secondary)] text-xs uppercase font-bold tracking-wider">Total Backup Records:</span>
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 text-xs font-bold">{importValidation.totalRecords}</span>
                </div>
              </div>

              {/* Record Summary breakdown */}
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-[var(--forge-text-secondary)] block mb-2">
                  Backup Contents Breakdown
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] p-3 rounded-lg">
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Quests:</span>
                    <strong className="text-[var(--forge-text-primary)]">{importValidation.recordCounts.quests || 0}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Quest Logs:</span>
                    <strong className="text-[var(--forge-text-primary)]">{importValidation.recordCounts.questLogs || 0}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Workouts:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(importValidation.recordCounts.workoutTemplates || 0) + (importValidation.recordCounts.workoutLogs || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Chronicle:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(importValidation.recordCounts.chronicle || 0) + (importValidation.recordCounts.legacyMilestones || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Journal:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(importValidation.recordCounts.journalEntries || 0) + (importValidation.recordCounts.dailyReflections || 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[var(--forge-text-secondary)]">
                    <span>Skills:</span>
                    <strong className="text-[var(--forge-text-primary)]">
                      {(importValidation.recordCounts.skills || 0) + (importValidation.recordCounts.activeBuilds || 0)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Safety Backup Banner if executed */}
              {safetyBackupSuccess && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/40 rounded-lg text-xs text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Safety backup saved cleanly before restore!</span>
                </div>
              )}

              {/* Action Options */}
              <div className="space-y-2 pt-2 border-t border-[var(--forge-border)]">
                <Button
                  variant="dark"
                  size="sm"
                  onClick={handleSafetyBackup}
                  disabled={isSafetyBackupInProgress}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isSafetyBackupInProgress ? (
                    <Loader2 className="w-3.5 h-3.5 text-[var(--forge-text-accent)] animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                  )}
                  <span>EXPORT SAFETY BACKUP FIRST</span>
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)}>
                    CANCEL
                  </Button>
                  <Button variant="gold" size="sm" onClick={handleConfirmImport}>
                    CONFIRM IMPORT
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Restoring In-Progress State */}
          {importStage === 'restoring' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-[var(--forge-text-accent)] animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-[var(--forge-text-primary)]">
                  Restoring Database...
                </h4>
                <p className="text-xs text-[var(--forge-text-secondary)]">
                  Clearing existing vault tables and writing backup records atomically...
                </p>
              </div>
            </div>
          )}

          {/* Import Success State */}
          {importStage === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-600 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-500 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>FORGE RESTORED SUCCESSFULLY</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-200/90 leading-relaxed">
                  Your character profile, stats, quest history, workouts, and vault entries have been successfully restored.
                </p>
              </div>

              <div className="p-3 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-lg text-xs space-y-1 text-[var(--forge-text-secondary)]">
                <p className="text-[var(--forge-text-primary)] font-bold">Page Reload Required:</p>
                <p>Click below to reload the application and reflect all restored vault records.</p>
              </div>

              <Button variant="gold" size="sm" onClick={handleReloadPage} className="w-full flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>RELOAD FORGE</span>
              </Button>
            </div>
          )}

          {/* Import Error State */}
          {importStage === 'error' && (
            <div className="space-y-4">
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-red-400">Restore Failed</span>
                  <p className="text-xs text-red-200/80 mt-0.5">{importError}</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)} className="w-full">
                CLOSE
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="RESET APPLICATION DATA"
        subtitle="Permanent local storage erasure."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              This will permanently erase your Forge profile, progress, journal, workouts, skills, quests and settings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--forge-border)]">
            <Button variant="ghost" size="sm" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmReset}>
              Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
