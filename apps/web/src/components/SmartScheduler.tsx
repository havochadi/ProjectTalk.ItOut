import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, ChevronDown, ChevronUp, Lightbulb, Loader2, Plus, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { taskAPI } from '../api/client';
import toast from 'react-hot-toast';
import { ScheduleTimetable } from './ScheduleTimetable';
import type { ScheduleBlock } from './ScheduleTimetable';
import { ScheduleBlockEditor } from './ScheduleBlockEditor';
import { useSearchParams } from 'react-router-dom';

type SchedulerInput = {
  id: string;
  title: string;
  subject: string;
  workType: 'homework' | 'revision';
  deadline: string;
  estimatedMinutes: number;
  importance: number;
};

type ScheduleResult = {
  overview: string;
  rankedItems: Array<SchedulerInput & { rank: number; reason: string }>;
  schedule: ScheduleBlock[];
  tips: string[];
};

const fieldClass = 'w-full min-h-11 rounded-xl border border-[#3A3453] bg-[#13111C] px-3 py-2.5 text-sm text-white [color-scheme:dark] placeholder:text-white/40 focus:border-wellness-sage-400 focus:outline-none focus:ring-1 focus:ring-wellness-sage-400';
const weekDays = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];
const newItem = (): SchedulerInput => ({
  id: crypto.randomUUID(),
  title: '',
  subject: '',
  workType: 'homework',
  deadline: '',
  estimatedMinutes: 60,
  importance: 3,
});

