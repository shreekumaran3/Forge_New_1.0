import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  User,
  TrendingUp,
  Award,
  Flame,
  ShieldAlert,
  Activity,
  Scroll,
  Quote,
  Swords,
  Sparkles,
  Compass,
  Network,
  Shield,
  CheckCircle2,
  Timer,
  Wind,
  Dumbbell,
  Heart,
  CheckSquare,
  Layers,
  BookOpen,
  Sun,
  Calendar,
  BookMarked,
  Target,
  Brain,
  Hourglass,
  FileText,
  Sliders,
  Palette,
  Volume2,
  Bell,
  HeartPulse,
  Download,
  Database,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Search,
  Zap,
} from 'lucide-react';
import {
  SYSTEM_GUIDES,
  SYSTEM_GUIDE_CATEGORIES,
  SystemGuideCategory,
  SystemGuideDef,
} from '../components/forge/systemGuideConfig';
import { BackButton } from '../components/ui/BackButton';
import { useBackHandler } from '../services/backButtonManager';
import { playUISound } from '../services/soundManager';

interface SystemGuidesScreenProps {
  onBack: () => void;
  onSelectGuide: (guideId: string) => void;
}

// Map each of the 37 guides to an appropriate Lucide icon
const GUIDE_ICONS: Record<string, React.ReactNode> = {
  // Character
  'profile-identity': <User className="w-4 h-4" />,
  'xp-progression': <TrendingUp className="w-4 h-4" />,
  'skill-points': <Award className="w-4 h-4" />,
  'discipline-streak': <Flame className="w-4 h-4" />,
  'retention-journey': <ShieldAlert className="w-4 h-4" />,
  'primary-attributes': <Activity className="w-4 h-4" />,
  'mirror-principles': <Scroll className="w-4 h-4" />,
  'life-motto': <Quote className="w-4 h-4" />,
  // Forge
  'quests': <Swords className="w-4 h-4" />,
  'todays-adaptation': <Sparkles className="w-4 h-4" />,
  'forge-path': <Compass className="w-4 h-4" />,
  'skill-tree': <Network className="w-4 h-4" />,
  'character-build': <Shield className="w-4 h-4" />,
  'progression-milestones': <CheckCircle2 className="w-4 h-4" />,
  'quest-execution': <Timer className="w-4 h-4" />,
  'guided-breathing': <Wind className="w-4 h-4" />,
  // Workout
  'workout-training': <Dumbbell className="w-4 h-4" />,
  'manual-health': <Heart className="w-4 h-4" />,
  'habits': <CheckSquare className="w-4 h-4" />,
  'routines': <Layers className="w-4 h-4" />,
  // Journal
  'journal-entries': <BookOpen className="w-4 h-4" />,
  'reflection-card': <Sun className="w-4 h-4" />,
  // Chronicle
  'chronicle-timeline': <Calendar className="w-4 h-4" />,
  'life-chapters': <BookMarked className="w-4 h-4" />,
  'milestones': <Target className="w-4 h-4" />,
  'chronicle-reflections': <Brain className="w-4 h-4" />,
  'lessons-learned': <Scroll className="w-4 h-4" />,
  'memory-capsules': <Hourglass className="w-4 h-4" />,
  'year-in-review': <FileText className="w-4 h-4" />,
  // Settings
  'settings-profile': <Sliders className="w-4 h-4" />,
  'settings-theme': <Palette className="w-4 h-4" />,
  'settings-audio': <Volume2 className="w-4 h-4" />,
  'settings-notifications': <Bell className="w-4 h-4" />,
  'settings-health-privacy': <HeartPulse className="w-4 h-4" />,
  'settings-backup': <Download className="w-4 h-4" />,
  'settings-pwa': <Database className="w-4 h-4" />,
  'settings-danger': <AlertTriangle className="w-4 h-4" />,
};

// Category metadata icons and descriptions
const CATEGORY_META: Record<
  SystemGuideCategory,
  { label: string; description: string; icon: React.ReactNode }
> = {
  character: {
    label: 'Character & Identity',
    description: 'Avatar, XP growth, skill points, discipline streaks, and principles.',
    icon: <User className="w-4 h-4" />,
  },
  forge: {
    label: 'Forge Systems & Quests',
    description: 'Adaptive quests, Forge Path, skill tree, breathing, and quest execution.',
    icon: <Swords className="w-4 h-4" />,
  },
  workout: {
    label: 'Physical Training & Health',
    description: 'Workouts, manual health metrics, habit tracking, and daily routines.',
    icon: <Dumbbell className="w-4 h-4" />,
  },
  journal: {
    label: 'Daily Journal & Reflections',
    description: 'Freeform daily entries, guided prompts, and evening reflection cards.',
    icon: <BookOpen className="w-4 h-4" />,
  },
  chronicle: {
    label: 'Life Chronicle & Milestones',
    description: 'Long-term timeline, life chapters, turning points, and memory capsules.',
    icon: <Calendar className="w-4 h-4" />,
  },
  settings: {
    label: 'Vault & System Settings',
    description: 'Profiles, dark themes, audio synthesis, backups, and privacy controls.',
    icon: <Sliders className="w-4 h-4" />,
  },
};

