import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { pomodoroAPI } from '../api/client';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Timer, Coffee, Zap, Wind, BookOpen, Leaf } from 'lucide-react';

const phaseConfig = {
  focus:     { label: 'Focus time',   icon: Zap,    color: 'bg-wellness-sage-500',     ring: '#7B6CF6', emoji: '🎯' },
  break:     { label: 'Short break',  icon: Coffee,  color: 'bg-wellness-sky-500',      ring: '#6BA3C4', emoji: '☕' },
  longBreak: { label: 'Long break',   icon: Leaf,    color: 'bg-wellness-lavender-500', ring: '#B06FAD', emoji: '🌿' },
};

const mindfulActivities = [
  { icon: Wind,     label: 'Box Breathing (4-4-4-4)',   desc: '4 s in · 4 s hold · 4 s out · 4 s hold' },
  { icon: BookOpen, label: '5-4-3-2-1 Grounding',       desc: 'Name 5 things you can see' },
  { icon: Leaf,     label: 'Progressive Muscle Relax',  desc: 'Tense & release each muscle group' },
];

export const FocusPage: React.FC = () => {
  const { profile } = useAuth();
  const { socket } = useSocket();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [sessionType, setSessionType] = useState<'focus' | 'break' | 'longBreak'>('focus');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const prefs = profile?.preferences?.pomodoro || {
    focusDuration: 25, breakDuration: 5, longBreakDuration: 15, cyclesBeforeLongBreak: 4,
  };

  useEffect(() => {
    if (!isActive || isPaused || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { handlePhaseComplete(); return 0; }
        return prev - 1;
      });
      socket?.emit('pomodoro:tick', { timeLeft: timeLeft - 1 });
    }, 1000);
    return () => clearInterval(id);
  }, [isActive, isPaused, timeLeft, socket]);

  const handleStart = async () => {
    try {
      const res = await pomodoroAPI.start();
      setSessionId(res.data._id);
      setIsActive(true);
      setIsPaused(false);
      setSessionType('focus');
      setTimeLeft(prefs.focusDuration * 60);
      setCurrentCycle(0);
      socket?.emit('pomodoro:start', { sessionId: res.data._id });
      toast.success('Focus session started!');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to start'); }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    socket?.emit(isPaused ? 'pomodoro:resume' : 'pomodoro:pause', {});
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await pomodoroAPI.stop(currentCycle);
      setIsActive(false); setIsPaused(false); setSessionId(null);
      setTimeLeft(prefs.focusDuration * 60); setCurrentCycle(0); setSessionType('focus');
      socket?.emit('pomodoro:stop', { cyclesCompleted: currentCycle });
      toast.success(`Great work! ${currentCycle} cycle${currentCycle !== 1 ? 's' : ''} completed 🌟`);
    } catch { toast.error('Failed to stop session'); }
  };

  const handlePhaseComplete = () => {
    if (sessionType === 'focus') {
      const next = currentCycle + 1;
      setCurrentCycle(next);
      if (next >= prefs.cyclesBeforeLongBreak) {
        setSessionType('longBreak'); setTimeLeft(prefs.longBreakDuration * 60);
        toast.success('You earned a long break! 🌿', { icon: '🎉' });
      } else {
        setSessionType('break'); setTimeLeft(prefs.breakDuration * 60);
        toast.success('Short break time ☕');
      }
    } else {
      setSessionType('focus');
      setTimeLeft(prefs.focusDuration * 60);
      if (sessionType === 'longBreak') setCurrentCycle(0);
      toast.success('Ready for the next focus session? 🎯');
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const total =
    sessionType === 'focus' ? prefs.focusDuration * 60 :
    sessionType === 'break' ? prefs.breakDuration * 60 :
    prefs.longBreakDuration * 60;

  const progress = (total - timeLeft) / total;
  const r = 120;
  const circ = 2 * Math.PI * r;
  const phase = phaseConfig[sessionType];
  const PhasIcon = phase.icon;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-text">Focus & Breathe</h1>
        <p className="mt-2 text-muted">Structured focus helps calm the mind. Take it one session at a time.</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Timer */}
        <div className="md:col-span-2 card-wellness p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${phase.color}`}>
              <PhasIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">Phase</p>
              <p className="text-sm font-bold text-text">{phase.emoji} {phase.label}</p>
            </div>
            <div className="ml-auto text-sm text-muted">
              Cycle {currentCycle + 1} / {prefs.cyclesBeforeLongBreak}
            </div>
          </div>

          {/* Circle timer */}
          <div className="flex flex-col items-center">
            <motion.div
              animate={isActive && !isPaused && sessionType === 'focus'
                ? { scale: [1, 1.015, 1] }
                : { scale: 1 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative mb-8"
              style={{ width: 280, height: 280 }}
            >
              <svg className="h-full w-full -rotate-90" viewBox="0 0 280 280">
                <defs>
                  <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={phase.ring} />
                    <stop offset="100%" stopColor={phase.ring} stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle cx="140" cy="140" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
                {/* Progress */}
                <circle
                  cx="140" cy="140" r={r}
                  fill="none"
                  stroke="url(#focusGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - progress)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tracking-tight text-text">{fmt(timeLeft)}</span>
                {isPaused && <span className="mt-1 text-sm font-medium text-muted">Paused</span>}
                {!isActive && <span className="mt-1 text-sm text-muted">Ready to begin</span>}
              </div>
            </motion.div>

            {/* Controls */}
            <div className="flex gap-3">
              {!isActive ? (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleStart}
                  className="flex items-center gap-2 rounded-full bg-[#13111C] px-8 py-3 font-bold text-white transition hover:bg-wellness-sage-700"
                >
                  <Timer className="h-5 w-5" />
                  Start session
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={handlePause}
                    className="rounded-2xl border border-border bg-surface px-6 py-3 font-semibold text-text transition hover:bg-surface-alt"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={handleStop}
                    className="rounded-2xl border border-red-200 bg-red-50 px-6 py-3 font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    End
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Settings */}
          <div className="card-wellness p-5">
            <p className="mb-3 text-sm font-bold text-text">Session settings</p>
            <div className="space-y-2">
              {[
                { label: 'Focus', val: prefs.focusDuration },
                { label: 'Break', val: prefs.breakDuration },
                { label: 'Long break', val: prefs.longBreakDuration },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-surface-alt px-3 py-2">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-sm font-bold text-text">{val} min</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mindful activities */}
          <div className="card-wellness p-5">
            <p className="mb-3 text-sm font-bold text-text">Mindful break ideas</p>
            <div className="space-y-2">
              {mindfulActivities.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-alt px-3 py-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-wellness-sage-500" />
                  <div>
                    <p className="text-xs font-semibold text-text">{label}</p>
                    <p className="text-[0.65rem] text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
