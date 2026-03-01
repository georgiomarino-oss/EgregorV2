import { corsHeaders } from '../_shared/cors.ts';

interface PrayerAudioRequest {
  script?: string;
  voiceId?: string;
}

function toBase64(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!elevenLabsApiKey) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY is not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  let payload: PrayerAudioRequest;

  try {
    payload = (await request.json()) as PrayerAudioRequest;
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const script = payload.script?.trim();
  if (!script) {
    return new Response(JSON.stringify({ error: 'script is required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const voiceId = payload.voiceId?.trim() || 'EXAVITQu4vr4xnSDxMaL';

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey,
    },
    body: JSON.stringify({
      model_id: 'eleven_multilingual_v2',
      text: script,
      voice_settings: {
        similarity_boost: 0.7,
        stability: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: 'ElevenLabs request failed', detail: errorText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });
  }

  const audioBuffer = await response.arrayBuffer();
  const audioBase64 = toBase64(audioBuffer);

  return new Response(
    JSON.stringify({
      audioBase64,
      contentType: 'audio/mpeg',
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  );
});
