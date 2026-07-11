import FormData from 'form-data';

export const isVoiceEnabled = (): boolean => {
  return Boolean(process.env.ELEVENLABS_API_KEY);
};

/**
 * Synthesizes speech from text using ElevenLabs TTS
 * @param text - The text to convert to speech
 * @param voiceId - Optional voice ID (defaults to env ELEVENLABS_VOICE_ID)
 * @returns Audio buffer
 */
export async function synthesizeSpeech(text: string, voiceId?: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for speech synthesis');
  }

  const apiBase = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';
  const targetVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const latency = process.env.ELEVENLABS_TTS_LATENCY || '2';
  const format = process.env.ELEVENLABS_TTS_FORMAT || 'audio/mpeg';
  const url = `${apiBase}/v1/text-to-speech/${targetVoiceId}/stream?optimize_streaming_latency=${latency}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      Accept: format,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.trim(),
      voice_settings: {
        stability: 0.7,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
/**
 * Transcribes audio to text using ElevenLabs STT
 * @param fileBuffer - The audio file buffer
 * @param mimeType - The MIME type of the audio file (e.g., 'audio/webm', 'audio/wav')
 * @returns Transcribed text
 */
export async function transcribeAudio(fileBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Audio file is required for transcription');
  }

  // Estimate duration and enforce MAX_STT_SECONDS
  // Rough estimation: for webm/opus at 48kbps, ~6KB per second
  const estimatedDurationSeconds = fileBuffer.length / 6000;
  const maxDurationSeconds = parseInt(process.env.MAX_STT_SECONDS || '60', 10);
  if (estimatedDurationSeconds > maxDurationSeconds) {
    throw new Error(`Audio file is too long. Maximum duration is ${maxDurationSeconds} seconds.`);
  }

  // ElevenLabs Speech-to-Text API endpoint
  const apiBase = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';
  const url = `${apiBase}/v1/speech-to-text`;

  // Determine file extension from MIME type
  let extension = 'webm';
  if (mimeType.includes('wav')) extension = 'wav';
  else if (mimeType.includes('m4a')) extension = 'm4a';
  else if (mimeType.includes('mp3')) extension = 'mp3';
  else if (mimeType.includes('mpeg')) extension = 'mp3';
  else if (mimeType.includes('ogg')) extension = 'ogg';
  else if (mimeType.includes('opus')) extension = 'webm';

  const formData = new FormData();
  formData.append('file', fileBuffer, {
    filename: `audio.${extension}`,
    contentType: mimeType,
  });
  formData.append('model', process.env.ELEVENLABS_STT_MODEL || 'eleven_multilingual_v2');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      ...formData.getHeaders(),
    },
    body: formData as any,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs STT failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as { text?: string };

  // ElevenLabs STT returns { text: "..." }
  if (!result.text) {
    throw new Error('No transcription returned from ElevenLabs');
  }

  return result.text.trim();
}