export const SmartScheduler: React.FC<{ tasks: any[]; onChanged: () => void }> = ({ tasks, onChanged }) => {
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(() => searchParams.get('scheduler') === 'open');
  const [items, setItems] = useState<SchedulerInput[]>([newItem()]);
  const [preferences, setPreferences] = useState({
    startDate: new Date().toLocaleDateString('en-CA'),
    weeklyStartTimes: {
      mon: '16:00', tue: '16:00', wed: '16:00', thu: '16:00', fri: '16:00',
      sat: '10:00', sun: '',
    } as Record<string, string>,
  });
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [canUndo, setCanUndo] = useState(taskAPI.hasScheduleUndo());
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [savedSchedule, setSavedSchedule] = useState<ScheduleBlock[]>([]);
  const scheduledTaskIds = new Set(savedSchedule
    .filter((block) => block.scheduleStatus !== 'done' && new Date(block.end).getTime() >= Date.now())
    .map((block) => block.taskId));
  const unscheduledCount = tasks.filter((task) => task.status !== 'done' && !scheduledTaskIds.has(task._id)).length;

  const loadSavedSchedule = useCallback(async () => {
    try {
      const response = await taskAPI.getSavedSchedule();
      setSavedSchedule(response.data.schedule || []);
    } catch {
      setSavedSchedule([]);
    }
    setCanUndo(taskAPI.hasScheduleUndo());
  }, []);

  useEffect(() => {
    void loadSavedSchedule();
    const refresh = () => void loadSavedSchedule();
    window.addEventListener('talkitout:schedule-changed', refresh);
    return () => window.removeEventListener('talkitout:schedule-changed', refresh);
  }, [tasks, loadSavedSchedule]);

  const updateItem = (id: string, key: keyof SchedulerInput, value: string | number) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [key]: value };
      if (key === 'workType' && value === 'revision') updated.deadline = '';
      return updated;
    }));
    setResult(null);
  };

  const generate = async () => {
    const validItems = items.filter((item) => item.title.trim());
    if (!Object.values(preferences.weeklyStartTimes).some(Boolean)) {
      toast.error('Choose a start time for at least one day.');
      return;
    }
    setIsGenerating(true);
    try {
      let createdTasks: any[] = [];
      if (validItems.length) {
        const created = await taskAPI.createMany(validItems.map((item) => ({
          title: item.title.trim(),
          subject: item.workType === 'revision' ? 'Revision' : 'Homework',
          dueAt: item.workType === 'homework' && item.deadline
            ? new Date(`${item.deadline}T23:59:00`).toISOString()
            : null,
          priority: item.importance >= 5 ? 'high' : item.importance >= 3 ? 'med' : 'low',
          workType: item.workType,
          estimatedMinutes: item.estimatedMinutes,
          importance: item.importance,
        })));
        createdTasks = created.data.tasks || [];
        setItems([newItem()]);
        onChanged();
      }
      const openTasks = [...tasks.filter((task) => task.status !== 'done'), ...createdTasks];
      if (!openTasks.length) {
        toast.error('Add at least one open To-Do item before building a schedule.');
        return;
      }
      const response = await taskAPI.generateSchedule({
        items: openTasks.map((task) => ({
          id: task._id,
          title: task.title,
          subject: task.subject,
          workType: task.workType || 'homework',
          deadline: task.workType !== 'revision' ? task.dueAt : undefined,
          estimatedMinutes: task.estimatedMinutes || 60,
          importance: task.importance || (task.priority === 'high' ? 5 : task.priority === 'low' ? 2 : 3),
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

  const saveTimetable = async () => {
    if (!result?.schedule.length) return;
    setIsCreating(true);
    try {
      await taskAPI.saveSchedule(result.schedule);
      await loadSavedSchedule();
      onChanged();
      toast.success('Your weekly timetable has been saved.');
      setResult(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not save the timetable.');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTimetable = async () => {
    const confirmed = window.confirm(
      'Delete this timetable? Your homework and revision topics will be kept.'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await taskAPI.clearSchedule();
      setSavedSchedule([]);
      setCanUndo(taskAPI.hasScheduleUndo());
      setResult(null);
      onChanged();
      toast.success('Timetable deleted. Your tasks are still available.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Could not delete the timetable.');
    } finally {
      setIsDeleting(false);
    }
  };

  const undoDelete = async () => {
    setIsRestoring(true);
    try {
      const response = await taskAPI.restoreDeletedSchedule();
      setSavedSchedule(response.data.schedule || []);
      setCanUndo(false);
      onChanged();
      toast.success('Your last timetable deletion was undone.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Could not undo the deletion.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
    <section className="overflow-hidden rounded-2xl border border-[#3A3453] bg-[#191624] shadow-card">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex min-h-16 w-full items-center gap-3 bg-[#211D32] px-4 py-3 text-left text-white sm:px-5"
        aria-expanded={isOpen}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wellness-sage-500 text-white shadow-glow">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold sm:text-base">Smart scheduler assistant</span>
          <span className="block text-xs text-white/60">Build a weekly homework plan with clear daily revision targets.</span>
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
            <div className="space-y-5 border-t border-[#3A3453] bg-[#191624] p-4 text-white sm:p-5">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white">Add tasks or revision topics</h2>
                    <p className="text-xs text-white/55">
                      {tasks.filter((task) => task.status !== 'done').length} open To-Do item{tasks.filter((task) => task.status !== 'done').length === 1 ? '' : 's'} will be included automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems((current) => [...current, newItem()])}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-wellness-sage-400/50 bg-wellness-sage-500/15 px-3 text-xs font-bold text-wellness-sage-200 hover:bg-wellness-sage-500/25"
                  >
                    <Plus className="h-4 w-4" /> Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="rounded-xl border border-[#3A3453] bg-[#211D32] p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-white/55">Item {index + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/45 hover:bg-red-500/10 hover:text-red-300"
                            aria-label={`Remove item ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-white/80">Type of work</span>
                          <select className={fieldClass} value={item.workType} onChange={(event) => updateItem(item.id, 'workType', event.target.value)}>
                            <option value="homework">Homework</option>
                            <option value="revision">Revision</option>
                          </select>
                        </label>
                        <label className="sm:col-span-2 lg:col-span-2">
                          <span className="mb-1 block text-xs font-semibold text-white/80">Task or revision topic</span>
                          <input className={fieldClass} value={item.title} onChange={(event) => updateItem(item.id, 'title', event.target.value)} placeholder={item.workType === 'revision' ? 'e.g. Revise algebra chapter 3' : 'e.g. Finish chemistry report'} />
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-white/80">{item.workType === 'revision' ? 'Deadline' : 'Due date'}</span>
                          {item.workType === 'revision' ? (
                            <div className="flex min-h-11 items-center rounded-xl border border-[#3A3453] bg-[#191624] px-3 text-xs text-white/45">Flexible — none needed</div>
                          ) : (
                            <input type="date" className={fieldClass} value={item.deadline} onChange={(event) => updateItem(item.id, 'deadline', event.target.value)} />
                          )}
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-white/80">{item.workType === 'revision' ? 'Revision minutes per day' : 'Total minutes needed'}</span>
                          <input type="number" min="15" step="15" className={fieldClass} value={item.estimatedMinutes} onChange={(event) => updateItem(item.id, 'estimatedMinutes', Number(event.target.value))} />
                          {item.workType === 'revision' && <span className="mt-1 block text-[0.65rem] leading-snug text-white/45">This full amount is scheduled on every enabled study day and may be split into sessions.</span>}
                        </label>
                        <label>
                          <span className="mb-1 block text-xs font-semibold text-white/80">Priority</span>
                          <select className={fieldClass} value={item.importance} onChange={(event) => updateItem(item.id, 'importance', Number(event.target.value))}>
                            <option value="2">Low</option>
                            <option value="3">Normal</option>
                            <option value="5">Important</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#3A3453] bg-[#211D32] p-3 sm:p-4">
                <h2 className="text-sm font-bold text-white">What time do you want to start?</h2>
                <p className="mb-3 mt-1 text-xs text-white/55">Choose study days and when you normally begin. Keep at least one free day.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {weekDays.map((day) => {
                    const isStudyDay = Boolean(preferences.weeklyStartTimes[day.key]);
                    return (
                      <div key={day.key} className={`rounded-xl border p-2.5 transition ${isStudyDay ? 'border-wellness-sage-500/40 bg-[#191624]' : 'border-[#3A3453] bg-[#191624]/60'}`}>
                        <button
                          type="button"
                          onClick={() => setPreferences((current) => ({
                            ...current,
                            weeklyStartTimes: {
                              ...current.weeklyStartTimes,
                              [day.key]: isStudyDay ? '' : (day.key === 'sat' || day.key === 'sun' ? '10:00' : '16:00'),
                            },
                          }))}
                          className="mb-2 flex min-h-8 w-full items-center justify-between gap-1 text-left"
                          aria-pressed={isStudyDay}
                        >
                          <span className="text-xs font-bold text-white">{day.label}</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${isStudyDay ? 'bg-wellness-sage-400' : 'bg-white/20'}`} />
                        </button>
                        {isStudyDay ? (
                          <input
                            type="time"
                            className={`${fieldClass} px-2 text-xs`}
                            value={preferences.weeklyStartTimes[day.key]}
                            aria-label={`${day.label} start time`}
                            onChange={(event) => setPreferences((current) => ({
                              ...current,
                              weeklyStartTimes: { ...current.weeklyStartTimes, [day.key]: event.target.value },
                            }))}
                          />
                        ) : (
                          <button type="button" onClick={() => setPreferences((current) => ({ ...current, weeklyStartTimes: { ...current.weeklyStartTimes, [day.key]: '16:00' } }))} className="min-h-11 w-full rounded-lg border border-dashed border-white/15 text-xs text-white/35 hover:text-white/70">Free day</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/50">Weekday sessions start after the default 8 AM–3 PM school day. Each revision target repeats on every enabled study day and can be split across the evening; longer homework receives ten-minute resets and the plan protects an 11 PM–7 AM sleep window.</p>
              </div>

              <button
                type="button"
                onClick={generate}
                disabled={isGenerating}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-wellness-sage-600 px-5 text-sm font-bold text-white shadow-glow hover:bg-wellness-sage-700 disabled:opacity-60 sm:w-auto"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Building your plan…' : savedSchedule.length ? 'Update my timetable' : 'Build my timetable'}
              </button>

              {!result && savedSchedule.length === 0 && canUndo && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wellness-sage-400/30 bg-wellness-sage-500/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">Timetable deleted</p>
                    <p className="text-xs text-white/55">Your tasks are safe. Restore the most recent deletion if it was a mistake.</p>
                  </div>
                  <button type="button" onClick={undoDelete} disabled={isRestoring} className="flex min-h-10 items-center gap-2 rounded-xl border border-wellness-sage-400/40 bg-[#211D32] px-3 text-xs font-bold text-white hover:bg-[#2A2540] disabled:opacity-60">
                    {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                    {isRestoring ? 'Restoring…' : 'Undo delete'}
                  </button>
                </div>
              )}

              {!result && savedSchedule.length > 0 && (
                <div className="space-y-3 border-t border-[#3A3453] pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-wellness-sage-300">Saved timetable</p>
                      <h2 className="mt-1 text-base font-bold text-white">My weekly plan</h2>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <p className="text-xs text-white/45">Deleting the timetable keeps your tasks.</p>
                      {canUndo && (
                        <button type="button" onClick={undoDelete} disabled={isRestoring} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-wellness-sage-400/35 bg-wellness-sage-500/10 px-3 text-xs font-bold text-white hover:bg-wellness-sage-500/20 disabled:opacity-60">
                          {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                          {isRestoring ? 'Restoring…' : 'Undo last delete'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={deleteTimetable}
                        disabled={isDeleting}
                        className="flex min-h-10 items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {isDeleting ? 'Deleting…' : 'Delete timetable'}
                      </button>
                    </div>
                  </div>
                  {unscheduledCount > 0 && (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-100">
                      {unscheduledCount} open To-Do item{unscheduledCount === 1 ? '' : 's'} {unscheduledCount === 1 ? 'is' : 'are'} not in this timetable yet. Select <strong>Update my timetable</strong> to include {unscheduledCount === 1 ? 'it' : 'them'}.
                    </div>
                  )}
                  <ScheduleTimetable blocks={savedSchedule} onEditBlock={setEditingBlock} />
                </div>
              )}

              {result && (
                <div className="space-y-5 border-t border-[#3A3453] pt-5">
                  <div>
                    <h2 className="text-base font-bold text-white">Your suggested plan</h2>
                    <p className="mt-1 text-sm text-white/60">{result.overview}</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#3A3453] bg-[#211D32] p-4">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-white/55">Priority ranking</h3>
                      <ol className="space-y-3">
                        {result.rankedItems.map((item) => (
                          <li key={`${item.rank}-${item.title}`} className="flex gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wellness-sage-500 text-xs font-bold text-white">{item.rank}</span>
                            <span className="min-w-0">
                              <span className="block break-words text-sm font-semibold text-white">{item.title}</span>
                              <span className="block text-xs text-white/55">{item.reason}</span>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-xl border border-[#3A3453] bg-[#211D32] p-4">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-white/55">Helpful tips</h3>
                      <ul className="space-y-2">
                        {result.tips.map((tip) => (
                          <li key={tip} className="flex gap-2 text-sm text-white/85">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-wellness-sage-500" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-white/55">Weekly timetable</h3>
                    <ScheduleTimetable blocks={result.schedule} />
                  </div>

                  <button
                    type="button"
                    onClick={saveTimetable}
                    disabled={isCreating}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#13111C] px-5 text-sm font-bold text-white hover:bg-wellness-sage-800 disabled:opacity-60 sm:w-auto"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                    {isCreating ? 'Saving timetable…' : 'Save this timetable'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    {editingBlock?.id && (
      <ScheduleBlockEditor
        key={editingBlock.id}
        block={editingBlock}
        onClose={() => setEditingBlock(null)}
        onChanged={loadSavedSchedule}
      />
    )}
    </>
  );
};
