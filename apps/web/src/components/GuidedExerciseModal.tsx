import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Ear, Eye, Flower2, Hand, Pause, Play, RotateCcw, Utensils, X } from 'lucide-react';

type Exercise = 'breathing' | 'grounding';

const breathingPhases = [
  { label: 'Breathe in', hint: 'Slowly through your nose', scale: 1.45, color: '#7B6CF6' },
  { label: 'Hold', hint: 'Stay relaxed', scale: 1.45, color: '#6BA3C4' },
  { label: 'Breathe out', hint: 'Slowly through your mouth', scale: 1, color: '#9B8ECE' },
  { label: 'Hold', hint: 'Rest before the next breath', scale: 1, color: '#6D9D93' },
];

const groundingSteps = [
  { count: 5, sense: 'see', prompt: 'things you can see', helper: 'Look around slowly. Notice colors, shapes, or small details.', icon: Eye, color: 'bg-wellness-sage-500' },
  { count: 4, sense: 'feel', prompt: 'things you can feel', helper: 'Notice your feet, clothes, chair, or the air on your skin.', icon: Hand, color: 'bg-wellness-sky-500' },
  { count: 3, sense: 'hear', prompt: 'things you can hear', helper: 'Listen for nearby and distant sounds.', icon: Ear, color: 'bg-wellness-lavender-500' },
  { count: 2, sense: 'smell', prompt: 'things you can smell', helper: 'Notice the air, your clothes, food, or another nearby scent.', icon: Flower2, color: 'bg-wellness-peach-500' },
  { count: 1, sense: 'taste', prompt: 'thing you can taste', helper: 'Notice a current taste, or name one taste you enjoy.', icon: Utensils, color: 'bg-wellness-neutral-600' },
];

