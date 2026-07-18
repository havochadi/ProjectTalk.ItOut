import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const action = request.headers.get('x-talkitout-action') || 'config';
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const defaultVoiceId = Deno.env.get('ELEVENLABS_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM';

    if (action === 'config') {
      return json({ enabled: Boolean(apiKey), defaultVoiceId });
    }
    if (!apiKey) return json({ error: 'ELEVENLABS_API_KEY is not configured' }, 503);

    if (action === 'voices') {
      const upstream = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
      });
      if (!upstream.ok) return json({ error: `ElevenLabs voices failed (${upstream.status})` }, 502);
      const data = await upstream.json();
      const voices = (data.voices || []).map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        preview_url: v.preview_url,
        category: v.category,
      }));
      return json({ voices });
    }

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

    return json({ error: 'Unknown voice action' }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Voice request failed' }, 500);
  }
});
