import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextArea } from '@talkitout/ui';
import { chatAPI, checkInAPI } from '../api/client';
import toast from 'react-hot-toast';
import { Mic, MicOff, Send, VolumeX, Heart, Phone, X, Sparkles } from 'lucide-react';
import { MessageBubble } from '../components/MessageBubble';
import { AvatarCanvas } from '../components/avatar/AvatarCanvas';
import { CHARACTERS, getCharacter } from '../components/avatar/characters';
import { useAuth } from '../contexts/AuthContext';
import { getPreference, setPreference } from '../store/userPrefs';
import {
  initializeVoiceClient, isVoiceEnabled, startBrowserRecognition,
  isBrowserSpeechSupported, speak, stopAllSpeech,
} from '../lib/voiceClient';

const moods = [
  { value: 5, emoji: '😄', label: 'Great!',      color: 'border-wellness-sage-300 hover:bg-wellness-sage-50 hover:text-wellness-sage-900' },
  { value: 4, emoji: '😊', label: 'Pretty good', color: 'border-wellness-sage-200 hover:bg-wellness-sage-50 hover:text-wellness-sage-900' },
  { value: 3, emoji: '😐', label: 'Just okay',   color: 'border-wellness-sky-200 hover:bg-wellness-sky-50 hover:text-wellness-sky-900' },
  { value: 2, emoji: '😕', label: 'Not great',   color: 'border-wellness-lavender-200 hover:bg-wellness-lavender-50 hover:text-wellness-lavender-900' },
  { value: 1, emoji: '😰', label: 'Struggling',  color: 'border-wellness-peach-200 hover:bg-wellness-peach-50 hover:text-wellness-peach-900' },
];

const suggestedPrompts = [
  "I'm feeling stressed today",
  'Can we just talk?',
  'I need help organizing',
  'How can I feel better?',
];

