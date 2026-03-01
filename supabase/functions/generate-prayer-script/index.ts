import OpenAI from 'npm:openai@4.104.0';

import { corsHeaders } from '../_shared/cors.ts';

interface PrayerScriptRequest {
  intention?: string;
  length?: 'short' | 'medium' | 'long';
  mood?: string;
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

  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiApiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  let payload: PrayerScriptRequest;

  try {
    payload = (await request.json()) as PrayerScriptRequest;
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const intention = payload.intention?.trim();
  if (!intention) {
    return new Response(JSON.stringify({ error: 'intention is required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const length = payload.length ?? 'medium';
  const mood = payload.mood?.trim() || 'grounded, hopeful, and compassionate';

  try {
    const openai = new OpenAI({ apiKey: openAiApiKey });

    const response = await openai.responses.create({
      input: [
        {
          role: 'system',
          content:
            'You are an assistant for spiritual reflection. Write safe, non-harmful prayer text with inclusive language.',
        },
        {
          role: 'user',
          content: `Create a ${length} prayer script in a ${mood} tone for this intention: ${intention}. Keep it practical and emotionally supportive.`,
        },
      ],
      model: 'gpt-4.1-mini',
      temperature: 0.7,
    });

    const script = response.output_text?.trim();

    if (!script) {
      return new Response(JSON.stringify({ error: 'No script content returned by OpenAI' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    return new Response(JSON.stringify({ script }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown OpenAI error';

    return new Response(JSON.stringify({ error: 'OpenAI request failed', detail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 502,
    });
  }
});
