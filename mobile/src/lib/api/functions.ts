import { supabase } from '../supabase';

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

export interface GeneratePrayerAudioOutput {
  audioBase64?: string;
  audioUrl?: string;
  contentType?: string;
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
  const { data, error } = await supabase.functions.invoke<GeneratePrayerAudioOutput>(
    'generate-prayer-audio',
    {
      body: input,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}
