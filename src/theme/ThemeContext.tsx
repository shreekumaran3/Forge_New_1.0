import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  mode: ThemeMode;
  name: string;
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceElevated: string;
  surfaceInteractive: string;
  surfaceSubtle: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  
  // Main Colour Tokens
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryGlow: string;
  
  // Accent Colour Tokens
  accent: string;
  accentLight: string;
  accentDark: string;
  accentMuted: string;
  accentGlow: string;
  
  // Secondary Mapping
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryMuted: string;
  secondaryGlow: string;
  
  surfaceOlive: string;
  surfaceAccentWarm: string;
  success: string;
  warning: string;
  error: string;

  textAccent: string;
  textContrastAccent: string;
  borderPrimary: string;
  borderAccent: string;
  borderSecondary: string;
  
  buttonBg: string;
  buttonText: string;
  buttonAccent: string;
  buttonAccentText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  
  navActive: string;
  navActiveGlow: string;
  navSecondary: string;
  navInactive: string;
  
  progressTrack: string;
  progressPrimary: string;
  progressSecondary: string;
  
  scrollbar: string;
  selection: string;
  focus: string;
  shadow: string;
}

// DARK MODE = BASALT MINIMAL (Preserved tactical architectural dark palette)
export const BASALT_MINIMAL: ThemeTokens = {
  mode: 'dark',
  name: 'Basalt Minimal',
  bg: '#050505',
  bgElevated: '#0A0A0C',
  surface: '#111114',
  surfaceElevated: '#17171B',
  surfaceInteractive: '#202026',
  surfaceSubtle: '#09090C',
  border: '#2C2C34',
  borderStrong: '#3B3B46',
  textPrimary: '#FAFAFA',
  textSecondary: '#D4D4D8',
  textMuted: '#71717A',
  textDisabled: '#3F3F46',
  primary: '#D4D4D8',
  primaryLight: '#F4F4F5',
  primaryDark: '#71717A',
  primaryMuted: 'rgba(212, 212, 216, 0.16)',
  primaryGlow: 'rgba(212, 212, 216, 0.35)',
  accent: '#CA8A04',
  accentLight: '#EAB308',
  accentDark: '#854D0E',
  accentMuted: 'rgba(202, 138, 4, 0.18)',
  accentGlow: 'rgba(202, 138, 4, 0.35)',
  secondary: '#CA8A04',
  secondaryLight: '#EAB308',
  secondaryDark: '#854D0E',
  secondaryMuted: 'rgba(202, 138, 4, 0.18)',
  secondaryGlow: 'rgba(202, 138, 4, 0.35)',
  surfaceOlive: 'rgba(102, 112, 85, 0.15)',
  surfaceAccentWarm: 'rgba(202, 138, 4, 0.12)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  textAccent: '#F4F4F5',
  textContrastAccent: '#EAB308',
  borderPrimary: 'rgba(212, 212, 216, 0.45)',
  borderAccent: 'rgba(202, 138, 4, 0.45)',
  borderSecondary: 'rgba(202, 138, 4, 0.45)',
  buttonBg: '#D4D4D8',
  buttonText: '#050505',
  buttonAccent: '#CA8A04',
  buttonAccentText: '#050505',
  buttonSecondary: '#202026',
  buttonSecondaryText: '#FAFAFA',
  navActive: '#F4F4F5',
  navActiveGlow: 'rgba(212, 212, 216, 0.4)',
  navSecondary: '#CA8A04',
  navInactive: '#71717A',
  progressTrack: '#2C2C34',
  progressPrimary: '#D4D4D8',
  progressSecondary: '#CA8A04',
  scrollbar: '#202026',
  selection: 'rgba(212, 212, 216, 0.3)',
  focus: '#F4F4F5',
  shadow: 'rgba(212, 212, 216, 0.25)',
};