export const SystemGuidesScreen: React.FC<SystemGuidesScreenProps> = ({
  onBack,
  onSelectGuide,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Register Android back button (Priority 30) to return to Home
  useBackHandler(
    'system-guides-screen',
    30,
    () => {
      onBack();
      return true;
    },
    true
  );

  const isSearching = searchQuery.trim().length > 0;
  const q = searchQuery.toLowerCase().trim();

  // Group guides by category with search filtering
  const groupedCategories = useMemo(() => {
    return SYSTEM_GUIDE_CATEGORIES.map((cat) => {
      const categoryGuides = SYSTEM_GUIDES.filter((g) => g.category === cat.id);
      const matchingGuides = q
        ? categoryGuides.filter((g) => {
            const matchTitle = g.title.toLowerCase().includes(q);
            const matchShort = g.shortName.toLowerCase().includes(q);
            const matchDesc = g.description.toLowerCase().includes(q);
            const matchCat = g.categoryLabel.toLowerCase().includes(q);
            return matchTitle || matchShort || matchDesc || matchCat;
          })
        : categoryGuides;

      const meta = CATEGORY_META[cat.id];
      return {
        category: cat.id,
        label: meta.label,
        description: meta.description,
        icon: meta.icon,
        totalCount: categoryGuides.length,
        guides: matchingGuides,
      };
    }).filter((group) => {
      // When searching, hide categories that have no matching guides
      return isSearching ? group.guides.length > 0 : true;
    });
  }, [q, isSearching]);

  const toggleCategory = (categoryId: string) => {
    playUISound('tap');
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleGuideClick = (guideId: string) => {
    playUISound('tap');
    onSelectGuide(guideId);
  };

  return (
    <div id="system-guides-screen-root" className="space-y-5 pb-24 max-w-xl mx-auto">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <BackButton
          onClick={onBack}
          label="Home"
          sublabel="Character"
          id="system-guides-back-btn"
        />

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] font-mono text-xs font-bold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>37 System Guides</span>
        </div>
      </div>

      {/* Screen Header Banner */}
      <div className="forge-card p-4 sm:p-5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)]">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-[var(--forge-text-primary)]">
              System Guides
            </h1>
            <p className="text-xs text-[var(--forge-text-secondary)]">
              Replayable interactive walkthroughs for every system across Forge.
            </p>
          </div>
        </div>

        {/* Search Field */}
        <div className="pt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--forge-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="system-guides-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all 37 guides..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-primary)] placeholder-[var(--forge-text-muted)] focus:outline-none focus:border-[var(--forge-border-accent)] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Accordion Categories List */}
      {groupedCategories.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--forge-border)] rounded-2xl bg-[var(--forge-surface)]">
          <HelpCircle className="w-8 h-8 mx-auto text-[var(--forge-text-muted)] mb-2" />
          <p className="font-serif font-bold text-sm text-[var(--forge-text-primary)]">
            No guides match your search
          </p>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-1">
            Try clearing or modifying your search query.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedCategories.map((group) => {
            // When searching, auto-expand categories that contain matches; otherwise check expanded state
            const isExpanded = isSearching ? true : expandedCategories.has(group.category);

            return (
              <div
                key={group.category}
                className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)] overflow-hidden transition-all shadow-xs"
              >
                {/* Category Header Accordion Row */}
                <button
                  type="button"
                  id={`system-guide-category-${group.category}`}
                  onClick={() => toggleCategory(group.category)}
                  className="w-full text-left p-3.5 sm:p-4 hover:bg-[var(--forge-surface-interactive)] transition-colors cursor-pointer flex items-center justify-between gap-3 select-none group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {group.icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] group-hover:text-[var(--forge-text-accent)] transition-colors">
                          {group.label}
                        </h2>
                        <span className="forge-pill text-xs text-[var(--forge-text-secondary)] border-[var(--forge-border)] bg-[var(--forge-surface-interactive)] font-mono">
                          {group.guides.length} {group.guides.length === 1 ? 'guide' : 'guides'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed line-clamp-1 sm:line-clamp-none">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  {/* Expand / Collapse Indicator */}
                  <div className="w-8 h-8 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] group-hover:border-[var(--forge-border-accent)] text-[var(--forge-text-muted)] group-hover:text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 transition-colors">
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Category Tutorials List */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 pt-1 space-y-2 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30">
                    {group.guides.map((guide) => (
                      <button
                        key={guide.id}
                        type="button"
                        id={`system-guide-row-${guide.id}`}
                        onClick={() => handleGuideClick(guide.id)}
                        className="w-full text-left p-3 sm:p-3.5 rounded-xl bg-[var(--forge-surface)] hover:bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] transition-all cursor-pointer shadow-xs group flex items-center justify-between gap-3 select-none active:scale-[0.99]"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Guide Icon */}
                          <div className="w-8 h-8 rounded-lg bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            {GUIDE_ICONS[guide.id] || <HelpCircle className="w-4 h-4" />}
                          </div>

                          {/* Guide Details */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h3 className="font-serif text-sm font-bold text-[var(--forge-text-primary)] group-hover:text-[var(--forge-text-accent)] transition-colors truncate">
                              {guide.title}
                            </h3>
                            <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed line-clamp-2">
                              {guide.description}
                            </p>
                          </div>
                        </div>

                        {/* Right Action Chevron */}
                        <div className="w-7 h-7 rounded-lg bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] group-hover:border-[var(--forge-border-accent)] text-[var(--forge-text-muted)] group-hover:text-[var(--forge-text-accent)] flex items-center justify-center shrink-0 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
