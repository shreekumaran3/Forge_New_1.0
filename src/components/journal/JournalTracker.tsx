import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { JournalEntry } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useGame } from '../../context/GameContext';
import { XP_CONFIG, ACTIVITY_ATTRIBUTE_MAP } from '../../services/xpService';
import { playUISound } from '../../services/soundManager';
import {
  BookOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

interface FormValues {
  type: 'daily' | 'reflection' | 'wins' | 'lessons' | 'freewrite';
  title: string;
  content: string;
  wentWell: string;
  feltHard: string;
  moodScore: number;
}

export const JournalTracker: React.FC = () => {
  const { player, awardActivityXp } = useGame();
  const [entriesLimit, setEntriesLimit] = useState(50);
  const [selectedType, setSelectedType] = useState<string>('all');

  const rawEntries = useLiveQuery(async () => {
    try {
      const items = await db.journalEntries.orderBy('createdAt').reverse().limit(entriesLimit).toArray();
      return items;
    } catch {
      try {
        const fallback = await db.journalEntries.reverse().limit(entriesLimit).toArray();
        return fallback.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      } catch {
        return [];
      }
    }
  }, [entriesLimit]) || [];
  const entries = rawEntries;
  const filteredEntries = selectedType === 'all' ? entries : entries.filter((e) => e.type === selectedType);

  const categoryTabs = [
    { id: 'all', label: 'All Entries' },
    { id: 'daily', label: 'Daily Reflection' },
    { id: 'wins', label: '3 Daily Wins' },
    { id: 'lessons', label: 'Key Lessons' },
    { id: 'reflection', label: 'Deep Reflection' },
    { id: 'freewrite', label: 'Freewrite' },
  ];

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isRedoMode, setIsRedoMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [type, setType] = useState<'daily' | 'reflection' | 'wins' | 'lessons' | 'freewrite'>('daily');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [feltHard, setFeltHard] = useState('');
  const [moodScore, setMoodScore] = useState<number>(4);

  // Baseline form values for unsaved changes dirty check
  const [initialFormState, setInitialFormState] = useState<FormValues | null>(null);

  // Action Menu State (tracks which card menu is open)
  const [activeMenuEntryId, setActiveMenuEntryId] = useState<number | null>(null);

  // Delete Confirmation State
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Discard Confirmation State
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // Feedback Banner State
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'danger' = 'success') => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedbackMessage({ text, type });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Compute current form mode
  const isCreateMode = editingEntry === null && !isRedoMode;
  const isEditMode = editingEntry !== null && !isRedoMode;

  // Check if form is dirty compared to when it opened
  const isFormDirty = (): boolean => {
    if (!initialFormState) return false;
    return (
      type !== initialFormState.type ||
      title.trim() !== initialFormState.title.trim() ||
      content.trim() !== initialFormState.content.trim() ||
      wentWell.trim() !== initialFormState.wentWell.trim() ||
      feltHard.trim() !== initialFormState.feltHard.trim() ||
      moodScore !== initialFormState.moodScore
    );
  };

  // Reset and close editor safely
  const resetAndCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingEntry(null);
    setIsRedoMode(false);
    setType('daily');
    setTitle('');
    setContent('');
    setWentWell('');
    setFeltHard('');
    setMoodScore(4);
    setInitialFormState(null);
    setIsSubmitting(false);
  };

  // Request to close editor (checks for dirty state)
  const handleRequestCloseEditor = () => {
    if (isFormDirty()) {
      setIsDiscardModalOpen(true);
    } else {
      resetAndCloseEditor();
    }
  };

  // Open Create Mode
  const handleOpenCreate = () => {
    setActiveMenuEntryId(null);
    setEditingEntry(null);
    setIsRedoMode(false);
    const initial: FormValues = {
      type: 'daily',
      title: '',
      content: '',
      wentWell: '',
      feltHard: '',
      moodScore: 4,
    };
    setType(initial.type);
    setTitle(initial.title);
    setContent(initial.content);
    setWentWell(initial.wentWell);
    setFeltHard(initial.feltHard);
    setMoodScore(initial.moodScore);
    setInitialFormState(initial);
    setIsEditorOpen(true);
    playParamSound('tap');
  };

  // Open Edit Mode
  const handleOpenEdit = (entry: JournalEntry) => {
    setActiveMenuEntryId(null);
    setEditingEntry(entry);
    setIsRedoMode(false);
    const initial: FormValues = {
      type: entry.type || 'daily',
      title: entry.title || '',
      content: entry.content || '',
      wentWell: entry.wentWell || '',
      feltHard: entry.feltHard || '',
      moodScore: entry.moodScore ?? 4,
    };
    setType(initial.type);
    setTitle(initial.title);
    setContent(initial.content);
    setWentWell(initial.wentWell);
    setFeltHard(initial.feltHard);
    setMoodScore(initial.moodScore);
    setInitialFormState(initial);
    setIsEditorOpen(true);
    playParamSound('tap');
  };

  // Open Redo Mode (Duplicate as new template)
  const handleOpenRedo = (entry: JournalEntry) => {
    setActiveMenuEntryId(null);
    setEditingEntry(entry);
    setIsRedoMode(true);
    const initial: FormValues = {
      type: entry.type || 'daily',
      title: entry.title || '',
      content: entry.content || '',
      wentWell: entry.wentWell || '',
      feltHard: entry.feltHard || '',
      moodScore: entry.moodScore ?? 4,
    };
    setType(initial.type);
    setTitle(initial.title);
    setContent(initial.content);
    setWentWell(initial.wentWell);
    setFeltHard(initial.feltHard);
    setMoodScore(initial.moodScore);
    setInitialFormState(initial);
    setIsEditorOpen(true);
    playParamSound('tap');
  };

  // Prompt Delete Confirmation Modal
  const handlePromptDelete = (entry: JournalEntry) => {
    setActiveMenuEntryId(null);
    setDeletingEntry(entry);
    setIsDeleteModalOpen(true);
    playParamSound('tap');
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!deletingEntry?.id) {
      setIsDeleteModalOpen(false);
      setDeletingEntry(null);
      return;
    }

    try {
      await db.journalEntries.delete(deletingEntry.id);
      playParamSound('questReverse');
      showFeedback('Journal entry deleted.', 'info');
    } catch (err) {
      console.error('Failed to delete journal entry:', err);
      showFeedback('Failed to delete journal entry.', 'danger');
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingEntry(null);
    }
  };

  // Save Entry Handler (handles EDIT, REDO, and CREATE)
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      // 1. EDIT MODE: Update existing record without awarding XP or modifying createdAt / Chronicle
      if (isEditMode && editingEntry) {
        if (typeof editingEntry.id !== 'number') {
          showFeedback('Unable to edit entry: missing record ID.', 'danger');
          resetAndCloseEditor();
          return;
        }

        const existingRecord = await db.journalEntries.get(editingEntry.id);
        if (!existingRecord) {
          showFeedback('Journal entry not found or was deleted elsewhere.', 'danger');
          resetAndCloseEditor();
          return;
        }

        await db.journalEntries.update(editingEntry.id, {
          type,
          title: title.trim() || undefined,
          content: content.trim(),
          wentWell: wentWell.trim() || undefined,
          feltHard: feltHard.trim() || undefined,
          moodScore,
          // Preserve any unexposed or existing fields
          ...(editingEntry.wins ? { wins: editingEntry.wins } : {}),
          ...(editingEntry.lessonLearned ? { lessonLearned: editingEntry.lessonLearned } : {}),
        });

        playParamSound('confirm');
        showFeedback('Journal entry updated.', 'success');
        resetAndCloseEditor();
        return;
      }

      // 2. CREATE MODE or REDO MODE: Create new record and award XP / Chronicle once
      const todayStr = new Date().toISOString().split('T')[0];

      await db.journalEntries.add({
        date: todayStr,
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        wentWell: wentWell.trim() || undefined,
        feltHard: feltHard.trim() || undefined,
        moodScore,
        createdAt: new Date().toISOString(),
        ...(isRedoMode && editingEntry?.wins ? { wins: editingEntry.wins } : {}),
        ...(isRedoMode && editingEntry?.lessonLearned ? { lessonLearned: editingEntry.lessonLearned } : {}),
      });

      if (player) {
        const xpEarned = XP_CONFIG.JOURNAL;
        
        await awardActivityXp({
          activityType: 'journal',
          generalXp: xpEarned,
          attributes: ACTIVITY_ATTRIBUTE_MAP.journal,
          title: title.trim() ? `Journal: ${title.trim()}` : `Journal Reflection`,
          subtitle: `Reflected on daily growth & lessons`,
          category: 'reflection',
        });

        await db.chronicle.add({
          title: title.trim() ? `Journal: ${title.trim()}` : `Journal Reflection Logged`,
          subtitle: `Reflected on daily growth and lessons.`,
          category: 'reflection',
          date: todayStr,
          icon: 'BookOpen',
          xpReward: xpEarned,
        });
      }

      playParamSound('success');
      showFeedback(
        isRedoMode
          ? 'New journal entry created from template (+20 XP).'
          : 'Journal entry recorded (+20 XP).',
        'success'
      );
      resetAndCloseEditor();
    } catch (err) {
      console.error('Failed to save journal entry:', err);
      showFeedback('Failed to save journal entry.', 'danger');
      setIsSubmitting(false);
    }
  };

  const playParamSound = (sound: 'tap' | 'uiBubble' | 'confirm' | 'success' | 'questReverse') => {
    try {
      playUISound(sound);
    } catch {
      // Audio fallback
    }
  };

  return (
    <div className="space-y-4" id="journal-tracker-root">
      {/* Header & Write Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-serif font-bold text-[var(--forge-text-primary)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--forge-text-accent)]" />
            Personal Journal & Reflections
          </h2>
          <p className="text-xs text-[var(--forge-text-secondary)] mt-0.5">
            Record daily reflections, wins, and lessons. Unclutter the mind.
          </p>
        </div>

        <button
          type="button"
          id="journal-write-entry-btn"
          onClick={handleOpenCreate}
          className="min-h-[44px] px-4 py-2.5 bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] font-sans font-bold text-xs rounded-2xl border border-[var(--forge-border-accent)] shadow-xs hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Write Entry</span>
        </button>
      </div>

      {/* Category Tabs ("Daily Reflection", "3 Daily Wins", etc.) */}
      <div data-system-guide="journal-category-tabs" className="flex items-center gap-2 overflow-x-auto touch-pan-x no-scrollbar pb-1 text-xs">
        {categoryTabs.map((tab) => {
          const isActive = selectedType === tab.id;
          const count = tab.id === 'all' ? entries.length : entries.filter((e) => e.type === tab.id).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playParamSound('tap');
                setSelectedType(tab.id);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-2xl text-xs font-sans font-semibold transition-all cursor-pointer shrink-0 border select-none flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[var(--forge-primary)] text-[var(--forge-button-text,#000)] border-[var(--forge-border-accent)] shadow-xs'
                  : 'bg-[var(--forge-surface)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)]'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-black/20 text-current'
                      : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-muted)]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          role="status"
          className={`px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 border transition-all ${
            feedbackMessage.type === 'danger'
              ? 'bg-rose-950/60 border-rose-800/60 text-rose-200'
              : feedbackMessage.type === 'info'
              ? 'bg-blue-950/60 border-blue-800/60 text-blue-200'
              : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] p-1 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Entries List or Empty State */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-[var(--forge-surface)] border-[var(--forge-border)] p-6 text-center space-y-2 rounded-2xl">
          <BookOpen className="w-8 h-8 text-[var(--forge-text-muted)] mx-auto opacity-50" />
          <h3 className="font-serif font-bold text-sm text-[var(--forge-text-primary)]">
            {entries.length === 0 ? 'Your story begins today.' : 'No entries match this filter.'}
          </h3>
          <p className="text-xs text-[var(--forge-text-secondary)] max-w-sm mx-auto">
            {entries.length === 0
              ? 'No journal entries logged yet. Click "Write Entry" to record your first reflection, win, or daily lesson.'
              : 'Try selecting "All Entries" or write a new entry in this category.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <Card
              key={entry.id ?? `entry-${entry.createdAt}`}
              id={`journal-card-${entry.id}`}
              className="bg-[var(--forge-surface)] border-[var(--forge-border)] hover:border-[var(--forge-border-accent)] rounded-2xl p-4 sm:p-5 transition-all space-y-3 relative group"
            >
              {/* Card Header: Type, Title, Date & Action Menu */}
              <div className="flex items-center justify-between border-b border-[var(--forge-border)] pb-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase text-[var(--forge-text-accent)] bg-[var(--forge-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--forge-border-accent)] shrink-0">
                    {entry.type}
                  </span>
                  <span className="text-xs sm:text-sm font-serif font-bold text-[var(--forge-text-primary)] truncate">
                    {entry.title || 'Daily Reflection'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-[var(--forge-text-muted)]">{entry.date}</span>

                  {/* Action Menu (⋯ button) */}
                  <div className="relative">
                    <button
                      type="button"
                      id={`journal-action-btn-${entry.id}`}
                      aria-label="Journal entry actions"
                      aria-haspopup="menu"
                      aria-expanded={activeMenuEntryId === entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        playParamSound('uiBubble');
                        setActiveMenuEntryId(activeMenuEntryId === entry.id ? null : (entry.id ?? null));
                      }}
                      className="min-w-[40px] min-h-[40px] -mr-1 -my-1 flex items-center justify-center text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] hover:bg-[var(--forge-surface-interactive)] rounded-xl transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Contextual Dropdown */}
                    {activeMenuEntryId === entry.id && (
                      <>
                        {/* Backdrop for outside-click dismiss */}
                        <div
                          className="fixed inset-0 z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuEntryId(null);
                          }}
                        />

                        <div
                          id={`journal-dropdown-menu-${entry.id}`}
                          role="menu"
                          aria-label="Journal entry actions"
                          className="absolute right-0 top-full mt-1 w-44 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-2xl shadow-xl py-1.5 z-40 backdrop-blur-md"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            id={`journal-edit-opt-${entry.id}`}
                            aria-label="Edit journal entry"
                            onClick={() => handleOpenEdit(entry)}
                            className="w-full px-3.5 py-2.5 text-xs text-[var(--forge-text-primary)] hover:text-[var(--forge-text-accent)] hover:bg-[var(--forge-surface-interactive)] flex items-center gap-2.5 text-left transition-colors cursor-pointer font-medium"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[var(--forge-text-accent)]" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            id={`journal-redo-opt-${entry.id}`}
                            aria-label="Redo journal entry"
                            onClick={() => handleOpenRedo(entry)}
                            className="w-full px-3.5 py-2.5 text-xs text-[var(--forge-text-primary)] hover:text-[var(--forge-text-accent)] hover:bg-[var(--forge-surface-interactive)] flex items-center gap-2.5 text-left transition-colors cursor-pointer font-medium"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Redo</span>
                          </button>

                          <div className="my-1 border-t border-[var(--forge-border)]" />

                          <button
                            type="button"
                            role="menuitem"
                            id={`journal-delete-opt-${entry.id}`}
                            aria-label="Delete journal entry"
                            onClick={() => handlePromptDelete(entry)}
                            className="w-full px-3.5 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2.5 text-left transition-colors cursor-pointer font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <p className="text-xs text-[var(--forge-text-secondary)] whitespace-pre-wrap leading-relaxed">{entry.content}</p>

              {(entry.wentWell || entry.feltHard) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {entry.wentWell && (
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-[11px] text-emerald-300">
                      <strong className="block text-[9px] uppercase font-bold text-emerald-400 mb-0.5">What Went Well:</strong>
                      {entry.wentWell}
                    </div>
                  )}
                  {entry.feltHard && (
                    <div className="p-2.5 bg-amber-950/20 border border-amber-900/30 rounded-xl text-[11px] text-amber-300">
                      <strong className="block text-[9px] uppercase font-bold text-amber-400 mb-0.5">Lesson / Challenge:</strong>
                      {entry.feltHard}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination / Load Older */}
      {filteredEntries.length >= entriesLimit && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEntriesLimit((prev) => prev + 50)}
            className="text-xs text-[var(--forge-text-accent)] hover:text-[var(--forge-text-primary)] border border-[var(--forge-border)] rounded-2xl min-h-[40px] px-4"
          >
            Load Older Entries
          </Button>
        </div>
      )}

      {/* REUSED JOURNAL ENTRY MODAL (CREATE, EDIT, REDO) */}
      <Modal
        isOpen={isEditorOpen}
        onClose={handleRequestCloseEditor}
        title={
          isEditMode
            ? 'EDIT JOURNAL ENTRY'
            : isRedoMode
            ? 'REDO JOURNAL ENTRY'
            : 'WRITE JOURNAL ENTRY'
        }
        subtitle={
          isEditMode
            ? 'Refine your reflection. Edits do not modify historical XP or Chronicle logs.'
            : isRedoMode
            ? 'Create a new entry using this reflection as a starting template.'
            : 'Quiet reflection builds mental clarity and self-awareness.'
        }
        id="journal-editor-modal"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Type</label>
              <select
                id="journal-form-type"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl px-3 py-2.5 text-xs text-[var(--forge-text-primary)] outline-none"
              >
                <option value="daily">Daily Reflection</option>
                <option value="wins">3 Daily Wins</option>
                <option value="lessons">Key Lesson Learned</option>
                <option value="reflection">Deep Reflection</option>
                <option value="freewrite">Freewrite</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Title (Optional)</label>
              <input
                id="journal-form-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quiet Progress & Clarity"
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl px-3 py-2.5 text-xs text-[var(--forge-text-primary)] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--forge-text-secondary)] uppercase block mb-1">Entry Content *</label>
            <textarea
              id="journal-form-content"
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What is on your mind today?"
              className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl p-3 text-xs text-[var(--forge-text-primary)] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">What Went Well?</label>
              <input
                id="journal-form-went-well"
                type="text"
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                placeholder="Victory or moment of pride..."
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl px-3 py-2.5 text-xs text-[var(--forge-text-primary)] outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-400 uppercase block mb-1">What Was Hard / Lesson?</label>
              <input
                id="journal-form-felt-hard"
                type="text"
                value={feltHard}
                onChange={(e) => setFeltHard(e.target.value)}
                placeholder="Obstacle encountered..."
                className="w-full bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl px-3 py-2.5 text-xs text-[var(--forge-text-primary)] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleRequestCloseEditor}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              type="submit"
              id="journal-form-submit-btn"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting
                ? 'Saving...'
                : isEditMode
                ? 'Save Changes'
                : isRedoMode
                ? 'Save New Entry'
                : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingEntry(null);
        }}
        title="DELETE JOURNAL ENTRY?"
        subtitle="Permanent action confirmation"
        maxWidthClass="max-w-md"
        id="journal-delete-modal"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-300">
              <p className="font-semibold text-rose-300">
                This will permanently remove this journal entry.
              </p>
              <p className="text-[var(--forge-text-secondary)] text-[11px] leading-relaxed">
                This action cannot be undone. Historical XP, Level, and Chronicle progression will remain untouched.
              </p>
            </div>
          </div>

          {deletingEntry && (
            <div className="p-3 bg-[var(--forge-surface-interactive)] border border-[var(--forge-border)] rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[var(--forge-text-muted)] text-[10px] font-mono">
                <span className="uppercase text-[var(--forge-text-accent)] font-semibold">{deletingEntry.type}</span>
                <span>{deletingEntry.date}</span>
              </div>
              <p className="font-serif font-bold text-[var(--forge-text-primary)] truncate">
                {deletingEntry.title || 'Daily Reflection'}
              </p>
              <p className="text-[var(--forge-text-secondary)] text-[11px] line-clamp-2 leading-relaxed">
                {deletingEntry.content}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingEntry(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              id="journal-confirm-delete-btn"
              onClick={handleConfirmDelete}
            >
              Delete Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* DISCARD CHANGES CONFIRMATION MODAL */}
      <Modal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        title="DISCARD CHANGES?"
        subtitle="Unsaved changes"
        maxWidthClass="max-w-md"
        id="journal-discard-modal"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-[var(--forge-text-secondary)] leading-relaxed">
            Your changes haven&apos;t been saved. Are you sure you want to discard your edits?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsDiscardModalOpen(false)}
            >
              Keep Editing
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={() => {
                setIsDiscardModalOpen(false);
                resetAndCloseEditor();
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

