import React, { useState } from 'react';
import { CalendarDays, Clock3, Loader2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskAPI } from '../api/client';
import type { ScheduleBlock } from './ScheduleTimetable';

const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000;

const singaporeParts = (iso: string) => {
  const shifted = new Date(new Date(iso).getTime() + SINGAPORE_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
};

const singaporeIso = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`).toISOString();

type Props = {
  block: ScheduleBlock;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

export const ScheduleBlockEditor: React.FC<Props> = ({ block, onClose, onChanged }) => {
  const initialStart = singaporeParts(block.start);
  const initialEnd = singaporeParts(block.end);
  const [date, setDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [status, setStatus] = useState(block.scheduleStatus || 'todo');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const save = async () => {
    if (!block.id) return;
    const start = singaporeIso(date, startTime);
    const end = singaporeIso(date, endTime);
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      toast.error('The session must end after it starts.');
      return;
    }

    setIsSaving(true);
    try {
      await taskAPI.updateScheduleBlock(block.id, { start, end, status });
      await onChanged();
      toast.success('Timetable session updated.');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Could not update this session.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!block.id) return;
    const confirmed = window.confirm(
      `Remove this ${block.workType === 'revision' ? 'revision' : 'homework'} session from the timetable? The To-Do item will be kept.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await taskAPI.deleteScheduleBlock(block.id);
      await onChanged();
      toast.success('Session removed. You can undo this from the timetable.');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Could not remove this session.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        className="w-full max-w-lg rounded-t-3xl border border-[#3A3453] bg-[#191624] p-5 text-white shadow-2xl sm:rounded-3xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-editor-title"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-wellness-sage-300">Edit one session</p>
            <h2 id="schedule-editor-title" className="mt-1 break-words text-xl font-bold">{block.title}</h2>
            <p className="mt-1 text-xs text-white/50">Changes apply only to this timetable block.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#3A3453] text-white/55 hover:bg-white/5 hover:text-white" aria-label="Close session editor">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold text-white/75">
            <span className="mb-1.5 flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Day</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#3A3453] bg-[#13111C] px-3 text-sm text-white [color-scheme:dark] focus:border-wellness-sage-400 focus:outline-none" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-white/75">
              <span className="mb-1.5 flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> Starts</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#3A3453] bg-[#13111C] px-3 text-sm text-white [color-scheme:dark] focus:border-wellness-sage-400 focus:outline-none" />
            </label>
            <label className="block text-xs font-bold text-white/75">
              <span className="mb-1.5 block">Ends</span>
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#3A3453] bg-[#13111C] px-3 text-sm text-white [color-scheme:dark] focus:border-wellness-sage-400 focus:outline-none" />
            </label>
          </div>

          <label className="block text-xs font-bold text-white/75">
            <span className="mb-1.5 block">Progress</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as 'todo' | 'doing' | 'done')} className="min-h-12 w-full rounded-xl border border-[#3A3453] bg-[#13111C] px-3 text-sm text-white focus:border-wellness-sage-400 focus:outline-none">
              <option value="todo">To Do</option>
              <option value="doing">Doing</option>
              <option value="done">Done</option>
            </select>
          </label>
        </div>

        <p className="mt-4 rounded-xl border border-[#3A3453] bg-[#211D32] px-3 py-2.5 text-xs leading-relaxed text-white/55">
          To rename the task everywhere, edit its card in the To-Do list. Removing this session will not delete that task.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={remove} disabled={isDeleting || isSaving} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-60">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeleting ? 'Removing…' : 'Remove this session'}
          </button>
          <button type="button" onClick={save} disabled={isSaving || isDeleting} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-wellness-sage-600 px-5 text-sm font-bold text-white hover:bg-wellness-sage-700 disabled:opacity-60">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </section>
    </div>
  );
};
