import React from 'react';
import { motion } from 'motion/react';
import { Shield, Dumbbell, Swords, BookOpen, ScrollText } from 'lucide-react';
import { useGamePlayer } from '../../context/GameContext';
import { playUISound } from '../../services/soundManager';

export type NavTab = 'home' | 'workout' | 'forge' | 'journal' | 'chronicle' | 'settings' | 'breathing' | 'profile' | 'system-guides';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  id?: string;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({ activeTab, onTabChange, id }) => {
  const { player } = useGamePlayer();

  const isHomeActive = activeTab === 'home' || activeTab === 'profile' || activeTab === 'system-guides';
  const isForgeActive = activeTab === 'forge';

  const handleTabClick = (tabId: NavTab) => {
    playUISound('tap');
    onTabChange(tabId);
    if (tabId === 'forge') {
      window.dispatchEvent(
        new CustomEvent('forge_set_subview', { detail: { subView: 'home' } })
      );
    }
  };

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; isCenter?: boolean }[] = [
    {
      id: 'forge',
      label: 'Forge',
      icon: <Swords className="w-5 h-5" />,
    },
    {
      id: 'workout',
      label: 'Workout',
      icon: <Dumbbell className="w-5 h-5" />,
    },
    {
      id: 'home',
      label: 'Home',
      icon: <Shield className="w-5 h-5" />,
      isCenter: true,
    },
    {
      id: 'journal',
      label: 'Journal',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: 'chronicle',
      label: 'Chronicle',
      icon: <ScrollText className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      id={id || 'bottom-navigation'}
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--forge-surface)]/95 border-t border-[var(--forge-border)] backdrop-blur-xl px-2.5 py-2 max-w-md mx-auto sm:max-w-xl sm:rounded-t-3xl shadow-lg"
    >
      <div className="grid grid-cols-5 items-center justify-items-center relative">
        {tabs.map((tab) => {
          if (tab.isCenter) {
            const isCenterActive =
              tab.id === 'home'
                ? isHomeActive
                : tab.id === 'forge'
                ? isForgeActive
                : activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className="relative flex flex-col items-center justify-center -mt-6 cursor-pointer z-20 group select-none"
              >
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  animate={{
                    scale: isCenterActive ? 1.06 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className={`relative w-13 h-13 rounded-2xl p-0.5 transition-all duration-200 flex items-center justify-center shadow-md ${
                    isCenterActive
                      ? 'bg-gradient-to-tr from-[var(--forge-primary)] to-amber-300 ring-2 ring-[var(--forge-border-accent)]'
                      : 'bg-gradient-to-b from-[var(--forge-surface-elevated)] to-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
                  }`}
                >
                  <div
                    className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center ${
                      isCenterActive
                        ? 'bg-[var(--forge-surface-elevated)] text-[var(--forge-text-accent)]'
                        : 'bg-[var(--forge-surface-elevated)] text-[var(--forge-text-secondary)] group-hover:text-[var(--forge-text-primary)]'
                    }`}
                  >
                    {tab.icon}
                  </div>
                </motion.div>
                <span
                  className={`text-[11px] font-mono tracking-wider mt-1 transition-colors ${
                    isCenterActive ? 'text-[var(--forge-text-accent)] font-bold' : 'text-[var(--forge-text-secondary)] group-hover:text-[var(--forge-text-primary)]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          const isActive =
            tab.id === 'home'
              ? isHomeActive
              : tab.id === 'forge'
              ? isForgeActive
              : activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 w-full cursor-pointer group select-none"
            >
              <div
                className={`px-3.5 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'text-[var(--forge-text-accent)] bg-[var(--forge-primary-muted)] shadow-xs'
                    : 'text-[var(--forge-text-secondary)] group-hover:text-[var(--forge-text-primary)] group-hover:bg-[var(--forge-surface-interactive)]'
                }`}
              >
                {tab.icon}
              </div>
              <span
                className={`text-[10px] font-mono tracking-wider mt-1 transition-colors ${
                  isActive
                    ? 'text-[var(--forge-text-accent)] font-bold'
                    : 'text-[var(--forge-text-secondary)] group-hover:text-[var(--forge-text-primary)]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
