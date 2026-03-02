import OpenAI from 'npm:openai@4.104.0';

import { corsHeaders } from '../_shared/cors.ts';

interface PrayerScriptRequest {
  intention?: string;
  length?: 'short' | 'medium' | 'long';
  mood?: string;
}

const HYPHEN_LIKE_PATTERN = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g;
const SECTION_HEADING_PATTERN = /^(grounding|prayer|closing|opening|reflection)\s*:?$/i;

function sanitizeLineForSpeech(line: string): string {
  let cleaned = line.normalize('NFKC').replace(/\t/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  cleaned = cleaned.replace(/^#{1,6}\s+/, '');
  cleaned = cleaned.replace(/^(\*\*|__)+\s*/, '').replace(/\s*(\*\*|__)+$/, '');
  cleaned = cleaned.replace(/^([-*\u2022\u25CF\u25E6\u25AA\u25AB]|\d+[.)])\s+/, '');

  if (SECTION_HEADING_PATTERN.test(cleaned)) {
    return '';
  }

  cleaned = cleaned.replace(/[*_`~>|]/g, '');
  cleaned = cleaned.replace(/([A-Za-z])\s*\/\s*([A-Za-z])/g, '$1 and $2');
  cleaned = cleaned.replace(HYPHEN_LIKE_PATTERN, ' ');
  cleaned = cleaned.replace(/\s*-\s*/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\s+([,.;!?])/g, '$1');
  cleaned = cleaned.replace(/([,.;!?])\1+/g, '$1');

  return cleaned.trim();
}

function sanitizeScriptForSpeech(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const cleaned = sanitizeLineForSpeech(line);
    if (!cleaned) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' ').trim());
        currentParagraph = [];
      }
      continue;
    }

    currentParagraph.push(cleaned);
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' ').trim());
  }

  const normalizedParagraphs = paragraphs
    .map((paragraph) => {
      const collapsed = paragraph.replace(/\s+/g, ' ').trim();
      if (!collapsed) {
        return '';
      }

      return /[.?!]$/.test(collapsed) ? collapsed : `${collapsed}.`;
    })
    .filter(Boolean);

  return normalizedParagraphs.join('\n\n').trim();
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
            'You are an assistant for spiritual reflection. Write safe, non-harmful prayer text with inclusive language. Output spoken prose only. Do not use bullet points, numbered lists, markdown, section labels, or hyphenated list formatting.',
        },
        {
          role: 'user',
          content: `Create a ${length} prayer script in a ${mood} tone for this intention: ${intention}. Keep it practical and emotionally supportive. The script must read smoothly for voice narration.`,
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

    const sanitizedScript = sanitizeScriptForSpeech(script);
    if (!sanitizedScript) {
      return new Response(JSON.stringify({ error: 'Script content was empty after sanitization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    return new Response(JSON.stringify({ script: sanitizedScript }), {
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
