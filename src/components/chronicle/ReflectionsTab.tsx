import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Plus, Filter, Tag, Search, Sparkles, X, Check, Heart, Shield, BookOpen } from 'lucide-react';
import { ChronicleItem } from '../../types';
import { db } from '../../db/database';
import { Card } from '../ui/Card';

interface ReflectionsTabProps {
  chronicleItems: ChronicleItem[];
}

export const ReflectionsTab: React.FC<ReflectionsTabProps> = ({ chronicleItems }) => {
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Reflection State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [extractedLesson, setExtractedLesson] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Growth']);

  const availableTags = [
    'Faith',
    'Relationships',
    'Family',
    'University',
    'Work',
    'Health',
    'Drawing',
    'Storytelling',
    'Adventure',
    'Gratitude',
    'Fear',
    'Failure',
    'Success',
    'Discipline',
    'Growth',
  ];

  // Filter reflection entries
  const reflectionItems = chronicleItems.filter(
    (item) => item.category === 'reflection' || item.lessonLearned
  );

  const filteredReflections = reflectionItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.details && item.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.lessonLearned && item.lessonLearned.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      selectedTag === 'all' || (item.tags && item.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];

    await db.chronicle.add({
      title: title.trim(),
      subtitle: `Reflection • ${selectedTags.join(', ')}`,
      category: 'reflection',
      date: todayStr,
      icon: 'Lightbulb',
      details: content.trim(),
      tags: selectedTags,
      lessonLearned: extractedLesson.trim() || undefined,
    });

    if (extractedLesson.trim()) {
      await db.principles.add({
        text: extractedLesson.trim(),
        statement: extractedLesson.trim(),
        category: selectedTags[0] || 'Growth',
        context: `Reflection: ${title.trim()}`,
        createdAt: todayStr,
      });
    }

    setTitle('');
    setContent('');
    setExtractedLesson('');
    setSelectedTags(['Growth']);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="p-3.5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--forge-text-secondary)] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections or wisdom lessons..."
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] text-[var(--forge-text-primary)] text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="min-h-[40px] px-4 py-2 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Write Reflection</span>
          </button>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-[var(--forge-text-secondary)] shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" /> Tag:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedTag === 'all'
                ? 'bg-[var(--forge-primary)] text-black border border-[var(--forge-border-accent)]'
                : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border border-[var(--forge-border)]'
            }`}
          >
            All Tags
          </button>
          {availableTags.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-[var(--forge-primary)]/15 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)]'
                  : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] border border-[var(--forge-border)]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Reflections Feed */}
      {filteredReflections.length === 0 ? (
        <Card className="p-8 text-center space-y-2 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl">
          <Lightbulb className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-60" />
          <h3 className="text-sm font-bold text-[var(--forge-text-primary)]">No Reflections Recorded Yet</h3>
          <p className="text-xs text-[var(--forge-text-secondary)]">
            Take a quiet moment to reflect on a major milestone, project, or month.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReflections.map((item) => (
            <Card key={item.id} className="p-4 sm:p-5 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl space-y-3 hover:border-[var(--forge-border-accent)] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[var(--forge-primary)]/10 border border-[var(--forge-border-accent)] text-[var(--forge-text-accent)]">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm sm:text-base font-bold text-[var(--forge-text-primary)]">{item.title}</h3>
                    <span className="text-xs text-[var(--forge-text-secondary)] font-mono">{item.date}</span>
                  </div>
                </div>
              </div>

              {item.details && (
                <p className="text-xs text-[var(--forge-text-primary)] leading-relaxed p-3.5 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl whitespace-pre-wrap">
                  {item.details}
                </p>
              )}

              {item.lessonLearned && (
                <div className="p-3 bg-[var(--forge-surface-interactive)] border-l-2 border-[var(--forge-border-accent)] rounded-r-xl text-xs text-[var(--forge-text-accent)]">
                  <span className="text-[10px] uppercase font-mono font-bold block text-[var(--forge-text-secondary)] mb-0.5">
                    LESSON LEARNED
                  </span>
                  &quot;{item.lessonLearned}&quot;
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
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
            </Card>
          ))}
        </div>
      )}

      {/* WRITE REFLECTION MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl text-left"
            >
              <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-3">
                <h3 className="font-serif text-base font-bold text-[var(--forge-text-primary)] flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[var(--forge-text-accent)]" />
                  Personal Reflection
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveReflection} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Reflection Title / Context *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Post-Project Reflection / End of Quarter Check-in"
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-accent)] block mb-1">
                    Prompt: &quot;What did this experience teach you?&quot; *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write freely about your thoughts, breakthroughs, failures, or growth..."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-primary)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-accent)] block mb-1">
                    Core Lesson Learned (Auto-saved to Lessons Learned collection)
                  </label>
                  <input
                    type="text"
                    value={extractedLesson}
                    onChange={(e) => setExtractedLesson(e.target.value)}
                    placeholder="e.g., Rest is part of discipline, not the absence of it."
                    className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border-accent)] rounded-xl px-3 py-2 text-xs text-[var(--forge-text-accent)] focus:border-[var(--forge-border-accent)] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--forge-text-secondary)] block mb-1">
                    Select Tags
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-2 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-xl custom-scrollbar">
                    {availableTags.map((t) => {
                      const isSel = selectedTags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTag(t)}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[var(--forge-primary)] text-black font-bold'
                              : 'bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)]'
                          }`}
                        >
                          #{t}
                        </button>
                      );
                    })}
                  </div>
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
                    <span>Save Reflection</span>
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
