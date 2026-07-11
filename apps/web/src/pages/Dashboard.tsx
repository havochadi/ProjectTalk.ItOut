import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, MessageCircle, Smile, Target, Timer, TrendingUp,
  Sparkles, CalendarDays, CheckSquare, Heart,
} from 'lucide-react';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { useAuth } from '../contexts/AuthContext';
import { checkInAPI, taskAPI } from '../api/client';

const moodEmojis: Record<number, { emoji: string; label: string; color: string }> = {
  5: { emoji: '😄', label: 'Great',     color: 'text-wellness-sage-500' },
  4: { emoji: '😊', label: 'Good',      color: 'text-wellness-sage-400' },
  3: { emoji: '😐', label: 'Okay',      color: 'text-wellness-sky-500' },
  2: { emoji: '😕', label: 'Low',       color: 'text-wellness-peach-500' },
  1: { emoji: '😰', label: 'Struggling',color: 'text-wellness-lavender-500' },
};

const quickActions = [
  {
    to: '/app/chat',
    label: 'Talk to companion',
    sub: 'Share how you feel',
    icon: MessageCircle,
    cardBg: 'bg-[#C8C4F8]',
    iconBg: 'bg-wellness-sage-600/20',
    iconColor: 'text-wellness-sage-800',
    textColor: 'text-wellness-sage-900',
  },
  {
    to: '/app/checkins',
    label: 'Log your mood',
    sub: 'Track your wellbeing',
    icon: Smile,
    cardBg: 'bg-[#F0C4D4]',
    iconBg: 'bg-pink-600/15',
    iconColor: 'text-pink-800',
    textColor: 'text-pink-900',
  },
  {
    to: '/app/focus',
    label: 'Focus session',
    sub: 'Pomodoro timer',
    icon: Timer,
    cardBg: 'bg-[#C4DCF4]',
    iconBg: 'bg-sky-600/15',
    iconColor: 'text-sky-800',
    textColor: 'text-sky-900',
  },
  {
    to: '/app/tasks',
    label: 'Your to-dos',
    sub: 'Manage your tasks',
    icon: CheckSquare,
    cardBg: 'bg-[#C8F0D0]',
    iconBg: 'bg-green-600/15',
    iconColor: 'text-green-800',
    textColor: 'text-green-900',
  },
];

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [checkInsRes, tasksRes, statsRes] = await Promise.all([
        checkInAPI.getMine({ days: 7 }),
        taskAPI.getAll(),
        checkInAPI.getStats(),
      ]);
      setCheckIns(checkInsRes.data.checkIns);
      setTasks(tasksRes.data.tasks);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const todayTasks = tasks.filter((t) => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt).toDateString() === new Date().toDateString();
  });

  const streaks = profile?.streaks || [];
  const checkInStreak = streaks.find((s: any) => s.type === 'checkin')?.count || 0;
  const focusStreak   = streaks.find((s: any) => s.type === 'focus')?.count || 0;
  const avgMood       = stats?.averageMood?.toFixed(1) || '–';

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    'Good evening';

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-[#13111C] px-8 py-10 text-white"
      >
        {/* Background decoration */}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-wellness-sage-600/30 blur-3xl" />
        <div className="absolute -bottom-12 left-1/3 h-56 w-56 rounded-full bg-[#E86FA0]/15 blur-3xl" />

        <div className="relative z-10">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {greeting}, {user?.name} 👋
          </h1>
          <p className="mt-2 max-w-lg text-white/70 text-sm leading-relaxed">
            Your wellbeing matters. Take it one step at a time — this space is always here for you.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/app/chat"
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#13111C] shadow-sm transition hover:bg-wellness-sage-50"
            >
              Start talking <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app/checkins"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/15"
            >
              Log today's mood
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickActions.map(({ to, label, sub, icon: Icon, cardBg, iconBg, iconColor, textColor }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
          >
            <Link
              to={to}
              className={`group flex flex-col gap-3 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-card ${cardBg}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${textColor}`}>{label}</p>
                <p className={`text-xs ${textColor} opacity-70`}>{sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: 'Avg Mood', value: `${avgMood}/5`, color: 'text-wellness-sage-600', bg: 'bg-wellness-sage-50' },
          { icon: Heart,      label: 'Check-in streak', value: `${checkInStreak} days`, color: 'text-pink-500', bg: 'bg-pink-50' },
          { icon: Timer,      label: 'Focus streak',    value: `${focusStreak} days`,  color: 'text-sky-500', bg: 'bg-sky-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-surface border border-border rounded-2xl flex items-center gap-4 p-5 shadow-card">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted">{label}</p>
              <p className="text-lg font-bold text-text">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom two-col */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's tasks */}
        <Card className="space-y-4">
          <SectionHeader icon={Target} title="Today's priorities" description={
            todayTasks.length > 0
              ? `${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''} to work through`
              : 'No tasks due today — great time to recharge.'
          } />
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task) => (
                <div key={task._id} className="flex items-center justify-between rounded-xl border border-border bg-surface-alt px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      task.priority === 'high' ? 'bg-wellness-peach-500' :
                      task.priority === 'med'  ? 'bg-wellness-lavender-400' :
                      'bg-wellness-sage-300'
                    }`} />
                    <span className={`text-sm ${task.status === 'done' ? 'text-muted line-through' : 'font-medium text-text'}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className="text-xs capitalize text-muted">{task.priority}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-wellness-sage-300" />
              <p className="text-sm text-muted">Take a breath. No urgent tasks today.</p>
            </div>
          )}
          <Link to="/app/tasks" className="flex items-center gap-1 text-sm font-semibold text-wellness-sage-600 hover:text-wellness-sage-700 transition-colors">
            View all tasks <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* Recent check-ins */}
        <Card className="space-y-4">
          <SectionHeader icon={CalendarDays} title="Recent check-ins" description="How you've been feeling this week" />
          <div className="space-y-2">
            {checkIns.slice(0, 4).map((entry) => {
              const mood = moodEmojis[entry.mood] || moodEmojis[3];
              return (
                <div key={entry._id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3">
                  <span className="text-xl">{mood.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {new Date(entry.createdAt).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <p className={`text-xs font-medium ${mood.color}`}>{mood.label}</p>
                  </div>
                  {entry.note && (
                    <p className="hidden sm:block max-w-[120px] truncate text-xs text-muted">{entry.note}</p>
                  )}
                </div>
              );
            })}
            {checkIns.length === 0 && (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted">Log your first mood check-in to start tracking.</p>
              </div>
            )}
          </div>
          <Link to="/app/checkins" className="flex items-center gap-1 text-sm font-semibold text-wellness-sage-600 hover:text-wellness-sage-700 transition-colors">
            View check-in history <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
};
