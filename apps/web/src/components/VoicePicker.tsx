import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { voiceAPI } from '../api/client';

interface Voice {
  voice_id: string;
  name: string;
  preview_url: string | null;
  category?: string;
}

interface VoicePickerProps {
  value: string;
  onChange: (voiceId: string) => void;
}

export const VoicePicker: React.FC<VoicePickerProps> = ({ value, onChange }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await voiceAPI.listVoices();
        if (!cancelled) setVoices(res.data.voices || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { previewAudioRef.current?.pause(); }, []);

  const stopPreview = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPreviewingId(null);
  };

  const handlePreview = (voice: Voice) => {
    if (previewingId === voice.voice_id) { stopPreview(); return; }
    if (!voice.preview_url) return;
    previewAudioRef.current?.pause();
    const audio = new Audio(voice.preview_url);
    previewAudioRef.current = audio;
    setPreviewingId(voice.voice_id);
    audio.addEventListener('ended', () => setPreviewingId(null));
    audio.addEventListener('error', () => setPreviewingId(null));
    audio.play().catch(() => setPreviewingId(null));
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading voices…
      </div>
    );
  }

  if (error || voices.length === 0) {
    return (
      <label className="space-y-1.5 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Voice ID</span>
        <input
          className="w-full bg-surface text-text border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-wellness-sage-400 focus:border-wellness-sage-400 transition"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rachel"
        />
      </label>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {voices.map((voice) => {
        const isSelected = voice.voice_id === value;
        const isPreviewing = previewingId === voice.voice_id;
        return (
          <button
            key={voice.voice_id}
            type="button"
            onClick={() => onChange(voice.voice_id)}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition ${
              isSelected
                ? 'border-wellness-sage-400 bg-wellness-sage-50 text-wellness-sage-900'
                : 'border-border bg-surface text-text hover:border-wellness-sage-200 hover:bg-wellness-sage-50/50'
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{voice.name}</span>
              {voice.category && (
                <span className="block text-[0.65rem] font-normal uppercase tracking-wide text-muted">{voice.category}</span>
              )}
            </span>
            {voice.preview_url && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handlePreview(voice); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handlePreview(voice); } }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-alt text-muted hover:border-wellness-sage-300 hover:text-wellness-sage-600"
                aria-label={isPreviewing ? 'Stop preview' : 'Play preview'}
              >
                {isPreviewing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default VoicePicker;
