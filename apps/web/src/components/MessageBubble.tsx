import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatRelativeTime } from '@talkitout/ui';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX, Loader2, Heart, ArrowRight, CheckSquare, Timer } from 'lucide-react';
import { speakWithBrowser } from '../lib/voiceClient';
import toast from 'react-hot-toast';

interface Message {
  id?: string;
  _id?: string;
  role: 'user' | 'assistant';
  text: string;
  sentiment?: string;
  severity?: number;
  createdAt: string | Date;
  featureSuggestion?: {
    id: 'tasks' | 'focus';
    label: string;
    path: string;
    description: string;
  } | null;
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  autoPlay?: boolean;
  onSpeechStateChange?: (isSpeaking: boolean) => void;
}

const sentimentConfig: Record<string, { label: string; color: string; bg: string }> = {
  pos: { label: 'Positive', color: 'text-wellness-sage-600',     bg: 'bg-wellness-sage-50 border-wellness-sage-200' },
  neu: { label: 'Neutral',  color: 'text-wellness-sky-600',      bg: 'bg-wellness-sky-50 border-wellness-sky-200' },
  neg: { label: 'Low mood', color: 'text-wellness-lavender-600', bg: 'bg-wellness-lavender-50 border-wellness-lavender-200' },
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message, index: _index, autoPlay, onSpeechStateChange,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);

  const notifySpeechState = (state: boolean) => {
    if (message.role === 'assistant') onSpeechStateChange?.(state);
  };

  const handleSpeak = async () => {
    if (isSpeakingThis) {
      window.speechSynthesis.cancel();
      setIsSpeakingThis(false);
      setIsPlayingAudio(false);
      notifySpeechState(false);
      return;
    }
    setIsPlayingAudio(true);
    setIsSpeakingThis(true);
    notifySpeechState(true);
    try {
      await speakWithBrowser(message.text);
    } catch (error: any) {
      toast.error(error?.message || 'Unable to play audio right now.', { duration: 4000 });
    } finally {
      setIsSpeakingThis(false);
      setIsPlayingAudio(false);
      notifySpeechState(false);
    }
  };

  React.useEffect(() => {
    if (autoPlay && message.role === 'assistant' && !isPlayingAudio) {
      const timer = setTimeout(() => {
        handleSpeak().catch(() => {});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, message.role]);

  const isUser = message.role === 'user';
  const sentiment = message.sentiment ? sentimentConfig[message.sentiment] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="mr-2.5 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wellness-sage-500 shadow-glow">
          <Heart className="h-4 w-4 text-white" fill="currentColor" />
        </div>
      )}

      <div className={`max-w-[88%] space-y-1 sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex min-w-0 flex-col`}>
        <div
          className={`max-w-full rounded-3xl px-4 py-3 leading-relaxed shadow-card sm:px-5 sm:py-3.5 ${
            isUser
              ? 'rounded-tr-lg bg-wellness-sage-500 text-white'
              : 'rounded-tl-lg border border-border bg-surface text-text'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
          {!isUser && message.featureSuggestion && (
            <Link
              to={message.featureSuggestion.path}
              className="mt-3 flex items-center gap-3 rounded-xl border border-wellness-sage-200 bg-wellness-sage-50 px-3 py-2.5 text-wellness-sage-900 transition hover:border-wellness-sage-300 hover:bg-wellness-sage-100"
            >
              {message.featureSuggestion.id === 'tasks'
                ? <CheckSquare className="h-4 w-4 shrink-0" />
                : <Timer className="h-4 w-4 shrink-0" />}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold">{message.featureSuggestion.label}</span>
                <span className="block text-[0.68rem] leading-snug text-wellness-sage-700">
                  {message.featureSuggestion.description}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[0.65rem] text-muted">{formatRelativeTime(message.createdAt)}</span>

          {isUser && sentiment && (
            <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${sentiment.bg} ${sentiment.color}`}>
              {sentiment.label}
            </span>
          )}

          {!isUser && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleSpeak}
              className={`rounded-full border p-1 transition ${
                isSpeakingThis
                  ? 'border-wellness-sage-400 bg-wellness-sage-100 text-wellness-sage-700'
                  : 'border-border bg-surface-alt text-muted hover:border-wellness-sage-300 hover:text-wellness-sage-600'
              }`}
              aria-label={isSpeakingThis ? 'Stop speaking' : 'Play audio'}
              disabled={isPlayingAudio && !isSpeakingThis}
            >
              {isPlayingAudio
                ? (isSpeakingThis
                    ? <VolumeX className="h-3.5 w-3.5" />
                    : <Loader2 className="h-3.5 w-3.5 animate-spin" />)
                : <Volume2 className="h-3.5 w-3.5" />}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
