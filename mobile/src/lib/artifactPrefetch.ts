import {
  fetchEventOccurrenceContent,
  fetchPrayerLibraryItems,
  listEventFeed,
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
      voiceId?: string;
      title?: string;
    }
  >,
  input: {
    allowGeneration: boolean;
    durationMinutes?: number;
    script: string | null | undefined;
    voiceId?: string;
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
    ...(input.voiceId?.trim() ? { voiceId: input.voiceId.trim() } : {}),
    ...(input.title?.trim() ? { title: input.title.trim() } : {}),
  });
}

function resolveSeriesVoiceId(seriesMetadata: Record<string, unknown> | null | undefined) {
  if (!seriesMetadata || typeof seriesMetadata !== 'object') {
    return null;
  }

  const voiceRecommendation = seriesMetadata.voice_recommendation;
  if (!voiceRecommendation || typeof voiceRecommendation !== 'object') {
    return null;
  }

  const voiceId =
    'voice_id' in voiceRecommendation && typeof voiceRecommendation.voice_id === 'string'
      ? voiceRecommendation.voice_id.trim()
      : '';
  return voiceId || null;
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
    const [prayerLibraryResult, eventFeedResult] = await Promise.allSettled([
      fetchPrayerLibraryItems(),
      listEventFeed({ horizonHours: 72 }),
    ]);

    const prefetchTargets = new Map<
      string,
      {
        allowGeneration: boolean;
        durationMinutes?: number;
        voiceId?: string;
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

    if (eventFeedResult.status === 'fulfilled') {
      const prioritizedOccurrences = eventFeedResult.value
        .slice()
        .sort((left, right) => {
          if (left.status === right.status) {
            return new Date(left.startsAtUtc).getTime() - new Date(right.startsAtUtc).getTime();
          }

          if (left.status === 'live') {
            return -1;
          }
          if (right.status === 'live') {
            return 1;
          }
          if (left.status === 'scheduled') {
            return -1;
          }
          if (right.status === 'scheduled') {
            return 1;
          }
          return 0;
        })
        .slice(0, AUDIO_ARTIFACT_PREFETCH_LIMIT);

      const occurrenceContentRows = await Promise.allSettled(
        prioritizedOccurrences.map(async (occurrence) => {
          const content = await fetchEventOccurrenceContent(occurrence.occurrenceId);
          return {
            content,
            occurrence,
          };
        }),
      );

      for (const row of occurrenceContentRows) {
        if (row.status !== 'fulfilled') {
          continue;
        }

        const content = row.value.content;
        const occurrence = row.value.occurrence;
        const fallbackVoiceId = resolveSeriesVoiceId(occurrence.seriesMetadata);
        const script =
          content?.scriptText ||
          buildFallbackEventScript({
            description: occurrence.seriesDescription,
            hostNote: occurrence.seriesPurpose,
          });

        addScriptPrefetchTarget(prefetchTargets, {
          allowGeneration: false,
          durationMinutes: content?.durationMinutes ?? occurrence.durationMinutes,
          script,
          title: occurrence.seriesName,
          ...(content?.voiceId || fallbackVoiceId
            ? { voiceId: content?.voiceId ?? fallbackVoiceId ?? '' }
            : {}),
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
        ...(target.voiceId ? { voiceId: target.voiceId } : {}),
        ...(target.title ? { title: target.title } : {}),
      });
    }
  })().finally(() => {
    artifactPrefetchRequests.delete(normalizedUserId);
  });

  artifactPrefetchRequests.set(normalizedUserId, request);
}
