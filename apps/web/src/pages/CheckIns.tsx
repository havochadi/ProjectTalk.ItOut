import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, TextArea } from '@talkitout/ui'; // eslint-disable-line
import { checkInAPI } from '../api/client';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '@talkitout/ui';
import { Heart, CalendarHeart, Sparkles } from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';

const moods = [
  { value: 1, emoji: '😢', label: 'Very low',    ring: 'border-wellness-lavender-300 ring-wellness-lavender-200', bg: 'bg-wellness-lavender-50' },
  { value: 2, emoji: '😕', label: 'Not great',   ring: 'border-wellness-peach-300 ring-wellness-peach-200',       bg: 'bg-wellness-peach-50' },
  { value: 3, emoji: '😐', label: 'Okay',         ring: 'border-wellness-sky-300 ring-wellness-sky-200',           bg: 'bg-wellness-sky-50' },
  { value: 4, emoji: '🙂', label: 'Good',         ring: 'border-wellness-sage-300 ring-wellness-sage-200',         bg: 'bg-wellness-sage-50' },
  { value: 5, emoji: '😄', label: 'Great!',       ring: 'border-wellness-sage-400 ring-wellness-sage-300',         bg: 'bg-wellness-sage-100' },
];

export const CheckInsPage: React.FC = () => {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { loadCheckIns(); }, []);

  const loadCheckIns = async () => {
    try {
      const res = await checkInAPI.getMine({ days: 30 });
      setCheckIns(res.data.checkIns);
    } catch { toast.error('Failed to load check-ins'); }
  };

  const handleSubmit = async () => {
    if (!mood) { toast.error('Please select a mood'); return; }
    setIsSubmitting(true);
    try {
      await checkInAPI.create({ mood, note: note || undefined });
      toast.success('Check-in saved! 💚');
      setMood(null);
      setNote('');
      loadCheckIns();
    } catch { toast.error('Failed to save check-in'); }
    finally { setIsSubmitting(false); }
  };

  const selectedMood = moods.find((m) => m.value === mood);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-wellness-sage-500 shadow-glow">
          <Heart className="h-7 w-7 text-white" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-text">How are you feeling?</h1>
        <p className="mt-2 text-sm text-muted">Checking in with yourself is a small act of self-care.</p>
      </motion.div>

      {/* Mood selector card */}
      <div className="card-wellness p-6">
        <p className="mb-5 text-sm font-semibold text-text">Select your mood right now:</p>
        <div className="flex justify-center gap-3 mb-6">
          {moods.map((m) => (
            <motion.button
              key={m.value}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-5 py-4 transition-all ${
                mood === m.value
                  ? `${m.ring} ${m.bg} ring-2 shadow-card-hover`
                  : 'border-border bg-surface hover:border-wellness-sage-200'
              }`}
            >
              <span className="text-4xl">{m.emoji}</span>
              <span className="text-xs font-semibold text-text">{m.label}</span>
            </motion.button>
          ))}
        </div>

        {mood && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-wellness-sage-100 bg-wellness-sage-50 px-4 py-3 text-sm text-wellness-sage-700">
              <Sparkles className="mr-1.5 inline h-4 w-4" />
              {selectedMood?.emoji} You're feeling <strong>{selectedMood?.label?.toLowerCase()}</strong> today.
              {mood <= 2 && " That's okay — you showed up for yourself."}
              {mood >= 4 && " Lovely to hear! Keep nurturing that energy."}
            </div>

            <TextArea
              label="Anything on your mind? (optional)"
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              placeholder="What's going on today? No pressure…"
              rows={3}
            />

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                className="rounded-xl bg-wellness-sage-500 px-6 py-2.5 font-semibold text-white hover:bg-wellness-sage-600"
              >
                Save check-in
              </Button>
            </div>
          </motion.div>
        )}

        {!mood && (
          <p className="text-center text-xs text-muted">Tap a mood above to continue</p>
        )}
      </div>

      {/* History */}
      <div className="card-wellness p-6">
        <SectionHeader icon={CalendarHeart} title="Your mood history" description="Last 30 days" />

        {checkIns.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted">No check-ins yet. Your first one is above! 💚</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {checkIns.map((ci, idx) => {
              const m = moods.find((m) => m.value === ci.mood);
              return (
                <motion.div
                  key={ci._id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface-alt px-4 py-3 transition hover:border-wellness-sage-200"
                >
                  <span className="text-2xl">{m?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-text">{m?.label}</span>
                      <span className="shrink-0 text-xs text-muted">{formatRelativeTime(ci.createdAt)}</span>
                    </div>
                    {ci.note && (
                      <p className="mt-1 text-xs text-muted italic leading-relaxed">"{ci.note}"</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
