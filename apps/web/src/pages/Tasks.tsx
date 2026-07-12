import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Modal } from '@talkitout/ui';
import { taskAPI } from '../api/client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Lightbulb, CheckCircle, Circle, Loader2, TrendingUp, Pencil } from 'lucide-react';
import { SmartScheduler } from '../components/SmartScheduler';

interface StudySuggestion {
  method: string;
  description: string;
  timeEstimate: string;
}

interface TaskSummary {
  overview: string;
  totalTasks: number;
  completionRate: number;
  suggestions: string[];
  motivationalMessage: string;
}

const columns = [
  { status: 'todo',  label: 'To Do',  color: 'bg-wellness-sage-50', ring: 'border-wellness-sage-200',  dot: 'bg-wellness-sage-300' },
  { status: 'doing', label: 'Doing',  color: 'bg-wellness-sky-50',  ring: 'border-wellness-sky-200',   dot: 'bg-wellness-sky-400' },
  { status: 'done',  label: 'Done',   color: 'bg-wellness-lavender-50', ring: 'border-wellness-lavender-200', dot: 'bg-wellness-lavender-400' },
];

const priorityStyle: Record<string, string> = {
  high: 'border-wellness-peach-300 bg-wellness-peach-50 text-wellness-peach-700',
  med:  'border-wellness-sky-300 bg-wellness-sky-50 text-wellness-sky-700',
  low:  'border-wellness-sage-300 bg-wellness-sage-50 text-wellness-sage-700',
};

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', subject: '', priority: 'med', dueAt: '', workType: 'homework', estimatedMinutes: 60 });
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [selectedTaskForTips, setSelectedTaskForTips] = useState<any | null>(null);
  const [studySuggestions, setStudySuggestions] = useState<StudySuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const res = await taskAPI.getAll();
      const payload = res?.data?.tasks ?? res?.data ?? [];
      setTasks(Array.isArray(payload) ? payload : []);
      loadSummary();
    } catch { toast.error('Failed to load tasks'); setTasks([]); }
  };

  const loadSummary = async () => {
    try {
      const res = await taskAPI.getSummary();
      setTaskSummary(res?.data?.summary ?? res?.data ?? null);
    } catch {
      // The task board remains usable when the optional summary is unavailable.
    }
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

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await taskAPI.updateStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
      loadSummary();
    } catch { toast.error('Failed to update task'); }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success('Task removed');
    } catch { toast.error('Failed to delete task'); }
  };

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

      <SmartScheduler tasks={tasks} onChanged={loadTasks} />

      {/* Kanban */}
      <div className="grid gap-5 md:grid-cols-3">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className={`rounded-2xl border ${col.ring} ${col.color} p-4`}>
              <div className="mb-4 flex items-center gap-2 border-b border-wellness-neutral-800/15 pb-3">
                <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className="text-sm font-bold text-wellness-neutral-900">{col.label}</span>
                <span className="ml-auto rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-wellness-neutral-700 shadow-sm">{colTasks.length}</span>
              </div>

              <div className="space-y-3 min-h-[80px]">
                {colTasks.map((task) => (
                  <motion.div
                    key={task._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="rounded-xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-text leading-snug">{task.title}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => openTaskEditor(task)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-alt hover:text-wellness-sage-500" aria-label={`Edit ${task.title}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(task._id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-500" aria-label={`Delete ${task.title}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[0.65rem]">
                      <span className="rounded-full border border-border bg-surface-alt px-2 py-0.5 font-semibold capitalize text-muted">{task.workType || 'homework'}</span>
                      <span className="text-muted">{task.estimatedMinutes || 60} min</span>
                    </div>
                    {task.subject && <p className="mb-2 text-xs text-muted">{task.subject}</p>}
                    {task.dueAt && (
                      <p className="mb-2 text-xs text-muted">
                        Due {new Date(task.dueAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${priorityStyle[task.priority] || priorityStyle.low}`}>
                        {task.priority}
                      </span>
                      <select
                        value={task.status}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(task._id, e.target.value)}
                        className="rounded-lg border border-border bg-surface-alt px-2 py-1 text-xs text-text focus:outline-none"
                      >
                        <option value="todo">To Do</option>
                        <option value="doing">Doing</option>
                        <option value="done">Done</option>
                      </select>
                    </div>

                    <button
                      onClick={() => loadStudyTips(task._id)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-wellness-sage-50 border border-wellness-sage-200 py-1.5 text-xs font-semibold text-wellness-sage-700 transition hover:bg-wellness-sage-100"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      Get study tips
                    </button>
                  </motion.div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-wellness-neutral-700/30 bg-white/20 py-6">
                    <span className="text-xs font-medium text-wellness-neutral-700">No tasks here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      {taskSummary && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-wellness p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-wellness-sage-500" />
            <h2 className="text-base font-bold text-text">Progress overview</h2>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              { label: 'Total tasks', val: taskSummary.totalTasks, color: 'text-wellness-sage-600' },
              { label: 'Completed', val: `${taskSummary.completionRate}%`, color: 'text-wellness-lavender-600' },
              { label: 'Your note', val: '💬', color: 'text-wellness-sky-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl bg-surface-alt border border-border p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-muted mt-1">{label}</p>
              </div>
            ))}
          </div>

          {taskSummary.motivationalMessage && (
            <div className="mb-4 rounded-xl border border-wellness-sage-100 bg-wellness-sage-50 px-4 py-3">
              <p className="text-sm text-wellness-sage-700 font-medium">{taskSummary.motivationalMessage}</p>
            </div>
          )}

          {taskSummary.suggestions?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Suggestions for you</p>
              <ul className="space-y-1.5">
                {taskSummary.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-wellness-sage-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

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
              <label className="mb-1.5 block text-sm font-semibold text-text">Time needed</label>
              <select value={newTask.estimatedMinutes} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTask((p) => ({ ...p, estimatedMinutes: Number(e.target.value) }))} className="w-full rounded-xl border border-border bg-surface-alt px-3 py-2.5 text-sm text-text focus:border-wellness-sage-400 focus:outline-none">
                <option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option>
              </select>
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
