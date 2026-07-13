import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Modal } from '@talkitout/ui';
import { taskAPI } from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Lightbulb, Circle, Loader2, Pencil, Clock3 } from 'lucide-react';
import { SmartScheduler } from '../components/SmartScheduler';

interface StudySuggestion {
  method: string;
  description: string;
  timeEstimate: string;
}

const columns = [
  { status: 'todo',  label: 'To Do',  color: 'bg-[#211D32]', ring: 'border-[#3A3453]', dot: 'bg-wellness-sage-400' },
  { status: 'doing', label: 'Doing',  color: 'bg-[#172430]', ring: 'border-[#29465A]', dot: 'bg-wellness-sky-400' },
  { status: 'done',  label: 'Done',   color: 'bg-[#201B2C]', ring: 'border-[#3F3655]', dot: 'bg-wellness-lavender-400' },
];

const priorityStyle: Record<string, string> = {
  high: 'border-wellness-peach-300 bg-wellness-peach-50 text-wellness-peach-700',
  med:  'border-wellness-sky-300 bg-wellness-sky-50 text-wellness-sky-700',
  low:  'border-wellness-sage-300 bg-wellness-sage-50 text-wellness-sage-700',
};

const singaporeDayKey = (value: string | Date) => new Date(value).toLocaleDateString('en-CA', {
  timeZone: 'Asia/Singapore',
});