const chatPanelStyle = {
  height: 'calc(100vh - 260px)',
  minHeight: '420px',
};

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [stopRecordingFn, setStopRecordingFn] = useState<(() => Promise<string>) | null>(null);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [characterId, setCharacterId] = useState(() => getPreference('characterId'));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
    initVoice();
    checkTodayMood();
    const saved = localStorage.getItem('autoPlayVoice');
    if (saved !== null) {
      setAutoPlayVoice(saved === 'true');
    } else {
      localStorage.setItem('autoPlayVoice', 'true');
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 && !hasCheckedInToday) setShowMoodSelector(true);
  }, [messages, hasCheckedInToday]);

  const checkTodayMood = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const res = await checkInAPI.getMine({ startDate: today.toISOString(), limit: 1 });
      setHasCheckedInToday(res.data.checkIns?.length > 0);
    } catch {
      // A missing check-in should not prevent chat from loading.
    }
  };

  const initVoice = async () => {
    try { await initializeVoiceClient(); setVoiceEnabled(isVoiceEnabled()); } catch {
      // Voice is optional; text chat remains available.
    }
  };

  const loadHistory = async () => {
    try {
      const res = await chatAPI.getHistory({ limit: 50 });
      setMessages(res.data.messages);
    } catch {
      // Start with an empty history when the history request is unavailable.
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear all chat messages? This cannot be undone.')) return;
    try {
      await chatAPI.clearHistory();
      setMessages([]);
      setShowMoodSelector(true);
      setHasCheckedInToday(false);
      toast.success('Chat cleared');
    } catch { toast.error('Failed to clear chat'); }
  };

  const handleMoodSelect = async (moodValue: number, moodLabel: string) => {
    setShowMoodSelector(false);
    try {
      await checkInAPI.create({ mood: moodValue });
      setHasCheckedInToday(true);
      await handleSend(`I'm feeling ${moodLabel.toLowerCase()}`);
    } catch {
      toast.error('Failed to save mood');
      setShowMoodSelector(true);
    }
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;
    setInput('');
    setIsLoading(true);
    try {
      const res = await chatAPI.sendMessage(text);
      const { userMessage: savedUser, aiMessage } = res.data;

      if (savedUser.severity >= 3) {
        setShowCrisisAlert(true);
        setTimeout(() => setShowCrisisAlert(false), 15000);
      }

      setMessages((prev) => [...prev, { ...savedUser, role: 'user' }, { ...aiMessage, role: 'assistant' }]);

      if (autoPlayVoice && voiceEnabled) {
        setIsAssistantSpeaking(true);
        void speak(aiMessage.text, getCharacter(characterId).voiceId)
          .catch(() => undefined)
          .finally(() => setIsAssistantSpeaking(false));
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = async () => {
    if (!isBrowserSpeechSupported() && !isRecordingAudio) {
      toast.error('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (isRecordingAudio) {
      if (stopRecordingFn) {
        setIsLoading(true);
        try {
          const transcript = await stopRecordingFn();
          setIsRecordingAudio(false);
          setStopRecordingFn(null);
          if (transcript?.length > 3) {
            await handleSend(transcript);
          } else if (transcript) {
            setInput(transcript);
            toast.success('Transcribed! Edit or send.');
          } else {
            toast.error('No speech detected');
          }
        } catch { toast.error('Failed to transcribe audio'); }
        finally { setIsLoading(false); }
      }
    } else {
      try {
        const stopFn = await startBrowserRecognition((t) => setInput(t));
        setStopRecordingFn(() => stopFn);
        setIsRecordingAudio(true);
        toast.success('Listening… Speak now', { duration: 2000, icon: '🎙️' });
      } catch (error: any) {
        toast.error(error.message?.includes('not-allowed') ? 'Microphone access denied' : (error.message || 'Failed to start'));
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex min-w-0 items-stretch gap-5">
        {/* ── Avatar Panel ────────────────────────────────────── */}
        <div className="hidden w-72 shrink-0 flex-col gap-2 xl:flex" style={chatPanelStyle}>
          <div className="relative min-h-0 flex-1">
            <AvatarCanvas
              isSpeaking={isAssistantSpeaking}
              characterId={characterId}
              className="!h-full !min-h-0 rounded-3xl border border-border shadow-card"
              style={{ minHeight: 0 }}
            />
          </div>
          <div className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-2 py-2 shadow-card">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCharacterId(c.id); setPreference('characterId', c.id); }}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold uppercase transition ${
                  characterId === c.id
                    ? 'border-wellness-sage-400 bg-wellness-sage-50 text-wellness-sage-700'
                    : 'border-border bg-surface-alt text-muted hover:border-wellness-sage-200 hover:text-wellness-sage-600'
                }`}
                style={characterId === c.id ? { borderColor: c.color } : undefined}
                title={c.name}
                aria-label={`Switch companion to ${c.name}`}
                aria-pressed={characterId === c.id}
              >
                {c.name.slice(0, 1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat Area ──────────────────────────────────────── */}
        <div className="flex h-[calc(100dvh-7rem)] min-h-[30rem] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card sm:h-[calc(100dvh-9rem)] sm:rounded-3xl" style={{ maxHeight: '760px' }}>

          {/* Chat Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-glow"
                style={{ backgroundColor: getCharacter(characterId).color }}
              >
                <Heart className="h-5 w-5 text-white" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">{getCharacter(characterId).name}</h2>
                <p className="text-xs text-muted">Always here to listen</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAssistantSpeaking && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { stopAllSpeech(); setIsAssistantSpeaking(false); }}
                  className="flex items-center gap-1.5 rounded-xl border border-wellness-sage-200 bg-wellness-sage-50 px-3 py-1.5 text-xs font-semibold text-wellness-sage-700"
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  Stop
                </motion.button>
              )}
              <button
                onClick={handleClearChat}
                className="min-h-10 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-alt hover:text-text"
              >
                Clear chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.04),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(123,111,173,0.04),transparent_60%)] px-3 py-4 sm:px-6 sm:py-5">

            {/* Mood selector */}
            {showMoodSelector && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="w-full rounded-3xl rounded-tl-lg border border-border bg-surface px-4 py-4 shadow-card sm:max-w-[85%] sm:px-5">
                  <div className="mb-1 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-wellness-sage-500" fill="currentColor" />
                    <span className="text-xs font-semibold text-wellness-sage-600 uppercase tracking-wide">Check-in</span>
                  </div>
                  <p className="mb-4 text-sm font-semibold text-text">How are you feeling right now?</p>
                  <div className="flex flex-wrap gap-2">
                    {moods.map((mood) => (
                      <motion.button
                        key={mood.value}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleMoodSelect(mood.value, mood.label)}
                        className={`flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium text-text transition ${mood.color}`}
                      >
                        <span className="text-base">{mood.emoji}</span>
                        <span>{mood.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Crisis Alert */}
            <AnimatePresence>
              {showCrisisAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.97 }}
                  className="relative rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-orange-50 p-5 shadow-lg"
                >
                  <button
                    onClick={() => setShowCrisisAlert(false)}
                    className="absolute right-3 top-3 rounded-full p-1 text-red-500 hover:bg-red-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-red-800">
                    <Phone className="h-5 w-5" /> Need immediate support?
                  </h3>
                  <p className="mb-4 text-sm text-red-700">I'm here, but I'm not a crisis service. If you're in danger, please reach out:</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { href: 'tel:999',       label: 'Emergency',           num: '999',       color: 'red' },
                      { href: 'tel:1767',      label: 'Samaritans of SG',    num: '1767',      color: 'orange' },
                      { href: 'sms:91511767',  label: 'SOS CareText',        num: '9151 1767', color: 'amber' },
                    ].map(({ href, label, num, color }) => (
                      <a
                        key={href}
                        href={href}
                        className={`flex items-center gap-2 rounded-xl border border-${color}-200 bg-white px-3 py-2.5 text-sm font-semibold text-${color}-800 shadow-sm hover:shadow transition`}
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        <div>
                          <div>{label}</div>
                          <div className="text-xs font-bold">{num}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {messages.length === 0 && !showMoodSelector && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-5 text-center shadow-card sm:p-8"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-glow"
                  style={{ backgroundColor: getCharacter(characterId).color }}
                >
                  <Heart className="h-8 w-8 text-white" fill="currentColor" />
                </motion.div>
                <h3 className="mb-2 text-lg font-bold text-text">Hi {user?.name}, I'm {getCharacter(characterId).name}</h3>
                <p className="mb-6 text-sm text-muted leading-relaxed">
                  Whether you need to talk, vent, or just take a breath — this space is yours, no judgment.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <motion.button
                      key={prompt}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setInput(prompt)}
                      className="rounded-xl border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text transition hover:border-wellness-sage-300 hover:bg-wellness-sage-50 hover:text-wellness-sage-700"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg._id || msg.id || idx}
                  message={msg}
                  index={idx}
                  autoPlay={false}
                  onSpeechStateChange={setIsAssistantSpeaking}
                />
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && !isRecordingAudio && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wellness-sage-500">
                  <Heart className="h-4 w-4 text-white" fill="currentColor" />
                </div>
                <div className="rounded-3xl rounded-tl-lg border border-border bg-surface px-5 py-3.5 shadow-card">
                  <div className="flex gap-1.5">
                    {[0, 0.12, 0.24].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-wellness-sage-400" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-surface-alt px-4 py-3">
            <div className="flex items-end gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMicClick}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                  isRecordingAudio
                    ? 'border-red-300 bg-red-500 text-white shadow'
                    : 'border-border bg-surface text-muted hover:border-wellness-sage-300 hover:text-wellness-sage-600'
                }`}
                aria-label={isRecordingAudio ? 'Stop recording' : 'Start recording'}
              >
                {isRecordingAudio ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </motion.button>

              <TextArea
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={isRecordingAudio ? 'Recording… tap mic to stop' : "Share what's on your mind…"}
                className="min-h-11 max-h-[120px] min-w-0 flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-wellness-sage-400 focus:ring-1 focus:ring-wellness-sage-400 sm:px-4"
                disabled={isLoading || isRecordingAudio}
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading || isRecordingAudio}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wellness-sage-500 text-white shadow-glow transition hover:bg-wellness-sage-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
            <p className="mt-1.5 hidden text-center text-[0.65rem] text-muted sm:block">
              Press Enter to send · Shift+Enter for new line
              {voiceEnabled && ' · Mic for voice input'}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-2xl border border-wellness-sage-100 bg-wellness-sage-50 px-5 py-3.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-wellness-sage-500" />
        <p className="text-xs text-wellness-sage-700">
          <strong>Remember:</strong> I'm a support companion, not a crisis service. For immediate danger, call <strong>999</strong> or contact Samaritans of Singapore at <strong>1767</strong>.
        </p>
      </div>

    </div>
  );
};
