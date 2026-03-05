import {
  fetchEventLibraryItems,
  fetchEvents,
  fetchNewsDrivenEvents,
  fetchPrayerLibraryItems,
} from './api/data';
import { prefetchPrayerAudio } from './api/functions';

const AUDIO_ARTIFACT_PREFETCH_LIMIT = 10;
const artifactPrefetchRequests = new Map<string, Promise<void>>();

function normalizeScript(script: string | null | undefined) {
  return (script ?? '').replace(/\s+/g, ' ').trim();
}

function buildFallbackEventScript(input: {
  description?: string | null;
  hostNote?: string | null;
}) {
  return [input.description?.trim(), input.hostNote?.trim()]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('\n\n')
    .trim();
}

function addScriptPrefetchTarget(
  targets: Map<
    string,
    {
      allowGeneration: boolean;
      durationMinutes?: number;
      title?: string;
    }
  >,
  input: {
    allowGeneration: boolean;
    durationMinutes?: number;
    script: string | null | undefined;
    title?: string;
  },
  limit = AUDIO_ARTIFACT_PREFETCH_LIMIT,
) {
  const normalized = normalizeScript(input.script);
  if (!normalized) {
    return;
  }

  const existing = targets.get(normalized);
  if (existing) {
    if (input.allowGeneration) {
      existing.allowGeneration = true;
    }
    return;
  }

  if (targets.size >= limit) {
    return;
  }

  targets.set(normalized, {
    allowGeneration: input.allowGeneration,
    ...(typeof input.durationMinutes === 'number'
      ? { durationMinutes: input.durationMinutes }
      : {}),
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
  });
}

export function prefetchEventAndPrayerAudioArtifacts(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  if (artifactPrefetchRequests.has(normalizedUserId)) {
    return;
  }

  const request = (async () => {
    const [prayerLibraryResult, eventLibraryResult, newsEventsResult, eventsResult] =
      await Promise.allSettled([
        fetchPrayerLibraryItems(),
        fetchEventLibraryItems(80),
        fetchNewsDrivenEvents(80),
        fetchEvents(40),
      ]);

    const prefetchTargets = new Map<
      string,
      {
        allowGeneration: boolean;
        durationMinutes?: number;
        title?: string;
      }
    >();

    if (prayerLibraryResult.status === 'fulfilled') {
      for (const item of prayerLibraryResult.value.slice(0, 3)) {
        prefetchPrayerAudio({
          allowGeneration: false,
          durationMinutes: item.durationMinutes,
          language: 'en',
          prayerLibraryItemId: item.id,
          script: item.body,
          title: item.title,
        });
      }
    }

    if (eventLibraryResult.status === 'fulfilled') {
      for (const item of eventLibraryResult.value.slice(0, 4)) {
        addScriptPrefetchTarget(prefetchTargets, {
          allowGeneration: false,
          durationMinutes: item.durationMinutes,
          script: item.script || item.body,
          title: item.title,
        });
      }
    }

    if (newsEventsResult.status === 'fulfilled') {
      for (const item of newsEventsResult.value.slice(0, 3)) {
        addScriptPrefetchTarget(prefetchTargets, {
          allowGeneration: true,
          durationMinutes: item.durationMinutes,
          script: item.script,
          title: item.title,
        });
      }
    }

    if (eventsResult.status === 'fulfilled') {
      for (const event of eventsResult.value.slice(0, 3)) {
        addScriptPrefetchTarget(prefetchTargets, {
          allowGeneration: false,
          durationMinutes: event.durationMinutes,
          script: buildFallbackEventScript({
            description: event.description,
            hostNote: event.hostNote,
          }),
          title: event.title,
        });
      }
    }

    for (const [script, target] of prefetchTargets.entries()) {
      prefetchPrayerAudio({
        allowGeneration: target.allowGeneration,
        ...(typeof target.durationMinutes === 'number'
          ? { durationMinutes: target.durationMinutes }
          : {}),
        language: 'en',
        script,
        ...(target.title ? { title: target.title } : {}),
      });
    }
  })().finally(() => {
    artifactPrefetchRequests.delete(normalizedUserId);
  });

  artifactPrefetchRequests.set(normalizedUserId, request);
}
