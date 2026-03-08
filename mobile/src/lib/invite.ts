import type { PrayerCircleMember } from './api/data';
import type { CaptureNavigationTarget } from '../app/navigation/types';

const APP_SCHEME = 'egregorv2://';

function buildQueryString(params: Record<string, number | string | undefined>) {
  const entries = Object.entries(params)
    .map(([key, value]) => {
      if (value === undefined) {
        return null;
      }

      const normalized = `${value}`.trim();
      if (!normalized) {
        return null;
      }

      return `${encodeURIComponent(key)}=${encodeURIComponent(normalized)}`;
    })
    .filter((entry): entry is string => Boolean(entry));

  if (entries.length === 0) {
    return '';
  }

  return `?${entries.join('&')}`;
}

function buildInviteUrl(path: string, params: Record<string, number | string | undefined>) {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${APP_SCHEME}${normalizedPath}${buildQueryString(params)}`;
}

function parseDurationMinutes(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | null): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
}

function normalizeInvitePath(url: URL) {
  const host = url.hostname.trim().toLowerCase();
  const pathname = url.pathname.replace(/^\/+/, '').toLowerCase();
  if (host && pathname) {
    return `${host}/${pathname}`;
  }
  if (host) {
    return host;
  }
  return pathname;
}

function extractCircleInviteToken(url: URL): string | null {
  const host = url.hostname.trim();
  const pathSegments = url.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (host.toLowerCase() === 'invite' && pathSegments.length > 0) {
    return pathSegments[0] ?? null;
  }

  if (host.length === 0 && pathSegments[0]?.toLowerCase() === 'invite' && pathSegments[1]) {
    return pathSegments[1];
  }

  const tokenFromQuery = url.searchParams.get('token')?.trim();
  return tokenFromQuery || null;
}

export function parseInviteCaptureTarget(urlValue: string): CaptureNavigationTarget | null {
  const normalizedUrl = urlValue.trim();
  if (!normalizedUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return null;
  }

  if (parsedUrl.protocol.toLowerCase() !== 'egregorv2:') {
    return null;
  }

  const normalizedPath = normalizeInvitePath(parsedUrl);
  if (normalizedPath === 'invite' || normalizedPath.startsWith('invite/')) {
    const inviteToken = extractCircleInviteToken(parsedUrl);
    if (!inviteToken) {
      return null;
    }

    return {
      communityParams: { inviteToken },
      communityRoute: 'InviteDecision',
      root: 'main',
      tab: 'CommunityTab',
    };
  }

  if (normalizedPath === 'solo/live') {
    const sharedSessionId = parsedUrl.searchParams.get('sharedSessionId')?.trim();
    if (!sharedSessionId) {
      return null;
    }

    const soloParams: NonNullable<CaptureNavigationTarget['soloParams']> = {
      sharedSessionId,
    };
    const allowAudioGeneration = parseBoolean(parsedUrl.searchParams.get('allowAudioGeneration'));
    const durationMinutes = parseDurationMinutes(parsedUrl.searchParams.get('durationMinutes'));
    const intention = parsedUrl.searchParams.get('intention')?.trim();
    const prayerLibraryItemId = parsedUrl.searchParams.get('prayerLibraryItemId')?.trim();
    const scriptPreset = parsedUrl.searchParams.get('scriptPreset')?.trim();
    if (allowAudioGeneration !== undefined) {
      soloParams.allowAudioGeneration = allowAudioGeneration;
    }
    if (durationMinutes !== undefined) {
      soloParams.durationMinutes = durationMinutes;
    }
    if (intention) {
      soloParams.intention = intention;
    }
    if (prayerLibraryItemId) {
      soloParams.prayerLibraryItemId = prayerLibraryItemId;
    }
    if (scriptPreset) {
      soloParams.scriptPreset = scriptPreset;
    }

    return {
      root: 'main',
      soloParams,
      soloRoute: 'SoloLive',
      tab: 'SoloTab',
    };
  }

  if (normalizedPath.startsWith('live/occurrence/')) {
    const occurrenceId = normalizedPath.slice('live/occurrence/'.length).trim();
    if (!occurrenceId) {
      return null;
    }

    return {
      eventDetailsParams: {
        occurrenceId,
      },
      eventsRoute: 'EventDetails',
      root: 'main',
      tab: 'EventsTab',
    };
  }

  if (normalizedPath.startsWith('room/')) {
    const roomId = normalizedPath.slice('room/'.length).trim();
    if (!roomId) {
      return null;
    }

    return {
      eventRoomParams: {
        roomId,
      },
      eventsRoute: 'EventRoom',
      root: 'main',
      tab: 'EventsTab',
    };
  }

  if (normalizedPath === 'events/room') {
    const eventRoomParams: NonNullable<CaptureNavigationTarget['eventRoomParams']> = {};
    const allowAudioGeneration = parseBoolean(parsedUrl.searchParams.get('allowAudioGeneration'));
    const durationMinutes = parseDurationMinutes(parsedUrl.searchParams.get('durationMinutes'));
    const occurrenceId = parsedUrl.searchParams.get('occurrenceId')?.trim();
    const occurrenceKey = parsedUrl.searchParams.get('occurrenceKey')?.trim();
    const roomId = parsedUrl.searchParams.get('roomId')?.trim();
    const hasCanonicalTarget = Boolean(occurrenceId || occurrenceKey || roomId);
    const eventId = parsedUrl.searchParams.get('eventId')?.trim();
    const rawEventSource = parsedUrl.searchParams.get('eventSource');
    const eventSource =
      rawEventSource === 'news' ||
      rawEventSource === 'template' ||
      rawEventSource === 'occurrence'
        ? rawEventSource
        : undefined;
    const eventTemplateId = parsedUrl.searchParams.get('eventTemplateId')?.trim();
    const eventTitle = parsedUrl.searchParams.get('eventTitle')?.trim();
    const scheduledStartAt = parsedUrl.searchParams.get('scheduledStartAt')?.trim();
    const scriptText = parsedUrl.searchParams.get('scriptText')?.trim();
    if (allowAudioGeneration !== undefined) {
      eventRoomParams.allowAudioGeneration = allowAudioGeneration;
    }
    if (durationMinutes !== undefined) {
      eventRoomParams.durationMinutes = durationMinutes;
    }
    if (!hasCanonicalTarget && eventId) {
      eventRoomParams.eventId = eventId;
    }
    if (!hasCanonicalTarget && eventSource) {
      eventRoomParams.eventSource = eventSource;
    }
    if (!hasCanonicalTarget && eventTemplateId) {
      eventRoomParams.eventTemplateId = eventTemplateId;
    }
    if (eventTitle) {
      eventRoomParams.eventTitle = eventTitle;
    }
    if (occurrenceId) {
      eventRoomParams.occurrenceId = occurrenceId;
    }
    if (occurrenceKey) {
      eventRoomParams.occurrenceKey = occurrenceKey;
    }
    if (roomId) {
      eventRoomParams.roomId = roomId;
    }
    if (scheduledStartAt) {
      eventRoomParams.scheduledStartAt = scheduledStartAt;
    }
    if (scriptText) {
      eventRoomParams.scriptText = scriptText;
    }

    return {
      eventRoomParams,
      eventsRoute: 'EventRoom',
      root: 'main',
      tab: 'EventsTab',
    };
  }

  return null;
}

export function buildCircleInviteUrl(inviteToken: string) {
  return buildInviteUrl(`invite/${inviteToken.trim()}`, {});
}

function summarizeCircleMembers(members: PrayerCircleMember[]) {
  if (members.length === 0) {
    return 'Your circle is currently empty, so this will share externally.';
  }

  const memberNames = members
    .map((member) => member.displayName.trim())
    .filter((displayName) => displayName.length > 0);

  if (memberNames.length === 0) {
    return `${members.length} circle members can be invited from this link.`;
  }

  const previewNames = memberNames.slice(0, 3);
  const remainingCount = memberNames.length - previewNames.length;
  if (remainingCount > 0) {
    return `Circle context: ${previewNames.join(', ')} + ${remainingCount} more.`;
  }

  return `Circle context: ${previewNames.join(', ')}.`;
}

interface SoloInviteInput {
  durationMinutes: number;
  intention: string;
  prayerLibraryItemId?: string;
  sharedSessionId?: string;
}

interface EventInviteInput {
  durationMinutes?: number;
  eventId?: string;
  eventSource?: 'news' | 'occurrence' | 'template';
  eventTemplateId?: string;
  eventTitle: string;
  occurrenceId?: string;
  occurrenceKey?: string;
  roomId?: string;
  scheduledStartAt?: string;
}

export function buildSoloInviteUrl(input: SoloInviteInput) {
  return buildInviteUrl('solo/live', {
    durationMinutes: input.durationMinutes,
    intention: input.intention,
    prayerLibraryItemId: input.prayerLibraryItemId,
    sharedSessionId: input.sharedSessionId,
  });
}

export function buildEventInviteUrl(input: EventInviteInput) {
  const roomId = input.roomId?.trim();
  if (roomId) {
    return buildInviteUrl(`room/${roomId}`, {});
  }

  const occurrenceId = input.occurrenceId?.trim();
  if (occurrenceId) {
    return buildInviteUrl(`live/occurrence/${occurrenceId}`, {});
  }

  const hasCanonicalTarget = Boolean(
    occurrenceId || input.occurrenceKey?.trim() || roomId,
  );

  return buildInviteUrl('events/room', {
    durationMinutes: input.durationMinutes,
    eventId: hasCanonicalTarget ? undefined : input.eventId,
    eventSource: hasCanonicalTarget ? undefined : input.eventSource,
    eventTemplateId: hasCanonicalTarget ? undefined : input.eventTemplateId,
    eventTitle: input.eventTitle,
    occurrenceId: input.occurrenceId,
    occurrenceKey: input.occurrenceKey,
    roomId: input.roomId,
    scheduledStartAt: input.scheduledStartAt,
  });
}

export function buildSoloInviteMessage(input: SoloInviteInput & { members: PrayerCircleMember[] }) {
  const title = input.intention.trim() || 'Solo Prayer';
  const inviteUrl = buildSoloInviteUrl(input);
  const memberSummary = summarizeCircleMembers(input.members);

  return [
    `Join me in a solo prayer on Egregor: ${title}.`,
    memberSummary,
    `Invite link: ${inviteUrl}`,
  ].join('\n');
}

export function buildSoloShareMessage(input: SoloInviteInput) {
  const title = input.intention.trim() || 'Solo Prayer';
  const inviteUrl = buildSoloInviteUrl(input);

  return [`Join me in a solo prayer on Egregor: ${title}.`, `Invite link: ${inviteUrl}`].join('\n');
}

export function buildEventInviteMessage(
  input: EventInviteInput & { members: PrayerCircleMember[] },
) {
  const title = input.eventTitle.trim() || 'Live Room';
  const inviteUrl = buildEventInviteUrl(input);
  const memberSummary = summarizeCircleMembers(input.members);

  return [
    `Join me in a live Egregor room: ${title}.`,
    memberSummary,
    `Invite link: ${inviteUrl}`,
  ].join('\n');
}

export function buildEventShareMessage(input: EventInviteInput) {
  const title = input.eventTitle.trim() || 'Live Room';
  const inviteUrl = buildEventInviteUrl(input);

  return [`Join me in a live Egregor room: ${title}.`, `Invite link: ${inviteUrl}`].join('\n');
}
