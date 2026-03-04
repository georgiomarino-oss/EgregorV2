import { supabase } from '../supabase';
import { clientEnv } from '../env';

export interface GeneratePrayerScriptInput {
  intention: string;
  length?: 'short' | 'medium' | 'long';
  mood?: string;
}

export interface GeneratePrayerScriptOutput {
  script: string;
}

export interface GeneratePrayerAudioInput {
  script: string;
  voiceId?: string;
}

export interface TimedWord {
  endSeconds: number;
  index: number;
  startSeconds: number;
  word: string;
}

export interface GeneratePrayerAudioOutput {
  audioBase64?: string;
  audioUrl?: string;
  contentType?: string;
  voiceId?: string;
  wordTimings?: TimedWord[];
}

export interface GeneratedNewsDrivenEvent {
  category: string;
  duration_minutes: number;
  event_day: string;
  headline: string;
  id: string;
  script_text: string;
  source_title: string | null;
  source_url: string;
  starts_at: string;
  summary: string;
}

export interface GenerateNewsDrivenEventsOutput {
  events: GeneratedNewsDrivenEvent[];
  generated: number;
  pulled?: number;
}

const DEFAULT_ELEVENLABS_VOICE_ID = 'jfIS2w2yJi0grJZPyEsk';

async function parseEdgeError(response: Response) {
  const text = await response.text();
  if (!text) {
    return `Edge function failed with status ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(text) as { detail?: string; error?: string; message?: string };
    return (
      parsed.detail?.trim() ||
      parsed.error?.trim() ||
      parsed.message?.trim() ||
      `Edge function failed with status ${response.status}.`
    );
  } catch {
    return text;
  }
}

async function invokeEdgeFunction<TOutput>(
  functionName: string,
  body: unknown,
): Promise<TOutput> {
  if (!clientEnv.supabaseUrl || !clientEnv.supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables in mobile/.env.');
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token?.trim();
  const authTokens = [accessToken, clientEnv.supabaseAnonKey].filter(
    (token, index, arr): token is string => Boolean(token && arr.indexOf(token) === index),
  );

  let lastError = 'Edge function request failed.';

  for (let index = 0; index < authTokens.length; index += 1) {
    const authToken = authTokens[index];
    if (!authToken) {
      continue;
    }

    const response = await fetch(`${clientEnv.supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: clientEnv.supabaseAnonKey,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return (await response.json()) as TOutput;
    }

    const detail = await parseEdgeError(response);
    lastError = detail;

    const canRetryWithNextToken =
      index < authTokens.length - 1 &&
      (response.status === 401 || detail.toLowerCase().includes('invalid jwt'));

    if (!canRetryWithNextToken) {
      break;
    }
  }

  throw new Error(lastError);
}

export async function generatePrayerScript(input: GeneratePrayerScriptInput) {
  const { data, error } = await supabase.functions.invoke<GeneratePrayerScriptOutput>(
    'generate-prayer-script',
    {
      body: input,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function generatePrayerAudio(input: GeneratePrayerAudioInput) {
  const payload: GeneratePrayerAudioInput = {
    ...input,
    voiceId: input.voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID,
  };

  return invokeEdgeFunction<GeneratePrayerAudioOutput>('generate-prayer-audio', payload);
}

export async function generateNewsDrivenEvents() {
  return invokeEdgeFunction<GenerateNewsDrivenEventsOutput>('generate-news-driven-events', {});
}