// LIGHT MODE = SAND / SOFT CONTRAST (Warm ivory, soft beige, light stone, muted olive & bronze)
export const SAND: ThemeTokens = {
  mode: 'light',
  name: 'Sand',
  bg: '#E8E5DE',
  bgElevated: '#DDD9D0',
  surface: '#F0EDE6',
  surfaceElevated: '#F5F2EB',
  surfaceInteractive: '#DDD9D0',
  surfaceSubtle: '#DDD9D0',
  border: '#BEB6A6',
  borderStrong: '#9E9482',
  textPrimary: '#202522',
  textSecondary: '#56605D',
  textMuted: '#737A76',
  textDisabled: '#9B9F9A',
  primary: '#A97835', // Bronze / Primary Accent
  primaryLight: '#C4904C',
  primaryDark: '#765522', // Dark Bronze
  primaryMuted: 'rgba(169, 120, 53, 0.12)',
  primaryGlow: 'rgba(169, 120, 53, 0.18)',
  accent: '#A97835',
  accentLight: '#C4904C',
  accentDark: '#765522',
  accentMuted: 'rgba(169, 120, 53, 0.12)',
  accentGlow: 'rgba(169, 120, 53, 0.18)',
  secondary: '#667055', // Olive
  secondaryLight: '#7A8667',
  secondaryDark: '#4E5A42', // Dark Olive
  secondaryMuted: 'rgba(102, 112, 85, 0.14)',
  secondaryGlow: 'rgba(102, 112, 85, 0.20)',
  surfaceOlive: '#D9DED0',
  surfaceAccentWarm: '#E7DCC9',
  success: '#657652',
  warning: '#A97835',
  error: '#9A554D',
  textAccent: '#A97835',
  textContrastAccent: '#765522',
  borderPrimary: 'rgba(169, 120, 53, 0.35)',
  borderAccent: 'rgba(169, 120, 53, 0.35)',
  borderSecondary: 'rgba(102, 112, 85, 0.35)',
  buttonBg: '#4E5A42', // Dark Olive primary button
  buttonText: '#F5F2EB',
  buttonAccent: '#A97835',
  buttonAccentText: '#F5F2EB',
  buttonSecondary: '#DDD9D0',
  buttonSecondaryText: '#202522',
  navActive: '#202522',
  navActiveGlow: 'rgba(169, 120, 53, 0.2)',
  navSecondary: '#667055',
  navInactive: '#737A76',
  progressTrack: '#DDD9D0',
  progressPrimary: '#A97835',
  progressSecondary: '#667055',
  scrollbar: '#C8C2B6',
  selection: 'rgba(169, 120, 53, 0.2)',
  focus: '#A97835',
  shadow: 'rgba(32, 37, 34, 0.05)',
};

export const PORCELAIN = SAND;

