/**
 * KEEP WALKING - Main Application Shell
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { GameProvider, useGamePlayer } from './context/GameContext';
import { ThemeProvider } from './theme/ThemeContext';
import { BottomNav, NavTab } from './components/navigation/BottomNav';
import { CharacterScreen } from './screens/CharacterScreen';
import { ForgeScreen } from './screens/ForgeScreen';
import { SetupWizard } from './components/onboarding/SetupWizard';
import { IntroScreen } from './components/onboarding/IntroScreen';
import { LevelUpCelebration } from './components/forge/LevelUpCelebration';
import { useBackHandler } from './services/backButtonManager';
import {
  initNotificationChannels,
  reconcileNotifications,
  setupNotificationListeners,
  clearDeliveredForgeNotifications,
} from './services/notificationManager';
import { NotificationDeepLink } from './types';
import { Flame, Shield, ArrowLeft } from 'lucide-react';
import { SystemGuideSpotlight } from './components/forge/SystemGuideSpotlight';
import { SYSTEM_GUIDES, SystemGuideDef, SystemGuideDestination } from './components/forge/systemGuideConfig';

// Lazy loaded secondary screens for lightweight initial bundle execution
const WorkoutScreen = lazy(() => import('./screens/WorkoutScreen').then((m) => ({ default: m.WorkoutScreen })));
const JournalScreen = lazy(() => import('./screens/JournalScreen').then((m) => ({ default: m.JournalScreen })));
const ChronicleScreen = lazy(() => import('./screens/ChronicleScreen').then((m) => ({ default: m.ChronicleScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const BreathingScreen = lazy(() => import('./screens/BreathingScreen').then((m) => ({ default: m.BreathingScreen })));
const SystemGuidesScreen = lazy(() => import('./screens/SystemGuidesScreen').then((m) => ({ default: m.SystemGuidesScreen })));

const ScreenFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-[#8E9299]">
    <Flame className="w-6 h-6 text-[#D4AF37] animate-pulse mb-2" />
    <span className="text-xs font-mono uppercase tracking-widest text-[#D4AF37]">Loading Forge Section...</span>
  </div>
);

const MainContent: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('forge');
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [activeSystemGuide, setActiveSystemGuide] = useState<SystemGuideDef | null>(null);

  // Sync active breathing state with current tab
  const isBreathingSession = activeTab === 'breathing' && isBreathingActive;
  const {
    isLoading,
    activeLevelUpReward,
    dismissLevelUpCelebration,
    player,
  } = useGamePlayer();

  // Listen for forge_start_system_guide custom event
  useEffect(() => {
    const handleStartGuide = (e: Event) => {
      const customEvent = e as CustomEvent<{ guideId: string }>;
      const guideId = customEvent.detail?.guideId;
      if (guideId) {
        const guide = SYSTEM_GUIDES.find((g) => g.id === guideId);
        if (guide) {
          setActiveSystemGuide(guide);
        }
      }
    };

    const handleSetRootTab = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: NavTab }>;
      if (customEvent.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      }
    };

    window.addEventListener('forge_start_system_guide', handleStartGuide);
    window.addEventListener('forge_set_root_tab', handleSetRootTab);
    return () => {
      window.removeEventListener('forge_start_system_guide', handleStartGuide);
      window.removeEventListener('forge_set_root_tab', handleSetRootTab);
    };
  }, []);

  const handleGuideNavigate = (dest: SystemGuideDestination) => {
    setActiveTab(dest.rootTab as NavTab);

    if (dest.rootTab === 'forge' && dest.subView) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: dest.subView } }));
      }, 50);
    }

    if (dest.subTab) {
      setTimeout(() => {
        if (dest.rootTab === 'workout') {
          window.dispatchEvent(new CustomEvent('workout_set_subtab', { detail: { subTab: dest.subTab } }));
        } else if (dest.rootTab === 'journal') {
          window.dispatchEvent(new CustomEvent('journal_set_subtab', { detail: { subTab: dest.subTab } }));
        } else if (dest.rootTab === 'chronicle') {
          window.dispatchEvent(new CustomEvent('chronicle_set_subtab', { detail: { subTab: dest.subTab } }));
        }
      }, 50);
    }
  };

  // Initialize notification channels and startup reconciliation
  useEffect(() => {
    initNotificationChannels().catch(() => {});
    reconcileNotifications().catch(() => {});
    clearDeliveredForgeNotifications().catch(() => {});

    // Set up deep-link navigation listeners
    const cleanupListeners = setupNotificationListeners((deepLink: NotificationDeepLink) => {
      if (deepLink === 'forge_execution') {
        setActiveTab('forge');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: 'execution' } }));
        }, 50);
      } else if (deepLink === 'forge_quests') {
        setActiveTab('forge');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: 'quests' } }));
        }, 50);
      } else if (deepLink === 'retention_today' || deepLink === 'retention_missed') {
        setActiveTab('home');
        setTimeout(() => {
          const el = document.getElementById('retention-journey-card');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    });

    return cleanupListeners;
  }, []);

  // Root Tab Level Android Back Navigation:
  // If user is on a secondary root tab (workout, journal, chronicle, profile) and presses Back,
  // navigate back to Forge hub (Priority 10). When already on Forge hub, lets Android handle default app exit.
  useBackHandler(
    'app-root-tab-navigation',
    10,
    () => {
      if (
        activeTab !== 'forge' &&
        activeTab !== 'breathing' &&
        activeTab !== 'settings' &&
        activeTab !== 'system-guides'
      ) {
        setActiveTab('forge');
        return true;
      }
      return false;
    },
    !showIntro &&
      Boolean(player) &&
      activeTab !== 'forge' &&
      activeTab !== 'breathing' &&
      activeTab !== 'settings' &&
      activeTab !== 'system-guides'
  );

  // 1. Splash Screen on fresh load / reload
  if (showIntro) {
    return (
      <IntroScreen
        hasProfile={Boolean(player && player.name)}
        player={player}
        isLoading={isLoading}
        onStart={() => {
          setShowIntro(false);
          if (player) {
            setActiveTab('forge');
          }
        }}
      />
    );
  }

  // 2. Loading state fallback if intro was dismissed during initialization
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--forge-bg,#050505)] flex flex-col items-center justify-center text-[var(--forge-text-primary,#E4E3E0)]">
        <Flame className="w-8 h-8 text-[var(--forge-text-accent,#D4AF37)] animate-pulse mb-3" />
        <h2 className="font-serif text-base tracking-[0.4em] uppercase text-[var(--forge-text-accent,#D4AF37)]">FORGE</h2>
        <p className="text-xs text-[var(--forge-text-muted,#8E9299)] mt-2 font-mono uppercase tracking-widest">Initializing Local Vault...</p>
      </div>
    );
  }

  // 3. If no player profile exists, display First-Time 3-Page Setup Wizard (Name -> Age -> Gender)
  if (!player) {
    return (
      <SetupWizard
        onComplete={() => {
          setActiveTab('forge');
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${isBreathingSession ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : ''} bg-[var(--forge-bg)] text-[var(--forge-text-primary)] flex flex-col max-w-md mx-auto sm:max-w-xl border-x border-[var(--forge-border)] relative shadow-2xl`}>

      {/* Header Bar */}
      <header className="sticky top-0 z-30 shrink-0 bg-[var(--forge-bg)]/95 border-b border-[var(--forge-border)] backdrop-blur-md px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-2">
        {activeTab === 'settings' ? (
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              aria-label="Back to Profile"
              title="Back to Profile"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-[var(--forge-surface-interactive)] hover:bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] text-[var(--forge-text-primary)] transition-all cursor-pointer select-none group"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--forge-text-accent)] group-hover:-translate-x-0.5 transition-transform shrink-0" />
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-[var(--forge-text-accent)]">
                Back
              </span>
            </button>

            {/* Desktop / Tablet Branding */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-serif font-bold text-xs tracking-[0.25em] text-[var(--forge-text-accent)] uppercase">
                FORGE
              </span>
              <span className="text-[var(--forge-text-muted)] text-xs font-mono">/</span>
              <span className="font-serif font-bold text-xs tracking-[0.2em] text-[var(--forge-text-primary)] uppercase">
                VAULT
              </span>
            </div>

            {/* Mobile Branding (stacked, zero collision) */}
            <div className="flex sm:hidden flex-col leading-tight">
              <span className="font-serif font-bold text-xs tracking-[0.2em] text-[var(--forge-text-accent)] uppercase">
                FORGE
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[var(--forge-text-muted)] uppercase">
                VAULT
              </span>
            </div>
          </div>
        ) : activeTab === 'system-guides' ? (
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Desktop / Tablet Branding */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-serif font-bold text-xs tracking-[0.25em] text-[var(--forge-text-accent)] uppercase">
                FORGE
              </span>
              <span className="text-[var(--forge-text-muted)] text-xs font-mono">/</span>
              <span className="font-serif font-bold text-xs tracking-[0.2em] text-[var(--forge-text-primary)] uppercase">
                GUIDES
              </span>
            </div>

            {/* Mobile Branding (stacked, zero collision) */}
            <div className="flex sm:hidden flex-col leading-tight">
              <span className="font-serif font-bold text-xs tracking-[0.2em] text-[var(--forge-text-accent)] uppercase">
                FORGE
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[var(--forge-text-muted)] uppercase">
                SYSTEM GUIDES
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-[var(--forge-border-accent)] bg-[var(--forge-primary-muted)] rounded-lg text-[var(--forge-text-accent)] shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xs tracking-[0.3em] text-[var(--forge-text-accent)] uppercase">
                FORGE
              </h1>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--forge-text-muted)] font-mono">Personal OS</p>
            </div>
          </div>
        )}

        {player && (
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-[var(--forge-surface)] border border-[var(--forge-border)] text-xs font-mono text-[var(--forge-text-accent)] shrink-0">
            <Shield className="w-3.5 h-3.5 text-[var(--forge-text-accent)] shrink-0" />
            <span className="font-bold">LVL {player.level}</span>
          </div>
        )}
      </header>

      {/* Screen Body */}
      <main className={`flex-1 px-4 sm:px-5 ${isBreathingSession ? 'pt-3 pb-3 overflow-hidden flex flex-col min-h-0' : 'pt-4 sm:pt-5 pb-28 sm:pb-32'}`}>
        <Suspense fallback={<ScreenFallback />}>
          {(activeTab === 'home' || activeTab === 'profile') && (
            <CharacterScreen
              onOpenSettings={() => setActiveTab('settings')}
              onOpenSystemGuides={() => setActiveTab('system-guides')}
              onNavigateToQuests={() => {
                setActiveTab('forge');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: 'quests' } }));
                }, 50);
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: 'quests' } }));
                }, 150);
              }}
            />
          )}
          {activeTab === 'system-guides' && (
            <SystemGuidesScreen
              onBack={() => setActiveTab('home')}
              onSelectGuide={(guideId) => {
                const guide = SYSTEM_GUIDES.find((g) => g.id === guideId);
                if (guide) {
                  setActiveSystemGuide(guide);
                }
              }}
            />
          )}
          {activeTab === 'workout' && <WorkoutScreen />}
          {activeTab === 'forge' && (
            <ForgeScreen onLaunchBreathing={() => setActiveTab('breathing')} />
          )}
          {activeTab === 'journal' && <JournalScreen />}
          {activeTab === 'chronicle' && <ChronicleScreen />}
          {activeTab === 'breathing' && (
            <BreathingScreen
              onBack={() => setActiveTab('forge')}
              onSessionActiveChange={setIsBreathingActive}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen onBack={() => setActiveTab('home')} />
          )}
        </Suspense>
      </main>

      {/* Bottom Navigation */}
      {!isBreathingSession && (
        <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      )}

      {/* Epic Level Up Celebration */}
      {activeLevelUpReward && (
        <LevelUpCelebration
          newLevel={activeLevelUpReward.newLevel}
          onFinished={dismissLevelUpCelebration}
        />
      )}

      {/* Replayable System Guide Spotlight */}
      {activeSystemGuide && (
        <SystemGuideSpotlight
          guide={activeSystemGuide}
          onClose={() => {
            setActiveSystemGuide(null);
            // Tutorials must return to the System Guides menu on completion/skip
            setActiveTab('system-guides');
            window.dispatchEvent(new CustomEvent('forge_set_subview', { detail: { subView: 'home' } }));
          }}
          onNavigate={handleGuideNavigate}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <MainContent />
      </GameProvider>
    </ThemeProvider>
  );
}
export default App;