const BoxBreathingGuide: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cycles, setCycles] = useState(0);
  const phase = breathingPhases[phaseIndex];

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;
        setPhaseIndex((index) => {
          if (index === breathingPhases.length - 1) setCycles((value) => value + 1);
          return (index + 1) % breathingPhases.length;
        });
        return 4;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const reset = () => {
    setIsRunning(false);
    setPhaseIndex(0);
    setSecondsLeft(4);
    setCycles(0);
  };

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm text-muted">Follow the circle for four gentle cycles, or stop whenever you feel ready.</p>

      <div className="relative my-8 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
        <div className="absolute inset-3 rounded-full border border-wellness-sage-200 bg-wellness-sage-50/50" />
        <motion.div
          animate={{
            scale: !isRunning && phaseIndex === 0 && secondsLeft === 4 && cycles === 0 ? 1 : phase.scale,
            backgroundColor: phase.color,
          }}
          transition={{ duration: phaseIndex === 0 || phaseIndex === 2 ? 4 : 0.35, ease: 'easeInOut' }}
          className="flex h-32 w-32 items-center justify-center rounded-full shadow-glow"
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white" aria-live="polite">
          <span className="text-lg font-bold drop-shadow">{phase.label}</span>
          <span className="mt-1 text-4xl font-extrabold drop-shadow">{secondsLeft}</span>
        </div>
      </div>

      <p className="min-h-6 text-sm font-medium text-text">{phase.hint}</p>
      <div className="mt-4 flex items-center gap-2" aria-label={`Breathing phase ${phaseIndex + 1} of 4`}>
        {breathingPhases.map((item, index) => (
          <span key={`${item.label}-${index}`} className={`h-2 rounded-full transition-all ${index === phaseIndex ? 'w-8 bg-wellness-sage-500' : 'w-2 bg-border'}`} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Completed cycles: {cycles}</p>

      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={() => setIsRunning((value) => !value)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-wellness-sage-500 px-6 text-sm font-bold text-white hover:bg-wellness-sage-600"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? 'Pause' : cycles || phaseIndex ? 'Continue' : 'Start breathing'}
        </button>
        <button type="button" onClick={reset} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-text">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>
    </div>
  );
};

const GroundingGuide: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [entries, setEntries] = useState<string[][]>(() => groundingSteps.map(() => []));
  const [value, setValue] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const step = groundingSteps[stepIndex];
  const Icon = step.icon;
  const currentEntries = entries[stepIndex];

  const addEntry = () => {
    const clean = value.trim();
    if (!clean || currentEntries.length >= step.count) return;
    setEntries((all) => all.map((items, index) => index === stepIndex ? [...items, clean] : items));
    setValue('');
  };

  const continueToNext = () => {
    setValue('');
    if (stepIndex === groundingSteps.length - 1) setIsComplete(true);
    else setStepIndex((index) => index + 1);
  };

  const reset = () => {
    setStepIndex(0);
    setEntries(groundingSteps.map(() => []));
    setValue('');
    setIsComplete(false);
  };

  if (isComplete) {
    return (
      <div className="py-6 text-center">
        <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-wellness-sage-100 text-wellness-sage-700">
          <Check className="h-10 w-10" />
        </motion.div>
        <h3 className="mt-5 text-xl font-bold text-text">You’re here, in this moment</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">Take one slow breath. Notice whether your body feels even slightly more settled than when you began.</p>
        <button type="button" onClick={reset} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-muted hover:bg-surface-alt hover:text-text">
          <RotateCcw className="h-4 w-4" /> Do it again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2" aria-label={`Grounding step ${stepIndex + 1} of 5`}>
        {groundingSteps.map((item, index) => (
          <span key={item.sense} className={`h-2 flex-1 rounded-full ${index <= stepIndex ? 'bg-wellness-sage-500' : 'bg-border'}`} />
        ))}
      </div>

      <div className="text-center">
        <motion.div key={step.sense} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white ${step.color}`}>
          <Icon className="h-8 w-8" />
        </motion.div>
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className="text-5xl font-extrabold text-wellness-sage-500">{step.count}</span>
          <h3 className="text-lg font-bold text-text">{step.prompt}</h3>
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{step.helper}</p>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); addEntry(); }} className="mx-auto mt-6 flex max-w-lg flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface-alt px-4 text-sm text-text placeholder:text-muted focus:border-wellness-sage-400 focus:outline-none focus:ring-1 focus:ring-wellness-sage-400"
          placeholder={`I can ${step.sense}…`}
          autoFocus
        />
        <button type="submit" disabled={!value.trim() || currentEntries.length >= step.count} className="min-h-12 rounded-xl bg-wellness-sage-500 px-5 text-sm font-bold text-white hover:bg-wellness-sage-600 disabled:opacity-50">
          Add
        </button>
      </form>

      <div className="mx-auto mt-4 flex min-h-10 max-w-lg flex-wrap justify-center gap-2">
        <AnimatePresence>
          {currentEntries.map((entry, index) => (
            <motion.span key={`${entry}-${index}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="rounded-full border border-wellness-sage-200 bg-wellness-sage-50 px-3 py-1.5 text-xs font-medium text-wellness-sage-800">
              {index + 1}. {entry}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={continueToNext}
          disabled={currentEntries.length < step.count}
          className="min-h-12 w-full rounded-xl bg-[#13111C] px-6 text-sm font-bold text-white hover:bg-wellness-sage-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {stepIndex === groundingSteps.length - 1 ? 'Finish grounding' : 'Continue'}
        </button>
        <button type="button" onClick={continueToNext} className="min-h-10 px-3 text-xs font-semibold text-muted hover:text-text">Skip this sense</button>
      </div>
    </div>
  );
};

export const GuidedExerciseModal: React.FC<{ exercise: Exercise | null; onClose: () => void }> = ({ exercise, onClose }) => {
  useEffect(() => {
    if (!exercise) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handleKey);
    };
  }, [exercise, onClose]);

  return (
    <AnimatePresence>
      {exercise && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.section
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            role="dialog"
            aria-modal="true"
            aria-label={exercise === 'breathing' ? 'Guided box breathing' : 'Guided grounding exercise'}
            className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <header className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-wellness-sage-500">Guided exercise</p>
                <h2 className="mt-1 text-xl font-bold text-text">{exercise === 'breathing' ? 'Box Breathing' : '5-4-3-2-1 Grounding'}</h2>
              </div>
              <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:bg-surface-alt hover:text-text" aria-label="Close exercise">
                <X className="h-5 w-5" />
              </button>
            </header>
            {exercise === 'breathing' ? <BoxBreathingGuide /> : <GroundingGuide />}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