const scheduledTime = (value: string) => new Date(value).toLocaleTimeString('en-SG', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Singapore',
});

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', subject: '', priority: 'med', dueAt: '', workType: 'homework', estimatedMinutes: 60 });
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [selectedTaskForTips, setSelectedTaskForTips] = useState<any | null>(null);
  const [studySuggestions, setStudySuggestions] = useState<StudySuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    const [taskResult, scheduleResult] = await Promise.allSettled([
      taskAPI.getAll(),
      taskAPI.getSavedSchedule(),
    ]);
    if (taskResult.status === 'fulfilled') {
      const payload = taskResult.value?.data?.tasks ?? taskResult.value?.data ?? [];
      setTasks(Array.isArray(payload) ? payload : []);
    } else {
      toast.error('Failed to load tasks');
      setTasks([]);
    }
    setScheduleBlocks(scheduleResult.status === 'fulfilled' ? scheduleResult.value?.data?.schedule || [] : []);
  };

  const loadStudyTips = async (taskId: string) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;
    setSelectedTaskForTips(task);
    setIsLoadingSuggestions(true);
    setStudySuggestions([]);
    try {
      const res = await taskAPI.getStudySuggestions(taskId);
      const sugg = res?.data?.suggestions ?? res?.data ?? [];
      setStudySuggestions(Array.isArray(sugg) ? sugg : []);
    } catch { toast.error('Failed to load study tips'); }
    finally { setIsLoadingSuggestions(false); }
  };

  const resetTaskForm = () => {
    setNewTask({ title: '', subject: '', priority: 'med', dueAt: '', workType: 'homework', estimatedMinutes: 60 });
    setEditingTask(null);
    setIsModalOpen(false);
  };

  const openTaskEditor = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setNewTask({
        title: task.title || '',
        subject: task.subject || '',
        priority: task.priority || 'med',
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
        workType: task.workType || 'homework',
        estimatedMinutes: task.estimatedMinutes || 60,
      });
    } else {
      setEditingTask(null);
      setNewTask({ title: '', subject: '', priority: 'med', dueAt: '', workType: 'homework', estimatedMinutes: 60 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const data: any = {
        title: newTask.title,
        priority: newTask.priority,
        workType: newTask.workType,
        estimatedMinutes: newTask.estimatedMinutes,
        importance: newTask.priority === 'high' ? 5 : newTask.priority === 'low' ? 2 : 3,
        dueAt: newTask.workType === 'revision' ? null : (newTask.dueAt ? new Date(newTask.dueAt).toISOString() : null),
        subject: newTask.subject.trim() || null,
      };
      if (editingTask) await taskAPI.update(editingTask._id, data);
      else await taskAPI.create(data);
      toast.success(editingTask ? 'Task updated!' : 'Task added!');
      resetTaskForm();
      loadTasks();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save task'); }
  };

  const handleStatusChange = async (task: any, status: string) => {
    try {
      if (task.scheduleBlockId) {
        await taskAPI.updateScheduleBlockStatus(task.scheduleBlockId, status);
        setScheduleBlocks((current) => current.map((block) => (
          block.id === task.scheduleBlockId ? { ...block, scheduleStatus: status } : block
        )));
      } else {
        await taskAPI.updateStatus(task._id, status);
        setTasks((prev) => prev.map((item) => (item._id === task._id ? { ...item, status } : item)));
      }
    } catch { toast.error('Failed to update task'); }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setScheduleBlocks((current) => current.filter((block) => block.taskId !== taskId));
      toast.success('Task removed');
    } catch { toast.error('Failed to delete task'); }
  };

  const today = singaporeDayKey(new Date());
  const taskById = new Map(tasks.map((task) => [task._id, task]));
  const todaysRevisionSessions = scheduleBlocks
    .filter((block) => block.workType === 'revision' && singaporeDayKey(block.start) === today)
    .map((block) => {
      const topic = taskById.get(block.taskId) || {};
      return {
        ...topic,
        _id: block.taskId,
        boardId: `revision-session-${block.id}`,
        scheduleBlockId: block.id,
        status: block.scheduleStatus || 'todo',
        title: topic.title || block.title,
        subject: topic.subject || block.subject,
        workType: 'revision',
        priority: topic.priority || block.priority || 'med',
        estimatedMinutes: Math.max(1, Math.round((new Date(block.end).getTime() - new Date(block.start).getTime()) / 60_000)),
        scheduledStart: block.start,
        scheduledEnd: block.end,
      };
    });
  const boardTasks = [
    ...tasks.filter((task) => (task.workType || 'homework') !== 'revision'),
    ...todaysRevisionSessions,
  ];
  const completedCount = boardTasks.filter((task) => task.status === 'done').length;
  const remainingCount = boardTasks.length - completedCount;
  const progressPercent = boardTasks.length ? Math.round((completedCount / boardTasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Your tasks</h1>
          <p className="text-sm text-muted">Break things down into manageable steps.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => openTaskEditor()}
          className="flex items-center gap-2 rounded-xl bg-wellness-sage-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-wellness-sage-600"
        >
          <Plus className="h-4 w-4" />
          Add task
        </motion.button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#3A3453] bg-[#211D32] px-4 py-3 text-white shadow-card sm:flex-row sm:items-center">
        <div className="shrink-0">
          <p className="text-xs font-bold uppercase tracking-wide text-white/45">Your progress</p>
          <p className="mt-0.5 text-sm font-semibold">
            {remainingCount ? `${remainingCount} item${remainingCount === 1 ? '' : 's'} left to complete` : boardTasks.length ? 'Everything is complete — well done!' : 'Nothing scheduled for today'}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between text-[0.65rem] text-white/50">
            <span>{completedCount} of {boardTasks.length} done</span><span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/25">
            <motion.div initial={false} animate={{ width: `${progressPercent}%` }} className="h-full rounded-full bg-wellness-sage-500" />
          </div>
        </div>
      </div>

      <SmartScheduler tasks={tasks} onChanged={loadTasks} />

      {/* Kanban */}
      <div className="grid gap-5 md:grid-cols-3">
        {columns.map((col) => {
          const colTasks = boardTasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className={`rounded-2xl border ${col.ring} ${col.color} p-4`}>
              <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
                <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className="text-sm font-bold text-white">{col.label}</span>
                <span className="ml-auto rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold text-white/70">{colTasks.length}</span>
              </div>

              <div className="space-y-3 min-h-[80px]">
                {colTasks.map((task) => (
                  <motion.div
                    key={task.boardId || task._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-white/10 bg-[#13111C] p-4 shadow-card transition-shadow hover:border-white/20 hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold leading-snug text-white">{task.title}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => openTaskEditor(task)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/5 hover:text-wellness-sage-300" aria-label={`Edit ${task.title}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(task._id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${task.title}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[0.65rem]">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-semibold capitalize text-white/60">{task.workType || 'homework'}</span>
                      <span className="text-white/50">{task.estimatedMinutes || 60} min</span>
                    </div>
                    {task.subject && <p className="mb-2 text-xs text-white/50">{task.subject}</p>}
                    {task.dueAt && (
                      <p className="mb-2 text-xs text-white/50">
                        Due {new Date(task.dueAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {task.scheduledStart && (
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-wellness-sky-300">
                        <Clock3 className="h-3.5 w-3.5" />
                        Today, {scheduledTime(task.scheduledStart)}–{scheduledTime(task.scheduledEnd)}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${priorityStyle[task.priority] || priorityStyle.low}`}>
                        {task.priority}
                      </span>
                      <select
                        value={task.status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(task, e.target.value)}
                        className="rounded-lg border border-white/10 bg-[#211D32] px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="todo">To Do</option>
                        <option value="doing">Doing</option>
                        <option value="done">Done</option>
                      </select>
                    </div>

                    <button
                      onClick={() => loadStudyTips(task._id)}
                      className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-wellness-sage-400/30 bg-wellness-sage-500/10 py-1.5 text-xs font-semibold text-wellness-sage-300 transition hover:bg-wellness-sage-500/20"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      Get study tips
                    </button>
                  </motion.div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 py-6">
                    <span className="text-xs font-medium text-white/40">No tasks here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Study Tips Modal */}
      <Modal
        isOpen={selectedTaskForTips !== null}
        onClose={() => { setSelectedTaskForTips(null); setStudySuggestions([]); }}
        title={`Study tips: ${selectedTaskForTips?.title || ''}`}
      >
        <div className="space-y-4">
          {isLoadingSuggestions ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-wellness-sage-500" />
              <p className="text-sm text-muted">Generating tips just for you…</p>
            </div>
          ) : studySuggestions.length > 0 ? (
            <>
              <p className="text-sm text-muted">Here are some study methods that might help:</p>
              {studySuggestions.map((s, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-alt p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-text">{s.method}</p>
                    <span className="rounded-full border border-wellness-sky-200 bg-wellness-sky-50 px-2 py-0.5 text-xs font-medium text-wellness-sky-700">{s.timeEstimate}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{s.description}</p>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center py-8 gap-2">
              <Circle className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">No suggestions available</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={isModalOpen} onClose={resetTaskForm} title={editingTask ? 'Edit task' : 'Add a task'}>
        <div className="space-y-4">
          <Input label="Task title" value={newTask.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Complete Math homework" />
          <Input label="Subject (optional)" value={newTask.subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask((p) => ({ ...p, subject: e.target.value }))} placeholder="Mathematics" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-text">Type of work</label>
              <select value={newTask.workType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTask((p) => ({ ...p, workType: e.target.value, dueAt: e.target.value === 'revision' ? '' : p.dueAt }))} className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm text-text focus:border-wellness-sage-400 focus:outline-none">
                <option value="homework">Homework</option>
                <option value="revision">Revision</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-text">Total minutes needed</label>
              <input type="number" min="15" step="15" value={newTask.estimatedMinutes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask((p) => ({ ...p, estimatedMinutes: Number(e.target.value) }))} className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm text-text focus:border-wellness-sage-400 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
              className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm text-text focus:border-wellness-sage-400 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          {newTask.workType === 'homework' && <Input label="Due date (optional)" type="datetime-local" value={newTask.dueAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask((p) => ({ ...p, dueAt: e.target.value }))} />}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={resetTaskForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!newTask.title} className="bg-wellness-sage-500 text-white hover:bg-wellness-sage-600">
              {editingTask ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
