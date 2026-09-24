import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BookMarked, Plus, Sparkles, Trash2, Edit3, Shield, Flame } from 'lucide-react';

export const MirrorScreen: React.FC = () => {
  const principles = useLiveQuery(() => db.principles.toArray(), []) || [];
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<'discipline' | 'strength' | 'relationships' | 'character' | 'wisdom'>('character');

  const handleAddPrinciple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    await db.principles.add({
      text: newText.trim(),
      category: newCategory,
      createdAt: new Date().toISOString(),
    });

    setNewText('');
    setIsAddOpen(false);
  };

  const handleDeletePrinciple = async (id: number) => {
    await db.principles.delete(id);
  };

  return (
    <div id="mirror-screen" className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-[var(--forge-text-primary,#E4E3E0)] flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[var(--forge-text-accent,#D4AF37)]" />
            The Mirror
          </h1>
          <p className="text-[10px] text-[var(--forge-text-secondary,#8E9299)] mt-1 uppercase tracking-widest">
            Personal Operating System • Core Non-Negotiable Principles
          </p>
        </div>

        <Button variant="gold" size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          <span>Add Principle</span>
        </Button>
      </div>

      {/* Philosophy Banner */}
      <Card variant="gold" className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-[var(--forge-text-accent,#D4AF37)]">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Identity Creed</span>
        </div>
        <p className="text-xs text-[var(--forge-text-primary,#E4E3E0)] italic">
          "The Mirror does not judge productivity. It reflects who you choose to be when no one is watching."
        </p>
      </Card>

      {/* Principles List */}
      <div className="space-y-3">
        {principles.length === 0 ? (
          <Card className="text-center py-10 text-[#8E9299] text-xs space-y-2">
            <p>You have not recorded any core principles yet.</p>
            <Button variant="gold" size="sm" onClick={() => setIsAddOpen(true)}>
              Draft Your First Principle
            </Button>
          </Card>
        ) : (
          principles.map((pr, index) => (
            <Card key={pr.id} className="p-4 space-y-2 border border-[#1C1C1C] hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#D4AF37]">
                      PRINCIPLE {index + 1}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-[#8E9299] px-2 py-0.5 bg-[#050505] border border-[#161616] rounded-xs">
                      {pr.category}
                    </span>
                  </div>
                  <p className="font-serif text-sm font-semibold text-[#E4E3E0] leading-relaxed">
                    "{pr.text}"
                  </p>
                </div>

                {pr.id && (
                  <button
                    onClick={() => handleDeletePrinciple(pr.id!)}
                    className="text-[#8E9299] hover:text-red-400 p-1 transition-colors cursor-pointer shrink-0"
                    title="Remove principle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="DRAFT CORE PRINCIPLE"
        subtitle="Write a non-negotiable rule that governs your character."
      >
        <form onSubmit={handleAddPrinciple} className="space-y-4 pt-2">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1.5">
              Principle Statement
            </label>
            <textarea
              required
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="w-full bg-[#050505] border border-[#1A1A1A] rounded-sm p-3 text-xs text-[#E4E3E0] focus:outline-none focus:border-[#D4AF37]"
              placeholder="e.g. Do what is hard, especially when tired. Speak truth simply."
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8E9299] mb-1.5">
              Category Focus
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full bg-[#050505] border border-[#1A1A1A] rounded-sm p-2.5 text-xs text-[#E4E3E0] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="discipline">Discipline</option>
              <option value="strength">Strength</option>
              <option value="character">Character</option>
              <option value="relationships">Relationships</option>
              <option value="wisdom">Wisdom</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" type="submit">
              Reflect & Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
