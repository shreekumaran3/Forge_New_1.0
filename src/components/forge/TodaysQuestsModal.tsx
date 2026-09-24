import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useGame } from '../../context/GameContext';
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Check,
  Clock,
} from 'lucide-react';
import { playUISound } from '../../services/soundManager';
import { DailyQuestIntent } from '../../types';
import { getHeldBackLandmarks } from '../../services/questGenerator';

interface TodaysQuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intentData?: DailyQuestIntent;
  readyToApply?: boolean;
}

export const TodaysQuestsModal: React.FC<TodaysQuestsModalProps> = ({ isOpen, onClose }) => {
  const { forgePath, dailyIntent, applyDailyIntent, clearTodayIntent } = useGame();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height up to sensible maximum
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }
  }, [inputText]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'Tell Forge what you can realistically do today — your available time, what you feel like doing, and what you need to improve.',
      intentData: dailyIntent,
      readyToApply: false,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || isProcessing) return;

    playUISound('tap');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/gemini/interpret-daily-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          context: {
            forgePathName: forgePath?.name || 'General Progression',
            forgePathDomain: forgePath?.domain || 'general',
            currentFocus: forgePath?.focus || 'Core Skills',
            skills: forgePath?.skillConcepts || [],
          },
        }),
      });

      const resJson = await response.json();
      const rawData = resJson.intentData || resJson.data;
      const reply = resJson.reply || 'I have calibrated today’s quest adaptation parameters.';
      const isReady = resJson.readyToApply ?? true;

      let parsedIntent: DailyQuestIntent | undefined = undefined;
      if (rawData && isReady) {
        const todayStr = new Date().toISOString().split('T')[0];
        parsedIntent = {
          dateKey: todayStr,
          userPrompt: textToSend,
          availableMinutes: rawData.availableMinutes,
          energyPreference: rawData.energyPreference || 'moderate',
          difficultyPreference: rawData.difficultyPreference || 'moderate',
          preferredDomains: rawData.preferredDomains || [],
          deprioritizedDomains: rawData.deprioritizedDomains || [],
          targetSkills: rawData.targetSkills || [],
          preferredActivityTypes: rawData.preferredActivityTypes || ['practical', 'drill'],
          noveltyPreference: rawData.noveltyPreference || 'moderate',
          avoidRecentlyRepeatedActivities: Boolean(rawData.avoidRecentlyRepeatedActivities),
          notes: rawData.notes || `Adapted based on: "${textToSend}"`,
          createdAt: new Date().toISOString(),
        };
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        intentData: parsedIntent,
        readyToApply: isReady,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playUISound('success');
    } catch (err) {
      console.warn('Daily Intent conversational request fallback:', err);
      // Fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const isLow = textToSend.toLowerCase().includes('tired') || textToSend.toLowerCase().includes('low');
      const fallbackIntent: DailyQuestIntent = {
        dateKey: todayStr,
        userPrompt: textToSend,
        energyPreference: isLow ? 'low' : 'moderate',
        difficultyPreference: isLow ? 'easy' : 'moderate',
        preferredDomains: [],
        deprioritizedDomains: [],
        targetSkills: [],
        preferredActivityTypes: ['practical', 'drill'],
        noveltyPreference: 'moderate',
        avoidRecentlyRepeatedActivities: false,
        notes: `Adapted for today based on: "${textToSend}"`,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Understood. I have calibrated today's quest parameters for **${isLow ? 'low energy' : 'standard'}** pacing. You can apply this adaptation below.`,
          intentData: fallbackIntent,
          readyToApply: true,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyIntent = async (intentToApply: DailyQuestIntent) => {
    playUISound('confirm');
    await applyDailyIntent(intentToApply);
    playUISound('success');
    onClose();
  };

  const handleResetIntent = async () => {
    playUISound('tap');
    setIsProcessing(true);
    try {
      await clearTodayIntent();
      playUISound('success');
      onClose();
    } catch (err) {
      console.error('Failed to reset daily intent:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="TODAY'S ADAPTATION"
      subtitle="Tell Forge what you can realistically do today."
    >
      <div className="space-y-3.5 pt-1 max-h-[75vh] flex flex-col">
        {/* Active Intent Status if already set */}
        {dailyIntent && (
          <div className="p-3.5 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border-accent)] rounded-2xl space-y-1.5 shrink-0 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="forge-pill forge-pill-accent text-[10px] font-mono font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Daily Adaptation
              </span>
              <button
                type="button"
                onClick={handleResetIntent}
                disabled={isProcessing}
                className="text-xs font-mono text-[var(--forge-text-muted)] hover:text-[var(--forge-text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <p className="text-xs text-[var(--forge-text-primary)] italic leading-relaxed font-sans">
              "{dailyIntent.userPrompt || dailyIntent.notes}"
            </p>
            {getHeldBackLandmarks().length > 0 && (
              <div className="space-y-1 pt-1">
                {getHeldBackLandmarks().map((hb, idx) => (
                  <div
                    key={`modal-held-${idx}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] font-mono text-amber-300"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>{hb.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversational Stream */}
        <div className="space-y-3 overflow-y-auto max-h-[380px] p-3 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--forge-text-muted)] uppercase">
                {msg.role === 'user' ? (
                  <span>You</span>
                ) : (
                  <span className="text-[var(--forge-text-accent)] flex items-center gap-1 font-bold">
                    <Sparkles className="w-3 h-3 text-[var(--forge-text-accent)]" />
                    Adaptation Oracle
                  </span>
                )}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[92%] ${
                  msg.role === 'user'
                    ? 'bg-[var(--forge-surface-elevated)] text-[var(--forge-text-primary)] border border-[var(--forge-border-accent)]'
                    : 'bg-[var(--forge-surface-interactive)] text-[var(--forge-text-primary)] border border-[var(--forge-border)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Adapted Intent Preview Card inside Assistant message when ready */}
                {msg.intentData && msg.readyToApply !== false && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border-accent)] space-y-2.5 text-left shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="forge-pill forge-pill-accent text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Adapted Intent Plan
                      </span>
                      <span className="forge-pill text-[9px] font-mono text-[var(--forge-text-muted)]">
                        {msg.intentData.dateKey}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--forge-text-primary)] italic font-sans">
                      "{msg.intentData.notes || msg.intentData.userPrompt}"
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
                      {msg.intentData.availableMinutes && (
                        <span className="forge-pill text-[var(--forge-text-primary)]">
                          ⏱ {msg.intentData.availableMinutes}m budget
                        </span>
                      )}
                      <span className="forge-pill text-amber-400 capitalize">
                        ⚡ {msg.intentData.energyPreference} energy
                      </span>
                      <span className="forge-pill text-cyan-400 capitalize">
                        🎯 {msg.intentData.difficultyPreference} difficulty
                      </span>
                      {msg.intentData.preferredDomains && msg.intentData.preferredDomains.length > 0 && (
                        <span className="forge-pill text-emerald-400">
                          + {msg.intentData.preferredDomains.join(', ')}
                        </span>
                      )}
                      {msg.intentData.deprioritizedDomains && msg.intentData.deprioritizedDomains.length > 0 && (
                        <span className="forge-pill text-rose-400">
                          - {msg.intentData.deprioritizedDomains.join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={() => handleApplyIntent(msg.intentData!)}
                        className="text-xs font-mono uppercase tracking-wider font-bold rounded-xl shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Apply Today's Adaptation
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border-accent)] text-xs font-mono text-[var(--forge-text-accent)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--forge-text-accent)]" />
              <span>Calibrating today's adaptation with Gemini...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 shrink-0">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Tell Forge what you can realistically do today..."
            disabled={isProcessing}
            className="w-full flex-1 bg-[var(--forge-surface)] border border-[var(--forge-border)] focus:border-[var(--forge-border-accent)] rounded-2xl px-4 py-3 text-xs text-[var(--forge-text-primary)] placeholder-[var(--forge-text-muted)] focus:outline-hidden font-sans transition-colors shadow-xs whitespace-normal break-words [overflow-wrap:break-word] overflow-x-hidden overflow-y-auto resize-none min-h-[44px] max-h-32 custom-scrollbar"
          />
          <Button
            type="submit"
            variant="gold"
            disabled={!inputText.trim() || isProcessing}
            className="px-4 py-3 rounded-2xl text-xs font-mono uppercase font-bold shrink-0 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </Modal>
  );
};
