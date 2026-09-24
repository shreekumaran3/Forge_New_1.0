import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  Compass,
  Trophy,
  BookOpen,
  Shield,
  Palette,
  Cpu,
  GraduationCap,
  Footprints,
  Sparkles,
  Award,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { ChronicleItem } from '../../types';
import { db } from '../../db/database';
import { Card } from '../ui/Card';
import { CategoryGrid, CategoryGridItem } from '../ui/CategoryGrid';

interface TimelineTabProps {
  chronicleItems: ChronicleItem[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ chronicleItems, onLoadMore, hasMore }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Add Event Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCategory, setNewCategory] = useState<ChronicleItem['category']>('landmark');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newLesson, setNewLesson] = useState('');

  // Extract unique years from items
  const years = Array.from(
    new Set(
      chronicleItems
        .map((item) => {
          try {
            return new Date(item.date).getFullYear().toString();
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => Number(b) - Number(a));

  // Category Icon Map
  const getCategoryIcon = (category: string, iconName?: string) => {
    switch (category) {
      case 'chapter':
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      case 'skill_mastery':
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'reflection':
        return <Lightbulb className="w-4 h-4 text-purple-400" />;
      case 'capsule':
        return <Calendar className="w-4 h-4 text-rose-400" />;
      case 'milestone':
        return <Award className="w-4 h-4 text-emerald-400" />;
      default:
        return <Trophy className="w-4 h-4 text-[#D4AF37]" />;
    }
  };

  // Filter items
  const filteredItems = chronicleItems.filter((item) => {
    // Search query filter
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    // Year filter
    let matchesYear = true;
    if (selectedYear !== 'all') {
      try {
        matchesYear = new Date(item.date).getFullYear().toString() === selectedYear;
      } catch (e) {
        matchesYear = false;
      }
    }

    // Category filter
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesYear && matchesCategory;
  });

  // Handle Add Event
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const tagsArr = newTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await db.chronicle.add({
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      details: newDetails.trim() || undefined,
      category: newCategory,
      date: todayStr,
      icon: 'Trophy',
      tags: tagsArr.length > 0 ? tagsArr : undefined,
      lessonLearned: newLesson.trim() || undefined,
    });

    // If lesson learned provided, save principle
    if (newLesson.trim()) {
      await db.principles.add({
        text: newLesson.trim(),
        statement: newLesson.trim(),
        category: 'action',
        context: `Extracted from Chronicle event: ${newTitle.trim()}`,
        createdAt: todayStr,
      });
    }

    setNewTitle('');
    setNewSubtitle('');
    setNewDetails('');
    setNewTagsStr('');
    setNewLesson('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="p-4 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--forge-text-muted)] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline events, tags, projects..."
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] text-[var(--forge-text-primary)] text-xs rounded-xl pl-9 pr-8 min-h-[40px] py-2 outline-none placeholder:text-[var(--forge-text-muted)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Life Event Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Life Event</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-muted)] shrink-0 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[var(--forge-text-accent)]" /> Year:
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear('all')}
              className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                selectedYear === 'all'
                  ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] border-[var(--forge-border-accent)]'
                  : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border-[var(--forge-border)]'
              }`}
            >
              All Years
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  selectedYear === y
                    ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] border-[var(--forge-border-accent)]'
                    : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border-[var(--forge-border)]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="w-full pt-2 border-t border-[var(--forge-border)]">
            <CategoryGrid variant="compact" cols={6}>
              {['all', 'landmark', 'milestone', 'chapter', 'reflection', 'capsule'].map((cat) => (
                <CategoryGridItem
                  key={cat}
                  id={cat}
                  label={cat}
                  isActive={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                />
              ))}
            </CategoryGrid>
          </div>
        </div>
      </div>

      {/* Timeline Event Feed */}
      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center space-y-2 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl">
          <Compass className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--forge-text-primary)]">No memories have been recorded.</h3>
          <p className="text-xs text-[var(--forge-text-secondary)]">
            {chronicleItems.length === 0
              ? 'Begin your journey by completing quests or recording life milestones.'
              : 'Try adjusting your search filters or add a new life event.'}
          </p>
        </Card>
      ) : (
        <div className="relative pl-6 space-y-4 border-l border-[var(--forge-border)] ml-3">
          {filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const iconComp = getCategoryIcon(item.category, item.icon);

            return (
              <div key={item.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-3.5 w-3.5 h-3.5 rounded-full bg-[var(--forge-surface)] border-2 border-[var(--forge-border-accent)] flex items-center justify-center shadow-xs" />

                <Card className="p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] rounded-2xl transition-all space-y-2">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] shrink-0 mt-0.5">
                        {iconComp}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)]">
                            {item.category.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-[var(--forge-text-secondary)] font-mono">{item.date}</span>
                        </div>

                        <h3 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)] mt-1">
                          {item.title}
                        </h3>

                        {item.subtitle && (
                          <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {(item.details || item.lessonLearned || (item.tags && item.tags.length > 0)) && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id!)}
                        className="p-2 rounded-xl bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Lesson Learned highlight callout */}
                  {item.lessonLearned && (
                    <div className="mt-2 p-3 bg-[var(--forge-surface-interactive)] border-l-2 border-[var(--forge-border-accent)] rounded-r-xl text-xs text-[var(--forge-text-accent)] italic">
                      &quot;{item.lessonLearned}&quot;
                    </div>
                  )}

                  {/* Expandable Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-[var(--forge-border)] space-y-2 text-xs text-[var(--forge-text-secondary)]"
                      >
                        {item.details && <p className="leading-relaxed text-[var(--forge-text-primary)]">{item.details}</p>}

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <Tag className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                            {item.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-mono bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] px-2 py-0.5 rounded-md"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            className="min-h-[40px] px-5 py-2.5 bg-[var(--forge-surface)] hover:bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl text-xs font-bold text-[var(--forge-text-accent)] hover:text-[var(--forge-text-primary)] uppercase tracking-wider transition-colors cursor-pointer"
          >
            Load Older History
          </button>
        </div>
      )}

      {/* ADD LIFE EVENT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-left"
            >
              <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
                <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)]">Record Life Event</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Summit of Mount Kinabalu / Graduated University"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none capitalize"
                  >
                    <option value="landmark">Landmark</option>
                    <option value="milestone">Milestone</option>
                    <option value="achievement">Achievement</option>
                    <option value="skill_mastery">Skill Mastery</option>
                    <option value="reflection">Reflection</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Subtitle / Context
                  </label>
                  <input
                    type="text"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    placeholder="e.g., Physical endurance test under challenging weather"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Detailed Memory / Story
                  </label>
                  <textarea
                    rows={3}
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    placeholder="Describe what occurred, how you felt, and why it matters..."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Lesson Learned (Auto-saved to Principles)
                  </label>
                  <input
                    type="text"
                    value={newLesson}
                    onChange={(e) => setNewLesson(e.target.value)}
                    placeholder="e.g., Consistency beats motivation every single time."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-accent)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={newTagsStr}
                    onChange={(e) => setNewTagsStr(e.target.value)}
                    placeholder="Trek, Physical, Milestone, 2026"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="min-h-[40px] py-2 px-4 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] rounded-2xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-[40px] py-2 px-4 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] rounded-2xl text-xs font-bold border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save Event</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
