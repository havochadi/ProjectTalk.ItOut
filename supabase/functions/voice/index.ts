import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const action = request.headers.get('x-talkitout-action') || 'config';
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const defaultVoiceId = Deno.env.get('ELEVENLABS_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM';
    const maxRecordingSeconds = Number(Deno.env.get('MAX_STT_SECONDS') || 60);

    if (action === 'config') {
      return json({ enabled: Boolean(apiKey), defaultVoiceId, maxRecordingSeconds });
    }
    if (!apiKey) return json({ error: 'ELEVENLABS_API_KEY is not configured' }, 503);

    if (action === 'tts') {
      const body = await request.json();
      const text = String(body.text || '').trim();
      if (!text || text.length > 5000)
        return json({ error: 'Text must be between 1 and 5000 characters' }, 400);
      const voiceId = body.voiceId || defaultVoiceId;
      const upstream = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voice_settings: {
              stability: 0.7,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );
      if (!upstream.ok) return json({ error: `ElevenLabs TTS failed (${upstream.status})` }, 502);
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (action === 'stt') {
      const incoming = await request.formData();
      const file = incoming.get('file');
      if (!(file instanceof File)) return json({ error: 'Audio file is required' }, 400);
      if (file.size > maxRecordingSeconds * 12000)
        return json({ error: 'Audio recording is too long' }, 400);
      const outgoing = new FormData();
      outgoing.append('file', file, file.name || 'recording.webm');
      outgoing.append('model_id', Deno.env.get('ELEVENLABS_STT_MODEL') || 'scribe_v1');
      const upstream = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: outgoing,
      });
      const payload = await upstream.json();
      if (!upstream.ok)
        return json(
          { error: payload?.detail?.message || `ElevenLabs STT failed (${upstream.status})` },
          502
        );
      return json({ text: String(payload.text || '').trim() });
    }

    return json({ error: 'Unknown voice action' }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Voice request failed' }, 500);
  }
});
