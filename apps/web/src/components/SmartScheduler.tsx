import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, ChevronDown, ChevronUp, Clock, Lightbulb, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { taskAPI } from '../api/client';
import toast from 'react-hot-toast';

type SchedulerInput = {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  estimatedMinutes: number;
  importance: number;
};

type ScheduleBlock = {
  title: string;
  subject?: string | null;
  start: string;
  end: string;
  priority: 'low' | 'med' | 'high';
  rank: number;
  tip: string;
};

type ScheduleResult = {
  overview: string;
  rankedItems: Array<SchedulerInput & { rank: number; reason: string }>;
  schedule: ScheduleBlock[];
  tips: string[];
};

const fieldClass = 'w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-wellness-sage-400 focus:outline-none focus:ring-1 focus:ring-wellness-sage-400';
const newItem = (): SchedulerInput => ({
  id: crypto.randomUUID(),
  title: '',
  subject: '',
  deadline: '',
  estimatedMinutes: 60,
  importance: 3,
});

export const SmartScheduler: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<SchedulerInput[]>([newItem()]);
  const [preferences, setPreferences] = useState({
    startDate: new Date().toLocaleDateString('en-CA'),
    dayStart: '16:00',
    dayEnd: '21:00',
    sessionMinutes: 45,
    breakMinutes: 10,
  });
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const updateItem = (id: string, key: keyof SchedulerInput, value: string | number) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
    setResult(null);
  };

  const generate = async () => {
    const validItems = items.filter((item) => item.title.trim());
    if (!validItems.length) {
      toast.error('Add at least one thing you need to do.');
      return;
    }
    if (preferences.dayStart >= preferences.dayEnd) {
      toast.error('Your available end time must be later than the start time.');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await taskAPI.generateSchedule({
        items: validItems.map((item) => ({
          ...item,
          deadline: item.deadline ? new Date(item.deadline).toISOString() : undefined,
        })),
        preferences,
      });
      setResult(response.data);
      toast.success('Your schedule is ready to review.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not build the schedule.');
    } finally {
      setIsGenerating(false);
    }
  };

  const createTasks = async () => {
    if (!result?.schedule.length) return;
    setIsCreating(true);
    try {
      await taskAPI.createMany(result.schedule.map((block) => ({
        title: block.title,
        subject: block.subject,
        dueAt: block.end,
        priority: block.priority,
      })));
      toast.success(`${result.schedule.length} scheduled task${result.schedule.length === 1 ? '' : 's'} added.`);
      setResult(null);
      setItems([newItem()]);
      setIsOpen(false);
      onCreated();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not add the schedule.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-wellness-sage-200 bg-gradient-to-br from-wellness-sage-50 to-wellness-sky-50 shadow-card">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left text-wellness-neutral-900 sm:px-5"
        aria-expanded={isOpen}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wellness-sage-500 text-white shadow-glow">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold sm:text-base">Smart scheduler assistant</span>
          <span className="block text-xs text-wellness-neutral-700">Rank your workload and build a realistic study plan.</span>
        </span>
        {isOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-wellness-sage-200 bg-surface/95 p-4 sm:p-5">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-text">1. What do you need to do?</h2>
                    <p className="text-xs text-muted">Importance, deadline, and effort determine the order.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems((current) => [...current, newItem()])}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-wellness-sage-200 bg-wellness-sage-50 px-3 text-xs font-bold text-wellness-sage-800 hover:bg-wellness-sage-100"
                  >
                    <Plus className="h-4 w-4" /> Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-border bg-surface-alt p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted">Item {index + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="sm:col-span-2 lg:col-span-2">
                          <span className="mb-1 block text-xs font-semibold text-text">Task</span>
                          <input className={fieldClass} value={item.title} onChange={(event) => updateItem(item.id, 'title', event.target.value)} placeholder="e.g. Finish chemistry report" />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-text">Subject</span>
                          <input className={fieldClass} value={item.subject} onChange={(event) => updateItem(item.id, 'subject', event.target.value)} placeholder="Chemistry" />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-text">Deadline</span>
                          <input type="datetime-local" className={fieldClass} value={item.deadline} onChange={(event) => updateItem(item.id, 'deadline', event.target.value)} />
                        </label>
                        <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
                          <label>
                            <span className="mb-1 block text-xs font-semibold text-text">Minutes needed</span>
                            <input type="number" min="15" max="720" step="15" className={fieldClass} value={item.estimatedMinutes} onChange={(event) => updateItem(item.id, 'estimatedMinutes', Number(event.target.value))} />
                          </label>
                          <label>
                            <span className="mb-1 block text-xs font-semibold text-text">Importance (1–5)</span>
                            <input type="number" min="1" max="5" className={fieldClass} value={item.importance} onChange={(event) => updateItem(item.id, 'importance', Number(event.target.value))} />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-bold text-text">2. When can you work?</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-text">Start planning from</span>
                    <input type="date" className={fieldClass} value={preferences.startDate} onChange={(event) => setPreferences((value) => ({ ...value, startDate: event.target.value }))} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-text">Available from</span>
                    <input type="time" className={fieldClass} value={preferences.dayStart} onChange={(event) => setPreferences((value) => ({ ...value, dayStart: event.target.value }))} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-text">Available until</span>
                    <input type="time" className={fieldClass} value={preferences.dayEnd} onChange={(event) => setPreferences((value) => ({ ...value, dayEnd: event.target.value }))} />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-text">Focus block</span>
                    <select className={fieldClass} value={preferences.sessionMinutes} onChange={(event) => setPreferences((value) => ({ ...value, sessionMinutes: Number(event.target.value) }))}>
                      <option value="25">25 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold text-text">Break</span>
                    <select className={fieldClass} value={preferences.breakMinutes} onChange={(event) => setPreferences((value) => ({ ...value, breakMinutes: Number(event.target.value) }))}>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="20">20 minutes</option>
                    </select>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={generate}
                disabled={isGenerating}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-wellness-sage-500 px-4 text-sm font-bold text-white shadow-glow hover:bg-wellness-sage-600 disabled:opacity-60 sm:w-auto"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Building your plan…' : 'Build my schedule'}
              </button>

              {result && (
                <div className="space-y-5 border-t border-border pt-5">
                  <div>
                    <h2 className="text-base font-bold text-text">Your suggested plan</h2>
                    <p className="mt-1 text-sm text-muted">{result.overview}</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface-alt p-4">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Priority ranking</h3>
                      <ol className="space-y-3">
                        {result.rankedItems.map((item) => (
                          <li key={`${item.rank}-${item.title}`} className="flex gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wellness-sage-500 text-xs font-bold text-white">{item.rank}</span>
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-semibold text-text">{item.title}</span>
                              <span className="block text-xs text-muted">{item.reason}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-alt p-4">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Helpful tips</h3>
                      <ul className="space-y-2">
                        {result.tips.map((tip) => (
                          <li key={tip} className="flex gap-2 text-sm text-text">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-wellness-sage-500" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Schedule</h3>
                    <div className="space-y-2">
                      {result.schedule.map((block, index) => (
                        <div key={`${block.start}-${block.title}`} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center">
                          <div className="flex min-w-[9rem] items-center gap-2 text-xs font-semibold text-wellness-sage-700">
                            <CalendarClock className="h-4 w-4 shrink-0" />
                            <span>{new Date(block.start).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div className="flex min-w-[7rem] items-center gap-2 text-xs text-muted">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>{new Date(block.start).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}–{new Date(block.end).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-text">{index + 1}. {block.title}</p>
                            <p className="text-xs text-muted">{block.tip}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={createTasks}
                    disabled={isCreating}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#13111C] px-5 text-sm font-bold text-white hover:bg-wellness-sage-800 disabled:opacity-60 sm:w-auto"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                    {isCreating ? 'Adding schedule…' : `Add ${result.schedule.length} blocks to To-Do`}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