export interface ThemeContextType {
  currentMode: ThemeMode;
  currentTheme: ThemeTokens;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

const STORAGE_KEY = 'forge_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      // Migration from old forge_theme_id
      const oldTheme = localStorage.getItem('forge_theme_id');
      if (oldTheme) {
        localStorage.removeItem('forge_theme_id');
        if (oldTheme === 'basalt_minimal') {
          return 'dark';
        }
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  const currentTheme = currentMode === 'light' ? PORCELAIN : BASALT_MINIMAL;

  useEffect(() => {
    const root = document.documentElement;
    if (currentMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    root.style.setProperty('--forge-bg', currentTheme.bg);
    root.style.setProperty('--forge-bg-elevated', currentTheme.bgElevated);
    root.style.setProperty('--forge-surface', currentTheme.surface);
    root.style.setProperty('--forge-surface-elevated', currentTheme.surfaceElevated);
    root.style.setProperty('--forge-surface-interactive', currentTheme.surfaceInteractive);
    root.style.setProperty('--forge-surface-subtle', currentTheme.surfaceSubtle);
    root.style.setProperty('--forge-surface-olive', currentTheme.surfaceOlive);
    root.style.setProperty('--forge-surface-accent-warm', currentTheme.surfaceAccentWarm);
    root.style.setProperty('--forge-border', currentTheme.border);
    root.style.setProperty('--forge-border-strong', currentTheme.borderStrong);
    root.style.setProperty('--forge-border-primary', currentTheme.borderPrimary);
    root.style.setProperty('--forge-border-accent', currentTheme.borderAccent);
    root.style.setProperty('--forge-border-secondary', currentTheme.borderSecondary);

    root.style.setProperty('--forge-text-primary', currentTheme.textPrimary);
    root.style.setProperty('--forge-text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--forge-text-muted', currentTheme.textMuted);
    root.style.setProperty('--forge-text-disabled', currentTheme.textDisabled);
    root.style.setProperty('--forge-text-accent', currentTheme.textAccent);
    root.style.setProperty('--forge-text-contrast-accent', currentTheme.textContrastAccent);

    // Semantic status variables
    root.style.setProperty('--forge-success', currentTheme.success);
    root.style.setProperty('--forge-warning', currentTheme.warning);
    root.style.setProperty('--forge-error', currentTheme.error);

    // Main Theme Variables
    root.style.setProperty('--forge-primary', currentTheme.primary);
    root.style.setProperty('--forge-primary-light', currentTheme.primaryLight);
    root.style.setProperty('--forge-primary-dark', currentTheme.primaryDark);
    root.style.setProperty('--forge-primary-soft', currentTheme.primaryMuted);
    root.style.setProperty('--forge-primary-muted', currentTheme.primaryMuted);
    root.style.setProperty('--forge-primary-glow', currentTheme.primaryGlow);

    // Contrasting Accent Theme Variables
    root.style.setProperty('--forge-accent', currentTheme.accent);
    root.style.setProperty('--forge-accent-light', currentTheme.accentLight);
    root.style.setProperty('--forge-accent-dark', currentTheme.accentDark);
    root.style.setProperty('--forge-accent-soft', currentTheme.accentMuted);
    root.style.setProperty('--forge-accent-muted', currentTheme.accentMuted);
    root.style.setProperty('--forge-accent-glow', currentTheme.accentGlow);

    // Backwards-compatible Secondary Variables
    root.style.setProperty('--forge-secondary', currentTheme.secondary);
    root.style.setProperty('--forge-secondary-light', currentTheme.secondaryLight);
    root.style.setProperty('--forge-secondary-dark', currentTheme.secondaryDark);
    root.style.setProperty('--forge-secondary-muted', currentTheme.secondaryMuted);
    root.style.setProperty('--forge-secondary-glow', currentTheme.secondaryGlow);

    root.style.setProperty('--forge-button-bg', currentTheme.buttonBg);
    root.style.setProperty('--forge-button-text', currentTheme.buttonText);
    root.style.setProperty('--forge-button-accent', currentTheme.buttonAccent);
    root.style.setProperty('--forge-button-accent-text', currentTheme.buttonAccentText);
    root.style.setProperty('--forge-button-secondary', currentTheme.buttonSecondary);
    root.style.setProperty('--forge-button-secondary-text', currentTheme.buttonSecondaryText);

    root.style.setProperty('--forge-nav-active', currentTheme.navActive);
    root.style.setProperty('--forge-nav-active-glow', currentTheme.navActiveGlow);
    root.style.setProperty('--forge-nav-secondary', currentTheme.navSecondary);
    root.style.setProperty('--forge-nav-inactive', currentTheme.navInactive);

    root.style.setProperty('--forge-progress-track', currentTheme.progressTrack);
    root.style.setProperty('--forge-progress-fill', currentTheme.progressPrimary);
    root.style.setProperty('--forge-progress-primary', currentTheme.progressPrimary);
    root.style.setProperty('--forge-progress-accent', currentTheme.progressSecondary);
    root.style.setProperty('--forge-progress-secondary', currentTheme.progressSecondary);

    root.style.setProperty('--forge-input-border', currentTheme.border);
    root.style.setProperty('--forge-focus-ring', currentTheme.focus);
    root.style.setProperty('--forge-scrollbar', currentTheme.scrollbar);
    root.style.setProperty('--forge-selection', currentTheme.selection);
    root.style.setProperty('--forge-focus', currentTheme.focus);
    root.style.setProperty('--forge-shadow', currentTheme.shadow);

    try {
      localStorage.setItem(STORAGE_KEY, currentMode);
    } catch {
      // Ignore storage errors
    }
  }, [currentMode, currentTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
  };

  const toggleThemeMode = () => {
    setCurrentMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ currentMode, currentTheme, setThemeMode, toggleThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
