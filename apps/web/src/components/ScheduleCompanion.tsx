import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BellRing, CalendarDays, Clock, Loader2, Trash2, Undo2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { ScheduleTimetable } from './ScheduleTimetable';
import type { ScheduleBlock } from './ScheduleTimetable';
import { ScheduleBlockEditor } from './ScheduleBlockEditor';

export const ScheduleCompanion: React.FC = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [canUndo, setCanUndo] = useState(taskAPI.hasScheduleUndo());
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [now, setNow] = useState(Date.now());
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const loadSchedule = async () => {
    if (user?.role !== 'student') return;
    try {
      const response = await taskAPI.getSavedSchedule();
      setSchedule(response.data.schedule || []);
    } catch {
      setSchedule([]);
    }
    setCanUndo(taskAPI.hasScheduleUndo());
  };

  useEffect(() => {
    if (user?.role !== 'student') return;
    void loadSchedule();
    const refresh = () => void loadSchedule();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
        void loadSchedule();
      }
    };
    window.addEventListener('talkitout:schedule-changed', refresh);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void loadSchedule();
    }, 60_000);
    return () => {
      window.removeEventListener('talkitout:schedule-changed', refresh);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, [user?.role]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  const nextBlock = useMemo(
    () => schedule.find((block) => block.scheduleStatus !== 'done' && new Date(block.end).getTime() > now),
    [schedule, now]
  );
  const minutesUntil = nextBlock
    ? Math.ceil((new Date(nextBlock.start).getTime() - now) / 60_000)
    : null;
  const shouldAlert = Boolean(nextBlock && minutesUntil !== null && minutesUntil <= 30 && minutesUntil >= -15);
  const alertId = nextBlock ? nextBlock.id || `${nextBlock.taskId}-${nextBlock.start}` : null;
  const showAlert = shouldAlert && dismissedId !== alertId;

  const deleteTimetable = async () => {
    const confirmed = window.confirm(
      'Delete this timetable? Your homework and revision topics will be kept.'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await taskAPI.clearSchedule();
      setSchedule([]);
      setCanUndo(taskAPI.hasScheduleUndo());
      setDismissedId(null);
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
      setSchedule(response.data.schedule || []);
      setCanUndo(false);
      toast.success('Your last timetable deletion was undone.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Could not undo the deletion.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (user?.role !== 'student') return null;

  const nextLabel = nextBlock
    ? new Date(nextBlock.start).toLocaleString('en-SG', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      <AnimatePresence>
        {showAlert && nextBlock && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-3 right-3 top-[4.75rem] z-30 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-wellness-sage-400/40 bg-panel-surface p-3 text-white shadow-2xl sm:left-auto sm:right-5 sm:max-w-md"
            role="status"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wellness-sage-500 text-white">
              <BellRing className="h-5 w-5" />
            </span>
            <button type="button" onClick={() => setIsOpen(true)} className="min-w-0 flex-1 text-left">
              <span className="block text-xs font-bold uppercase tracking-wide text-wellness-sage-300">
                {minutesUntil! <= 0 ? 'Time to begin' : `Starting in ${minutesUntil} min`}
              </span>
              <span className="block truncate text-sm font-semibold">{nextBlock.title}</span>
              <span className="block text-xs text-white/55">Open your timetable for the session details.</span>
            </button>
            <button type="button" onClick={() => setDismissedId(alertId)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white" aria-label="Dismiss reminder">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-wellness-sage-400/40 bg-panel-surface text-sm font-bold text-white shadow-2xl transition hover:bg-panel-alt sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:min-h-12 sm:justify-start sm:gap-2 sm:px-4"
        aria-label="Open my timetable"
      >
        <CalendarDays className="h-5 w-5 text-wellness-sage-300" />
        <span className="hidden sm:block">
          <span className="block leading-tight">My timetable</span>
          {nextLabel && <span className="block text-[0.6rem] font-medium text-white/50">Next: {nextLabel}</span>}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
            <motion.section initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="max-h-[92dvh] w-full max-w-6xl overflow-y-auto rounded-t-3xl border border-panel-border bg-panel-surface p-4 text-white shadow-2xl sm:rounded-3xl sm:p-6" role="dialog" aria-modal="true" aria-label="My saved timetable">
              <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-wellness-sage-300">Always available</p>
                  <h2 className="mt-1 text-xl font-bold">My weekly timetable</h2>
                  <p className="mt-1 text-sm text-white/55">Homework, revision, school, breaks, and recommended sleep in one weekly view.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canUndo && schedule.length > 0 && (
                    <button
                      type="button"
                      onClick={undoDelete}
                      disabled={isRestoring}
                      className="flex min-h-11 items-center gap-1.5 rounded-xl border border-wellness-sage-400/35 bg-wellness-sage-500/10 px-3 text-xs font-bold text-white hover:bg-wellness-sage-500/20 disabled:opacity-60"
                      aria-label="Undo last timetable deletion"
                    >
                      {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                      <span className="hidden sm:inline">{isRestoring ? 'Restoring…' : 'Undo'}</span>
                    </button>
                  )}
                  {schedule.length > 0 && (
                    <button
                      type="button"
                      onClick={deleteTimetable}
                      disabled={isDeleting}
                      className="flex min-h-11 items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Delete timetable"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span className="hidden sm:inline">{isDeleting ? 'Deleting…' : 'Delete'}</span>
                    </button>
                  )}
                  <button type="button" onClick={() => setIsOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-panel-border text-white/55 hover:bg-white/5 hover:text-white" aria-label="Close timetable">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              {schedule.length ? (
                <ScheduleTimetable blocks={schedule} onEditBlock={setEditingBlock} />
              ) : (
                <div className="rounded-2xl border border-dashed border-panel-border px-5 py-12 text-center">
                  <Clock className="mx-auto h-9 w-9 text-white/25" />
                  <p className="mt-3 text-sm font-semibold">No saved timetable yet</p>
                  <p className="mt-1 text-xs text-white/50">{canUndo ? 'Your tasks are safe. Restore the timetable if deleting it was a mistake.' : 'Build one from your open homework and revision items.'}</p>
                  {canUndo ? (
                    <button type="button" onClick={undoDelete} disabled={isRestoring} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-wellness-sage-600 px-4 text-sm font-bold text-white hover:bg-wellness-sage-700 disabled:opacity-60">
                      {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                      {isRestoring ? 'Restoring…' : 'Undo timetable deletion'}
                    </button>
                  ) : (
                    <Link to="/app/tasks?scheduler=open" onClick={() => setIsOpen(false)} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-wellness-sage-600 px-4 text-sm font-bold text-white hover:bg-wellness-sage-700">
                      Open Smart Scheduler
                    </Link>
                  )}
                </div>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      {editingBlock?.id && (
        <ScheduleBlockEditor
          key={editingBlock.id}
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onChanged={loadSchedule}
        />
      )}
    </>
  );
};
