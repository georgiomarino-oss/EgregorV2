import { supabase } from '../supabase';
import {
  listNotificationPreferences,
  registerDevicePushTarget,
  saveOccurrenceReminderPreference,
  saveRoomReminderPreference,
  updateNotificationPreferences,
} from './notifications';

export type {
  CanonicalCircleSummary,
  CircleInviteAcceptResult,
  CircleInviteChannel,
  CircleInviteMutationResult,
  CircleInviteSummary,
  CircleInviteStatus,
  CircleMemberRecord,
  CircleMembershipRole,
  CircleMembershipStatus,
  InviteContextMember,
  InvitableUser,
} from './circles';
export {
  acceptCircleInvite,
  createCircleInvite,
  declineCircleInvite,
  listCircleMembers,
  listMyCircles,
  listPendingCircleInvites,
  listSharedWithMe,
  removeCircleMember,
  revokeCircleInvite,
  searchInvitableUsers,
  listInviteContextMembers,
  updateCircleMemberRole,
} from './circles';
export {
  listNotificationPreferences,
  registerDevicePushTarget,
  saveOccurrenceReminderPreference,
  saveRoomReminderPreference,
  updateNotificationPreferences,
} from './notifications';

export type EventStatus = 'live' | 'scheduled' | 'completed' | 'cancelled';
export type EventVisibility = 'public' | 'private';

interface SharedSoloSessionRow {
  created_at: string;
  duration_minutes: number;
  ended_at: string | null;
  host_user_id: string;
  id: string;
  intention: string;
  playback_position_ms: number;
  playback_state: SharedSoloSessionPlaybackState;
  prayer_library_item_id: string | null;
  script_text: string;
  started_at: string | null;
  status: SharedSoloSessionStatus;
  updated_at: string;
  voice_id: string;
}

interface SharedSoloSessionParticipantRow {
  is_active: boolean;
  joined_at: string;
  last_seen_at: string;
  role: SharedSoloSessionParticipantRole;
  session_id: string;
  user_id: string;
}

interface PrayerLibraryRow {
  body: string;
  category: string | null;
  duration_minutes: number | null;
  id: string;
  starts_count: number | null;
  title: string;
}

interface PrayerLibraryScriptRow {
  duration_minutes: number;
  id: string;
  language: string;
  prayer_library_item_id?: string;
  script_text: string;
}

interface ProfileRow {
  display_name: string | null;
  high_contrast_mode: boolean | null;
  id: string;
  preferred_ambient: string | null;
  preferred_breath_mode: string | null;
  preferred_session_minutes: number | null;
  preferred_voice_id: string | null;
  voice_enabled: boolean | null;
}

interface SoloSessionRow {
  completed_at: string | null;
  duration_seconds: number | null;
  id: string;
}

interface UserJournalEntryRow {
  content: string;
  created_at: string;
  id: string;
  updated_at: string;
}

interface UserEventSubscriptionRow {
  scope: 'all' | 'event';
  subscription_key: string;
}

interface AppUserPresenceRow {
  is_online: boolean;
  last_seen_at: string;
  user_id: string;
}

export interface AppEvent {
  countryCode: string | null;
  description: string | null;
  durationMinutes: number;
  hostNote: string | null;
  id: string;
  participants: number;
  region: string | null;
  startsAt: string;
  status: EventStatus;
  subtitle: string | null;
  title: string;
  visibility: EventVisibility;
}

export interface CommunityAlert {
  eventId: string;
  subtitle: string;
  title: string;
}

export interface CommunitySnapshot {
  alerts: CommunityAlert[];
  countries: number;
  events: AppEvent[];
  liveEvents: number;
  strongestLiveEventId: string | null;
  strongestLiveEventTitle: string | null;
  uniqueActiveParticipants: number;
}

export interface PrayerLibraryItem {
  body: string;
  category: string | null;
  durationMinutes: number;
  id: string;
  maxDurationMinutes: number;
  minDurationMinutes: number;
  startsCount: number;
  subtitle: string;
  title: string;
}

export type EventAccessMode = 'open' | 'circle_members' | 'invite_only';
export type EventVisibilityScope = 'global' | 'circle' | 'private';
export type EventOccurrenceStatus = 'cancelled' | 'ended' | 'live' | 'scheduled';
export type CanonicalEventRoomStatus = 'ended' | 'locked' | 'open';
export type CanonicalEventScheduleType =
  | 'admin_curated'
  | 'lunar_phase'
  | 'local_time_daily'
  | 'manual_trigger'
  | 'utc_interval';

interface EventFeedRow {
  access_mode: EventAccessMode;
  active_participant_count: number;
  category: string | null;
  circle_id: string | null;
  display_timezone: string | null;
  duration_minutes: number;
  ends_at_utc: string;
  occurrence_id: string;
  occurrence_key: string;
  occurrence_metadata: Record<string, unknown> | null;
  participant_count: number;
  room_id: string | null;
  series_description: string | null;
  series_id: string;
  series_key: string;
  series_metadata: Record<string, unknown> | null;
  series_name: string;
  series_purpose: string | null;
  source_event_id: string | null;
  starts_at_utc: string;
  status: EventOccurrenceStatus;
  visibility_scope: EventVisibilityScope;
}

interface ActiveOccurrencePresenceRow {
  last_seen_at: string;
  occurrence_id: string;
  room_id: string;
  user_id: string;
}

interface RoomPresenceSummaryRow {
  active_participant_count: number;
  last_activity_at: string | null;
  occurrence_id: string | null;
  participant_count: number;
  room_id: string;
}

interface RoomParticipantSummaryRow {
  display_name: string | null;
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
  presence_state: 'active' | 'idle' | 'left';
  role: 'host' | 'moderator' | 'participant';
  room_id: string;
  user_id: string;
}

interface ReminderPreferenceOccurrenceSubscriptionRow {
  enabled: boolean;
  occurrence_id: string | null;
  target_type: 'occurrence' | 'room' | 'series';
}

interface EventOccurrenceContentRow {
  audio_artifact_id: string | null;
  audio_status: 'failed' | 'missing' | 'pending' | 'ready';
  created_at: string;
  duration_minutes: number;
  has_word_timings: boolean;
  id: string;
  language: string;
  metadata: Record<string, unknown> | null;
  occurrence_id: string;
  script_checksum: string;
  script_hash: string;
  script_model: string | null;
  script_prompt_version: string;
  script_text: string;
  script_tone: string | null;
  script_word_count: number;
  series_id: string;
  source: string;
  updated_at: string;
  voice_id: string | null;
  voice_label: string | null;
}

export interface CanonicalEventSeries {
  accessMode: EventAccessMode;
  category: string;
  createdAt: string;
  defaultDurationMinutes: number;
  description: string | null;
  id: string;
  isActive: boolean;
  isEmergency: boolean;
  isSpecial: boolean;
  key: string;
  metadata: Record<string, unknown>;
  name: string;
  purpose: string | null;
  scheduleType: CanonicalEventScheduleType;
  subtitle: string | null;
  visibilityScope: EventVisibilityScope;
}

export interface CanonicalEventOccurrence {
  accessMode: EventAccessMode;
  activeParticipantCount: number;
  category: string;
  circleId: string | null;
  displayTimezone: string | null;
  durationMinutes: number;
  endsAtUtc: string;
  occurrenceId: string;
  occurrenceKey: string;
  occurrenceMetadata: Record<string, unknown>;
  participantCount: number;
  roomId: string | null;
  seriesDescription: string | null;
  seriesId: string;
  seriesKey: string;
  seriesMetadata: Record<string, unknown>;
  seriesName: string;
  seriesPurpose: string | null;
  sourceEventId: string | null;
  startsAtUtc: string;
  status: EventOccurrenceStatus;
  visibilityScope: EventVisibilityScope;
}

export interface CanonicalRoomPresenceSummary {
  activeParticipantCount: number;
  lastActivityAt: string | null;
  occurrenceId: string | null;
  participantCount: number;
  roomId: string;
}

export interface CanonicalRoomParticipant {
  displayName: string;
  joinedAt: string;
  lastSeenAt: string;
  leftAt: string | null;
  presenceState: 'active' | 'idle' | 'left';
  role: 'host' | 'moderator' | 'participant';
  roomId: string;
  userId: string;
}

export interface EventNotificationState {
  subscribedAll: boolean;
  subscriptionKeys: string[];
}

export interface EventOccurrenceContent {
  audioArtifactId: string | null;
  audioStatus: 'failed' | 'missing' | 'pending' | 'ready';
  createdAt: string;
  durationMinutes: number;
  hasWordTimings: boolean;
  id: string;
  language: string;
  metadata: Record<string, unknown>;
  occurrenceId: string;
  scriptChecksum: string;
  scriptHash: string;
  scriptModel: string | null;
  scriptPromptVersion: string;
  scriptText: string;
  scriptTone: string | null;
  scriptWordCount: number;
  seriesId: string;
  source: string;
  updatedAt: string;
  voiceId: string | null;
  voiceLabel: string | null;
}

export interface UserPreferences {
  highContrastMode: boolean;
  preferredAmbient: string;
  preferredBreathMode: string;
  preferredSessionMinutes: number;
  preferredVoiceId: string;
  voiceEnabled: boolean;
}

export interface ProfileSummary {
  circleMembers: number;
  eventsJoinedThisWeek: number;
  highContrastMode: boolean;
  minutesPrayed: number;
  sessionsThisWeek: number;
  soloStreakDays: number;
  weeklyCollectiveImpactScore: number;
  weeklyEventImpactScore: number;
  weeklySoloImpactScore: number;
}

export interface SoloStats {
  minutesThisWeek: number;
  sessionsThisWeek: number;
  sessionsToday: number;
}

export interface EventRoomSnapshot {
  event: AppEvent;
  eventContent: EventOccurrenceContent | null;
  isJoined: boolean;
  joinedCount: number;
  occurrenceId: string | null;
  roomId: string | null;
}

export interface EventJoinTarget {
  occurrenceId?: string;
  occurrenceKey?: string;
  roomId?: string;
}

export type SharedSoloSessionPlaybackState = 'idle' | 'playing' | 'paused' | 'ended';
export type SharedSoloSessionStatus = 'active' | 'ended';
export type SharedSoloSessionParticipantRole = 'host' | 'participant';

export interface SharedSoloSession {
  createdAt: string;
  durationMinutes: number;
  endedAt: string | null;
  hostUserId: string;
  id: string;
  intention: string;
  playbackPositionMs: number;
  playbackState: SharedSoloSessionPlaybackState;
  prayerLibraryItemId: string | null;
  scriptText: string;
  startedAt: string | null;
  status: SharedSoloSessionStatus;
  updatedAt: string;
  voiceId: string;
}

export interface SharedSoloSessionParticipant {
  isActive: boolean;
  joinedAt: string;
  lastSeenAt: string;
  role: SharedSoloSessionParticipantRole;
  sessionId: string;
  userId: string;
}

export interface SharedSoloSessionSnapshot {
  isJoined: boolean;
  joinedCount: number;
  participants: SharedSoloSessionParticipant[];
  session: SharedSoloSession;
}

export interface ActiveEventUserPresence {
  eventId: string;
  lastSeenAt: string;
  userId: string;
}

export interface UserJournalEntry {
  content: string;
  createdAt: string;
  id: string;
  updatedAt: string;
}

const PRAYER_LIBRARY_CACHE_TTL_MS = 45_000;
const EVENTS_CACHE_TTL_MS = 30_000;
const COMMUNITY_SNAPSHOT_CACHE_TTL_MS = 20_000;
const EVENT_FEED_CACHE_TTL_MS = 20_000;
const EVENT_OCCURRENCE_CONTENT_CACHE_TTL_MS = 20_000;
const ACTIVE_EVENT_USERS_CACHE_TTL_MS = 15_000;
const EVENT_NOTIFICATION_STATE_CACHE_TTL_MS = 30_000;
const USER_JOURNAL_ENTRIES_CACHE_TTL_MS = 45_000;
const USER_PREFERENCES_CACHE_TTL_MS = 2 * 60_000;
const PROFILE_SUMMARY_CACHE_TTL_MS = 45_000;
const SOLO_STATS_CACHE_TTL_MS = 45_000;
const SHARED_SOLO_ACTIVE_WINDOW_MS = 90_000;
const SHARED_SOLO_SESSION_SELECT_FIELDS =
  'id,host_user_id,intention,prayer_library_item_id,script_text,voice_id,duration_minutes,playback_state,playback_position_ms,status,started_at,ended_at,created_at,updated_at';

let prayerLibraryCache: {
  cachedAt: number;
  items: PrayerLibraryItem[];
} | null = null;
let prayerLibraryRequestPromise: Promise<PrayerLibraryItem[]> | null = null;

interface TimedCacheEntry<T> {
  cachedAt: number;
  value: T;
}

const eventsCache = new Map<string, TimedCacheEntry<AppEvent[]>>();
const eventsRequestCache = new Map<string, Promise<AppEvent[]>>();
const eventByIdCache = new Map<string, TimedCacheEntry<AppEvent | null>>();
const eventFeedCache = new Map<string, TimedCacheEntry<CanonicalEventOccurrence[]>>();
const eventFeedRequestCache = new Map<string, Promise<CanonicalEventOccurrence[]>>();
const eventOccurrenceContentCache = new Map<string, TimedCacheEntry<EventOccurrenceContent | null>>();
const eventOccurrenceContentRequestCache = new Map<
  string,
  Promise<EventOccurrenceContent | null>
>();
const communitySnapshotCache = new Map<string, TimedCacheEntry<CommunitySnapshot>>();
const communitySnapshotRequestCache = new Map<string, Promise<CommunitySnapshot>>();
const activeEventUsersCache = new Map<string, TimedCacheEntry<ActiveEventUserPresence[]>>();
const activeEventUsersRequestCache = new Map<string, Promise<ActiveEventUserPresence[]>>();
const eventNotificationStateCache = new Map<string, TimedCacheEntry<EventNotificationState>>();
const eventNotificationStateRequestCache = new Map<string, Promise<EventNotificationState>>();
const userJournalEntriesCache = new Map<string, TimedCacheEntry<UserJournalEntry[]>>();
const userJournalEntriesRequestCache = new Map<string, Promise<UserJournalEntry[]>>();
const userPreferencesCache = new Map<string, TimedCacheEntry<UserPreferences>>();
const userPreferencesRequestCache = new Map<string, Promise<UserPreferences>>();
const profileSummaryCache = new Map<string, TimedCacheEntry<ProfileSummary>>();
const profileSummaryRequestCache = new Map<string, Promise<ProfileSummary>>();
const soloStatsCache = new Map<string, TimedCacheEntry<SoloStats>>();
const soloStatsRequestCache = new Map<string, Promise<SoloStats>>();
const coreAppDataPrefetchRequests = new Map<string, Promise<void>>();

const prayerLibraryItemIdByTitleCache = new Map<string, string>();
const prayerScriptVariantCache = new Map<string, string | null>();
const prayerScriptVariantRequestCache = new Map<string, Promise<string | null>>();

function normalizePrayerTitleKey(title: string) {
  return title.trim().toLowerCase();
}

function buildPrayerScriptCacheKey(input: {
  durationMinutes: number;
  language: string;
  prayerLibraryItemId?: string;
  title?: string;
}) {
  const itemId = input.prayerLibraryItemId?.trim();
  const title = input.title?.trim();

  if (!itemId && !title) {
    return null;
  }

  const keyIdentifier = itemId ? `id:${itemId}` : `title:${normalizePrayerTitleKey(title ?? '')}`;
  return `${keyIdentifier}|duration:${input.durationMinutes}|lang:${input.language}`;
}

function readFreshTimedCache<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
  ttlMs: number,
): TimedCacheEntry<T> | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.cachedAt > ttlMs) {
    cache.delete(key);
    return null;
  }

  return entry;
}

function writeTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T): T {
  cache.set(key, {
    cachedAt: Date.now(),
    value,
  });
  return value;
}

async function loadWithTimedCache<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  requestCache: Map<string, Promise<T>>,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const cached = readFreshTimedCache(cache, key, ttlMs);
  if (cached) {
    return cached.value;
  }

  const inFlight = requestCache.get(key);
  if (inFlight) {
    return inFlight;
  }

  const request = load()
    .then((value) => writeTimedCache(cache, key, value))
    .finally(() => {
      requestCache.delete(key);
    });

  requestCache.set(key, request);
  return request;
}

function invalidateEventRuntimeCaches(eventId?: string) {
  activeEventUsersCache.clear();
  communitySnapshotCache.clear();
  eventFeedCache.clear();
  eventOccurrenceContentCache.clear();
  eventsCache.clear();
  if (eventId?.trim()) {
    eventByIdCache.delete(eventId.trim());
    eventOccurrenceContentCache.delete(eventId.trim());
  }
}

export function getCachedPrayerLibraryItems() {
  const cache = prayerLibraryCache;
  if (!cache) {
    return null;
  }

  if (Date.now() - cache.cachedAt > PRAYER_LIBRARY_CACHE_TTL_MS) {
    prayerLibraryCache = null;
    return null;
  }

  return cache.items;
}

export function getCachedEventFeed(input?: { horizonHours?: number; timezone?: string }) {
  const horizonHours = Math.max(1, Math.min(Math.round(input?.horizonHours ?? 72), 336));
  const timezone = input?.timezone?.trim() ?? '';
  const cacheKey = `${horizonHours}|${timezone}`;
  return readFreshTimedCache(eventFeedCache, cacheKey, EVENT_FEED_CACHE_TTL_MS)?.value ?? null;
}

export function getCachedActiveEventUsers(activeWindowMinutes = 15) {
  return (
    readFreshTimedCache(
      activeEventUsersCache,
      `${activeWindowMinutes}`,
      ACTIVE_EVENT_USERS_CACHE_TTL_MS,
    )?.value ?? null
  );
}

export function getCachedEventNotificationState(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  return (
    readFreshTimedCache(
      eventNotificationStateCache,
      normalizedUserId,
      EVENT_NOTIFICATION_STATE_CACHE_TTL_MS,
    )?.value ?? null
  );
}

export function getCachedUserJournalEntries(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  return (
    readFreshTimedCache(
      userJournalEntriesCache,
      normalizedUserId,
      USER_JOURNAL_ENTRIES_CACHE_TTL_MS,
    )?.value ?? null
  );
}

export function getCachedUserPreferences(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  return (
    readFreshTimedCache(userPreferencesCache, normalizedUserId, USER_PREFERENCES_CACHE_TTL_MS)
      ?.value ?? null
  );
}

export function getCachedProfileSummary(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  return (
    readFreshTimedCache(profileSummaryCache, normalizedUserId, PROFILE_SUMMARY_CACHE_TTL_MS)
      ?.value ?? null
  );
}

export function getCachedSoloStats(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  return (
    readFreshTimedCache(soloStatsCache, normalizedUserId, SOLO_STATS_CACHE_TTL_MS)?.value ?? null
  );
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeekMonday(date: Date) {
  const next = startOfDay(date);
  const currentDay = next.getDay();
  const deltaToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  next.setDate(next.getDate() + deltaToMonday);
  return next;
}

function toIso(date: Date) {
  return date.toISOString();
}

function formatDurationMinutes(minutes: number) {
  if (minutes <= 1) {
    return '1 min';
  }
  return `${minutes} min`;
}

function formatDurationRangeMinutes(minMinutes: number, maxMinutes: number) {
  const normalizedMin = Math.max(1, Math.round(minMinutes));
  const normalizedMax = Math.max(normalizedMin, Math.round(maxMinutes));

  if (normalizedMin === normalizedMax) {
    return formatDurationMinutes(normalizedMin);
  }

  return `${normalizedMin}-${normalizedMax} min`;
}

function minutesFromSeconds(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return 0;
  }
  return Math.round(totalSeconds / 60);
}

function hoursFromNow(isoDate: string) {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((target - now) / (1000 * 60 * 60));
}

type EventTimingState = 'ended' | 'live' | 'upcoming';

function getEventTimingState(
  event: Pick<AppEvent, 'durationMinutes' | 'startsAt'>,
  nowMs = Date.now(),
): EventTimingState {
  const startsAtMs = new Date(event.startsAt).getTime();
  if (!Number.isFinite(startsAtMs)) {
    return 'ended';
  }

  const endsAtMs = startsAtMs + Math.max(1, event.durationMinutes) * 60 * 1000;
  if (nowMs >= endsAtMs) {
    return 'ended';
  }

  if (nowMs >= startsAtMs) {
    return 'live';
  }

  return 'upcoming';
}

function formatEventSubtitle(event: AppEvent) {
  const timingState = getEventTimingState(event);
  if (timingState === 'live') {
    return `${event.participants} active now`;
  }

  if (timingState === 'ended') {
    return 'Ended';
  }

  const hours = hoursFromNow(event.startsAt);
  if (hours <= 0) {
    return 'Starting soon';
  }

  if (hours < 24) {
    return `Starts in ${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `Starts in ${days}d`;
}

function isEventLiveNow(event: Pick<AppEvent, 'durationMinutes' | 'startsAt'>) {
  return getEventTimingState(event) === 'live';
}

function toSupabaseErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function isMissingTableMessage(message: string, tableName: string) {
  const normalized = message.toLowerCase();
  const normalizedTable = tableName.toLowerCase();
  return (
    normalized.includes(normalizedTable) &&
    (normalized.includes('schema cache') ||
      normalized.includes('does not exist') ||
      normalized.includes('relation'))
  );
}

function logReleaseSafeError(context: string, safeMessage: string, rawMessage: string) {
  if (!__DEV__) {
    return;
  }

  if (safeMessage === rawMessage) {
    return;
  }

  console.warn(`[Egregor][${context}]`, safeMessage, rawMessage);
}

function toSharedSoloReleaseSafeMessage(error: unknown, fallback: string, context: string) {
  const rawMessage = toSupabaseErrorMessage(error, fallback);
  const normalized = rawMessage.toLowerCase();

  let safeMessage = fallback;

  if (
    isMissingTableMessage(rawMessage, 'shared_solo_session_participants') ||
    isMissingTableMessage(rawMessage, 'shared_solo_sessions')
  ) {
    safeMessage = 'Shared sessions are temporarily unavailable. Please try again shortly.';
  } else if (
    normalized.includes('permission') ||
    normalized.includes('forbidden') ||
    normalized.includes('not allowed')
  ) {
    safeMessage = 'You do not have access to this shared session.';
  } else if (
    normalized.includes('invalid') &&
    (normalized.includes('session') || normalized.includes('shared'))
  ) {
    safeMessage = 'This shared session link is invalid.';
  } else if (
    normalized.includes('not found') &&
    (normalized.includes('session') || normalized.includes('shared'))
  ) {
    safeMessage = 'This shared session is no longer available.';
  }

  logReleaseSafeError(context, safeMessage, rawMessage);
  return safeMessage;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value.trim());
}

function buildOccurrenceSubscriptionKey(occurrenceId: string) {
  return `occurrence:${occurrenceId}`;
}

function extractOccurrenceIdFromSubscriptionKey(subscriptionKey: string) {
  const trimmed = subscriptionKey.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('occurrence:')) {
    const candidate = trimmed.slice('occurrence:'.length).trim();
    return isUuid(candidate) ? candidate : null;
  }

  return isUuid(trimmed) ? trimmed : null;
}

function normalizeEventJoinTarget(
  input: EventJoinTarget | string,
): {
  occurrenceId: string;
  occurrenceKey: string;
  roomId: string;
} {
  if (typeof input === 'string') {
    const normalized = input.trim();
    const isLikelyOccurrenceKey = normalized.includes('|');
    return {
      occurrenceId: isLikelyOccurrenceKey ? '' : normalized,
      occurrenceKey: isLikelyOccurrenceKey ? normalized : '',
      roomId: '',
    };
  }

  const occurrenceId = input.occurrenceId?.trim() || '';
  const occurrenceKey = input.occurrenceKey?.trim() || '';
  const roomId = input.roomId?.trim() || '';
  const hasCanonicalTarget = Boolean(occurrenceId || occurrenceKey || roomId);

  return {
    occurrenceId,
    occurrenceKey,
    roomId,
  };
}

function toDisplayEventStatus(occurrence: CanonicalEventOccurrence): EventStatus {
  if (occurrence.status === 'cancelled') {
    return 'cancelled';
  }
  if (occurrence.status === 'ended') {
    return 'completed';
  }
  if (occurrence.status === 'live') {
    return 'live';
  }

  return 'scheduled';
}

function mapCanonicalOccurrenceRow(row: EventFeedRow): CanonicalEventOccurrence {
  const occurrenceMetadata = row.occurrence_metadata ?? {};
  const seriesMetadata = row.series_metadata ?? {};
  const lunarName =
    typeof occurrenceMetadata.lunar_name === 'string'
      ? occurrenceMetadata.lunar_name.trim()
      : '';
  const lunarPhase =
    typeof occurrenceMetadata.lunar_phase === 'string'
      ? occurrenceMetadata.lunar_phase.trim().toLowerCase()
      : '';
  const startsAtMillis = new Date(row.starts_at_utc).getTime();
  const lunarMonthLabel = Number.isFinite(startsAtMillis)
    ? new Date(startsAtMillis).toLocaleString('en-US', {
        month: 'long',
        timeZone: 'UTC',
      })
    : '';

  let seriesName = row.series_name;
  let seriesDescription = row.series_description;
  let seriesPurpose = row.series_purpose;

  if (row.series_key === 'full-moon-gathering' && lunarName) {
    seriesName = `${lunarName} Full Moon Gathering`;
    if (!seriesDescription?.trim()) {
      seriesDescription = `A lunar-synced gathering aligned to the ${lunarName} full moon.`;
    }
    if (!seriesPurpose?.trim()) {
      seriesPurpose = `Reflect, release, and renew together under the ${lunarName}.`;
    }
  } else if (row.series_key === 'new-moon-intention-setting' && lunarPhase === 'new_moon') {
    const monthPrefix = lunarMonthLabel ? `${lunarMonthLabel} ` : '';
    seriesName = `${monthPrefix}New Moon Intention Setting`.trim();
    if (!seriesDescription?.trim()) {
      seriesDescription = 'A lunar-synced gathering for clear intentions and grounded commitments.';
    }
  }

  return {
    accessMode: row.access_mode,
    activeParticipantCount: row.active_participant_count ?? row.participant_count ?? 0,
    category: row.category?.trim() || 'Collective',
    circleId: row.circle_id,
    displayTimezone: row.display_timezone?.trim() || null,
    durationMinutes: Math.max(1, row.duration_minutes ?? 10),
    endsAtUtc: row.ends_at_utc,
    occurrenceId: row.occurrence_id,
    occurrenceKey: row.occurrence_key,
    occurrenceMetadata,
    participantCount: row.participant_count ?? 0,
    roomId: row.room_id,
    seriesDescription,
    seriesId: row.series_id,
    seriesKey: row.series_key,
    seriesMetadata,
    seriesName,
    seriesPurpose,
    sourceEventId: row.source_event_id,
    startsAtUtc: row.starts_at_utc,
    status: row.status,
    visibilityScope: row.visibility_scope,
  };
}

function mapEventOccurrenceContentRow(row: EventOccurrenceContentRow): EventOccurrenceContent {
  return {
    audioArtifactId: row.audio_artifact_id,
    audioStatus: row.audio_status,
    createdAt: row.created_at,
    durationMinutes: Math.max(1, row.duration_minutes ?? 1),
    hasWordTimings: Boolean(row.has_word_timings),
    id: row.id,
    language: row.language?.trim() || 'en',
    metadata: row.metadata ?? {},
    occurrenceId: row.occurrence_id,
    scriptChecksum: row.script_checksum,
    scriptHash: row.script_hash,
    scriptModel: row.script_model,
    scriptPromptVersion: row.script_prompt_version,
    scriptText: row.script_text,
    scriptTone: row.script_tone,
    scriptWordCount: Math.max(0, row.script_word_count ?? 0),
    seriesId: row.series_id,
    source: row.source,
    updatedAt: row.updated_at,
    voiceId: row.voice_id,
    voiceLabel: row.voice_label,
  };
}

function mapCanonicalOccurrenceToAppEvent(occurrence: CanonicalEventOccurrence): AppEvent {
  return {
    countryCode: null,
    description: occurrence.seriesDescription?.trim() || occurrence.seriesPurpose?.trim() || null,
    durationMinutes: occurrence.durationMinutes,
    hostNote:
      typeof occurrence.seriesMetadata?.legacy_host_note === 'string'
        ? occurrence.seriesMetadata.legacy_host_note
        : occurrence.seriesPurpose,
    id: occurrence.occurrenceId,
    participants: occurrence.activeParticipantCount,
    region: occurrence.category,
    startsAt: occurrence.startsAtUtc,
    status: toDisplayEventStatus(occurrence),
    subtitle: occurrence.seriesPurpose?.trim() || occurrence.category,
    title: occurrence.seriesName,
    visibility: occurrence.visibilityScope === 'global' ? 'public' : 'private',
  };
}

function mapSharedSoloSessionRow(row: SharedSoloSessionRow): SharedSoloSession {
  return {
    createdAt: row.created_at,
    durationMinutes: row.duration_minutes,
    endedAt: row.ended_at,
    hostUserId: row.host_user_id,
    id: row.id,
    intention: row.intention,
    playbackPositionMs: row.playback_position_ms ?? 0,
    playbackState: row.playback_state,
    prayerLibraryItemId: row.prayer_library_item_id,
    scriptText: row.script_text,
    startedAt: row.started_at,
    status: row.status,
    updatedAt: row.updated_at,
    voiceId: row.voice_id,
  };
}

function mapSharedSoloParticipantRow(
  row: SharedSoloSessionParticipantRow,
): SharedSoloSessionParticipant {
  return {
    isActive: Boolean(row.is_active),
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    role: row.role,
    sessionId: row.session_id,
    userId: row.user_id,
  };
}

function rankEventTimingState(status: EventTimingState) {
  if (status === 'live') {
    return 0;
  }

  if (status === 'upcoming') {
    return 1;
  }

  return 2;
}

export async function fetchActiveEventUsers(
  activeWindowMinutes = 15,
): Promise<ActiveEventUserPresence[]> {
  const cacheKey = `${activeWindowMinutes}`;
  return loadWithTimedCache(
    activeEventUsersCache,
    activeEventUsersRequestCache,
    cacheKey,
    ACTIVE_EVENT_USERS_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase.rpc('list_active_occurrence_presence', {
        p_active_window_minutes: Math.max(1, Math.min(Math.round(activeWindowMinutes), 240)),
      });

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load active user presence.'));
      }

      return ((data ?? []) as ActiveOccurrencePresenceRow[]).map((row) => ({
        eventId: row.occurrence_id,
        lastSeenAt: row.last_seen_at,
        userId: row.user_id,
      }));
    },
  );
}

export async function listEventFeed(input?: {
  horizonHours?: number;
  timezone?: string;
}): Promise<CanonicalEventOccurrence[]> {
  const horizonHours = Math.max(1, Math.min(Math.round(input?.horizonHours ?? 72), 336));
  const timezone = input?.timezone?.trim() ?? '';
  const cacheKey = `${horizonHours}|${timezone}`;

  return loadWithTimedCache(
    eventFeedCache,
    eventFeedRequestCache,
    cacheKey,
    EVENT_FEED_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase.rpc('list_event_feed', {
        p_horizon_hours: horizonHours,
        p_timezone: timezone || null,
      });

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load canonical event feed.'));
      }

      const occurrences = ((data ?? []) as EventFeedRow[]).map(mapCanonicalOccurrenceRow);
      const cachedAt = Date.now();
      for (const occurrence of occurrences) {
        eventByIdCache.set(occurrence.occurrenceId, {
          cachedAt,
          value: mapCanonicalOccurrenceToAppEvent(occurrence),
        });
      }

      return occurrences;
    },
  );
}

export async function fetchEventOccurrenceContent(
  occurrenceId: string,
  language = 'en',
): Promise<EventOccurrenceContent | null> {
  const normalizedOccurrenceId = occurrenceId.trim();
  if (!normalizedOccurrenceId) {
    return null;
  }

  const normalizedLanguage = language.trim().toLowerCase() || 'en';
  const cacheKey = `${normalizedOccurrenceId}|${normalizedLanguage}`;

  return loadWithTimedCache(
    eventOccurrenceContentCache,
    eventOccurrenceContentRequestCache,
    cacheKey,
    EVENT_OCCURRENCE_CONTENT_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase
        .from('event_occurrence_content')
        .select(
          'id,occurrence_id,series_id,language,duration_minutes,script_text,script_hash,script_checksum,script_word_count,script_model,script_tone,script_prompt_version,source,voice_id,voice_label,audio_artifact_id,audio_status,audio_error,audio_generated_at,has_word_timings,metadata,created_at,updated_at',
        )
        .eq('occurrence_id', normalizedOccurrenceId)
        .eq('language', normalizedLanguage)
        .maybeSingle();

      if (error) {
        const message = toSupabaseErrorMessage(
          error,
          'Failed to load canonical event room content.',
        );
        if (isMissingTableMessage(message, 'event_occurrence_content')) {
          return null;
        }
        throw new Error(message);
      }

      if (!data) {
        return null;
      }

      return mapEventOccurrenceContentRow(data as EventOccurrenceContentRow);
    },
  );
}

export async function getEventOccurrenceByJoinTarget(input: {
  occurrenceId?: string;
  occurrenceKey?: string;
  roomId?: string;
}): Promise<CanonicalEventOccurrence | null> {
  const { data, error } = await supabase.rpc('get_event_occurrence_by_join_target', {
    p_legacy_event_id: null,
    p_occurrence_id: input.occurrenceId?.trim() || null,
    p_occurrence_key: input.occurrenceKey?.trim() || null,
    p_room_id: input.roomId?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to resolve event join target.'));
  }

  const row = ((data ?? []) as EventFeedRow[])[0];
  return row ? mapCanonicalOccurrenceRow(row) : null;
}

export async function ensureJoinableOccurrenceRoom(input: {
  occurrenceId?: string;
  occurrenceKey?: string;
  roomId?: string;
}): Promise<{
  activeParticipantCount: number;
  occurrenceId: string;
  participantCount: number;
  roomId: string;
}> {
  const { data, error } = await supabase.rpc('ensure_joinable_occurrence_room', {
    p_legacy_event_id: null,
    p_occurrence_id: input.occurrenceId?.trim() || null,
    p_occurrence_key: input.occurrenceKey?.trim() || null,
    p_room_id: input.roomId?.trim() || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to ensure joinable occurrence room.'));
  }

  const row = ((data ?? []) as Array<{
    active_participant_count: number;
    occurrence_id: string;
    participant_count: number;
    room_id: string;
  }>)[0];

  if (!row) {
    throw new Error('Could not resolve a joinable room.');
  }

  return {
    activeParticipantCount: row.active_participant_count ?? row.participant_count ?? 0,
    occurrenceId: row.occurrence_id,
    participantCount: row.participant_count ?? 0,
    roomId: row.room_id,
  };
}

export async function listRoomParticipants(roomId: string, activeOnly = true) {
  const normalizedRoomId = roomId.trim();
  if (!normalizedRoomId) {
    return [] as CanonicalRoomParticipant[];
  }

  const { data, error } = await supabase.rpc('list_room_participants', {
    p_active_only: activeOnly,
    p_room_id: normalizedRoomId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to list room participants.'));
  }

  return ((data ?? []) as RoomParticipantSummaryRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    leftAt: row.left_at,
    presenceState: row.presence_state,
    role: row.role,
    roomId: row.room_id,
    userId: row.user_id,
  }));
}

export async function getRoomPresenceSummary(roomId: string): Promise<CanonicalRoomPresenceSummary> {
  const normalizedRoomId = roomId.trim();
  if (!normalizedRoomId) {
    throw new Error('Room id is required.');
  }

  const { data, error } = await supabase.rpc('get_room_presence_summary', {
    p_room_id: normalizedRoomId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load room presence summary.'));
  }

  const row = ((data ?? []) as RoomPresenceSummaryRow[])[0];
  if (!row) {
    return {
      activeParticipantCount: 0,
      lastActivityAt: null,
      occurrenceId: null,
      participantCount: 0,
      roomId: normalizedRoomId,
    };
  }

  return {
    activeParticipantCount: row.active_participant_count ?? 0,
    lastActivityAt: row.last_activity_at,
    occurrenceId: row.occurrence_id,
    participantCount: row.participant_count ?? 0,
    roomId: row.room_id,
  };
}

export async function fetchEvents(limit = 8): Promise<AppEvent[]> {
  const cacheKey = `${limit}`;
  return loadWithTimedCache(
    eventsCache,
    eventsRequestCache,
    cacheKey,
    EVENTS_CACHE_TTL_MS,
    async () => {
      const occurrences = await listEventFeed({ horizonHours: 120 });
      const mappedEvents = occurrences
        .map(mapCanonicalOccurrenceToAppEvent)
        .filter((event) => getEventTimingState(event) !== 'ended')
        .sort((a, b) => {
          const rankDiff =
            rankEventTimingState(getEventTimingState(a)) -
            rankEventTimingState(getEventTimingState(b));
          if (rankDiff !== 0) {
            return rankDiff;
          }
          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        });

      const cachedAt = Date.now();
      for (const event of mappedEvents) {
        eventByIdCache.set(event.id, {
          cachedAt,
          value: event,
        });
      }

      return mappedEvents;
    },
  );
}

export async function fetchCommunitySnapshot(): Promise<CommunitySnapshot> {
  return loadWithTimedCache(
    communitySnapshotCache,
    communitySnapshotRequestCache,
    'default',
    COMMUNITY_SNAPSHOT_CACHE_TTL_MS,
    async () => {
      const [events, occurrences, activePresence] = await Promise.all([
        fetchEvents(20),
        listEventFeed({ horizonHours: 24 }),
        fetchActiveEventUsers(15),
      ]);

      const liveEvents = events.filter((event) => isEventLiveNow(event));
      const strongestLiveEvent = liveEvents
        .slice()
        .sort((left, right) => {
          if (right.participants !== left.participants) {
            return right.participants - left.participants;
          }
          return left.title.localeCompare(right.title);
        })[0];

      const uniqueActiveParticipants = new Set(activePresence.map((entry) => entry.userId)).size;
      const countries = new Set(
        occurrences
          .map((occurrence) => occurrence.displayTimezone?.trim().toUpperCase() || null)
          .filter((value): value is string => Boolean(value)),
      ).size;

      const prioritizedAlerts = [...liveEvents, ...events.filter((event) => !liveEvents.includes(event))];
      const alerts = prioritizedAlerts.slice(0, 2).map((event) => ({
        eventId: event.id,
        subtitle: formatEventSubtitle(event),
        title: event.title,
      }));

      return {
        alerts,
        countries,
        events,
        liveEvents: liveEvents.length,
        strongestLiveEventId: strongestLiveEvent?.id ?? null,
        strongestLiveEventTitle: strongestLiveEvent?.title ?? null,
        uniqueActiveParticipants,
      };
    },
  );
}

export async function updateAppUserPresence(userId: string, isOnline: boolean) {
  const payload = {
    is_online: isOnline,
    last_seen_at: new Date().toISOString(),
    user_id: userId,
  };

  const { error } = await supabase.from('app_user_presence').upsert(payload, {
    onConflict: 'user_id',
  });

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to update app presence.');
    if (isMissingTableMessage(message, 'app_user_presence')) {
      return;
    }
    throw new Error(message);
  }
}

export async function fetchPrayerLibraryItems(): Promise<PrayerLibraryItem[]> {
  const now = Date.now();
  if (prayerLibraryCache && now - prayerLibraryCache.cachedAt <= PRAYER_LIBRARY_CACHE_TTL_MS) {
    return prayerLibraryCache.items;
  }

  if (prayerLibraryRequestPromise) {
    return prayerLibraryRequestPromise;
  }

  prayerLibraryRequestPromise = (async () => {
    const { data, error } = await supabase
      .from('prayer_library_items')
      .select('id,title,body,category,duration_minutes,starts_count')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      throw new Error(toSupabaseErrorMessage(error, 'Failed to load prayer library.'));
    }

    const rows = (data ?? []) as PrayerLibraryRow[];
    const itemIds = rows
      .map((row) => row.id?.trim())
      .filter((value): value is string => Boolean(value));

    const durationRangeByItemId = new Map<string, { max: number; min: number }>();
    if (itemIds.length > 0) {
      const { data: scriptData, error: scriptError } = await supabase
        .from('prayer_library_scripts')
        .select('prayer_library_item_id,duration_minutes')
        .eq('language', 'en')
        .in('prayer_library_item_id', itemIds);

      if (!scriptError) {
        const scriptRows = (scriptData ?? []) as Array<{
          duration_minutes: number | null;
          prayer_library_item_id: string | null;
        }>;

        for (const scriptRow of scriptRows) {
          const itemId = scriptRow.prayer_library_item_id?.trim();
          const durationValue = Number(scriptRow.duration_minutes ?? 0);
          const scriptDuration = Math.max(1, Math.round(durationValue));

          if (!itemId || !Number.isFinite(scriptDuration) || scriptDuration <= 0) {
            continue;
          }

          const existingRange = durationRangeByItemId.get(itemId);
          if (!existingRange) {
            durationRangeByItemId.set(itemId, { max: scriptDuration, min: scriptDuration });
            continue;
          }

          durationRangeByItemId.set(itemId, {
            max: Math.max(existingRange.max, scriptDuration),
            min: Math.min(existingRange.min, scriptDuration),
          });
        }
      }
    }
    const items = rows.map((row) => {
      const duration = row.duration_minutes ?? 5;
      const starts = row.starts_count ?? 0;
      const category = row.category?.trim();
      const categoryPart = category ? `${category} - ` : '';
      const durationRange = durationRangeByItemId.get(row.id);
      const minDurationMinutes = durationRange?.min ?? duration;
      const maxDurationMinutes = durationRange?.max ?? duration;
      const durationLabel = formatDurationRangeMinutes(minDurationMinutes, maxDurationMinutes);

      return {
        body: row.body,
        category: category ?? null,
        durationMinutes: duration,
        id: row.id,
        maxDurationMinutes,
        minDurationMinutes,
        startsCount: starts,
        subtitle: `${categoryPart}${durationLabel} - ${starts} starts`,
        title: row.title,
      };
    });

    for (const item of items) {
      const normalizedTitle = normalizePrayerTitleKey(item.title);
      if (normalizedTitle) {
        prayerLibraryItemIdByTitleCache.set(normalizedTitle, item.id);
      }
    }

    prayerLibraryCache = {
      cachedAt: Date.now(),
      items,
    };

    return items;
  })().finally(() => {
    prayerLibraryRequestPromise = null;
  });

  return prayerLibraryRequestPromise;
}

export async function fetchEventNotificationState(userId: string): Promise<EventNotificationState> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return {
      subscribedAll: false,
      subscriptionKeys: [],
    };
  }

  return loadWithTimedCache(
    eventNotificationStateCache,
    eventNotificationStateRequestCache,
    normalizedUserId,
    EVENT_NOTIFICATION_STATE_CACHE_TTL_MS,
    async () => {
      const subscriptionKeys = new Set<string>();
      let subscribedAll = false;

      try {
        const canonicalPreferences = await listNotificationPreferences();
        for (const preference of canonicalPreferences) {
          if (preference.category !== 'occurrence_reminder') {
            continue;
          }

          if (preference.targetType === 'global') {
            subscribedAll = preference.enabled;
            continue;
          }

          if (
            preference.targetType === 'event_occurrence' &&
            preference.enabled &&
            preference.targetId
          ) {
            subscriptionKeys.add(buildOccurrenceSubscriptionKey(preference.targetId));
          }
        }
      } catch (error) {
        const message = toSupabaseErrorMessage(error, 'Failed to load event notification settings.');
        if (
          !isMissingTableMessage(message, 'notification_subscriptions') &&
          !message.toLowerCase().includes('list_my_notification_preferences')
        ) {
          throw new Error(message);
        }
      }

      const canonical = await supabase
        .from('event_reminder_preferences')
        .select('target_type,occurrence_id,enabled')
        .eq('user_id', normalizedUserId)
        .eq('target_type', 'occurrence')
        .eq('enabled', true);

      if (canonical.error) {
        const message = toSupabaseErrorMessage(
          canonical.error,
          'Failed to load event notification settings.',
        );
        if (!isMissingTableMessage(message, 'event_reminder_preferences')) {
          throw new Error(message);
        }
      } else {
        for (const row of (canonical.data ?? []) as ReminderPreferenceOccurrenceSubscriptionRow[]) {
          if (row.target_type !== 'occurrence' || !row.enabled || !row.occurrence_id) {
            continue;
          }

          subscriptionKeys.add(buildOccurrenceSubscriptionKey(row.occurrence_id));
        }
      }

      const legacy = await supabase
        .from('user_event_subscriptions')
        .select('scope,subscription_key')
        .eq('user_id', normalizedUserId);

      if (legacy.error) {
        const message = toSupabaseErrorMessage(
          legacy.error,
          'Failed to load event notification settings.',
        );
        if (
          !isMissingTableMessage(message, 'user_event_subscriptions') &&
          !subscribedAll &&
          subscriptionKeys.size === 0
        ) {
          throw new Error(message);
        }
      } else {
        const rows = (legacy.data ?? []) as UserEventSubscriptionRow[];
        for (const row of rows) {
          if (row.scope === 'all') {
            subscribedAll = true;
            continue;
          }

          const key = row.subscription_key?.trim() || '';
          if (!key) {
            continue;
          }

          const occurrenceId = extractOccurrenceIdFromSubscriptionKey(key);
          if (occurrenceId) {
            subscriptionKeys.add(buildOccurrenceSubscriptionKey(occurrenceId));
            continue;
          }

          subscriptionKeys.add(key);
        }
      }

      return {
        subscribedAll,
        subscriptionKeys: Array.from(subscriptionKeys),
      };
    },
  );
}

export async function setAllEventNotifications(userId: string, enabled: boolean) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  let canonicalSucceeded = false;
  try {
    await updateNotificationPreferences({
      category: 'occurrence_reminder',
      enabled,
      targetType: 'global',
    });
    canonicalSucceeded = true;
  } catch (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to update all-event notifications.');
    if (
      !isMissingTableMessage(message, 'notification_subscriptions') &&
      !message.toLowerCase().includes('update_notification_subscription')
    ) {
      throw new Error(message);
    }
  }

  if (enabled) {
    const { error } = await supabase.from('user_event_subscriptions').upsert(
      {
        scope: 'all',
        subscription_key: '*',
        user_id: normalizedUserId,
      },
      {
        onConflict: 'user_id,scope,subscription_key',
      },
    );

    if (error) {
      const message = toSupabaseErrorMessage(error, 'Failed to update all-event notifications.');
      if (isMissingTableMessage(message, 'user_event_subscriptions') && canonicalSucceeded) {
        return;
      }
      throw new Error(message);
    }

    eventNotificationStateCache.delete(normalizedUserId);
    return;
  }

  const { error } = await supabase
    .from('user_event_subscriptions')
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('scope', 'all')
    .eq('subscription_key', '*');

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to update all-event notifications.');
    if (isMissingTableMessage(message, 'user_event_subscriptions') && canonicalSucceeded) {
      return;
    }
    throw new Error(message);
  }

  eventNotificationStateCache.delete(normalizedUserId);
}

export async function setEventNotificationSubscription(input: {
  enabled: boolean;
  subscriptionKey: string;
  userId: string;
}) {
  const normalizedUserId = input.userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const subscriptionKey = input.subscriptionKey.trim();
  if (!subscriptionKey) {
    return;
  }

  const occurrenceId = extractOccurrenceIdFromSubscriptionKey(subscriptionKey);
  const canonicalSubscriptionKey = occurrenceId
    ? buildOccurrenceSubscriptionKey(occurrenceId)
    : subscriptionKey;

  let canonicalSucceeded = false;
  if (occurrenceId) {
    try {
      await saveOccurrenceReminderPreference({
        enabled: input.enabled,
        occurrenceId,
      });
      canonicalSucceeded = true;
    } catch (error) {
      const message = toSupabaseErrorMessage(error, 'Failed to save event reminder preference.');
      if (
        !isMissingTableMessage(message, 'event_reminder_preferences') &&
        !isMissingTableMessage(message, 'notification_subscriptions') &&
        !message.toLowerCase().includes('save_event_reminder_preference') &&
        !message.toLowerCase().includes('update_notification_subscription')
      ) {
        throw new Error(message);
      }
    }
  }

  if (input.enabled) {
    const { error } = await supabase.from('user_event_subscriptions').upsert(
      {
        scope: 'event',
        subscription_key: canonicalSubscriptionKey,
        user_id: normalizedUserId,
      },
      {
        onConflict: 'user_id,scope,subscription_key',
      },
    );

    if (error) {
      const message = toSupabaseErrorMessage(error, 'Failed to save event notification.');
      if (!isMissingTableMessage(message, 'user_event_subscriptions')) {
        throw new Error(message);
      }

      if (!canonicalSucceeded && !occurrenceId) {
        throw new Error(message);
      }
    }

    eventNotificationStateCache.delete(normalizedUserId);
    return;
  }

  const { error } = await supabase
    .from('user_event_subscriptions')
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('scope', 'event')
    .eq('subscription_key', canonicalSubscriptionKey);

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to save event notification.');
    if (!isMissingTableMessage(message, 'user_event_subscriptions')) {
      throw new Error(message);
    }

    if (!canonicalSucceeded && !occurrenceId) {
      throw new Error(message);
    }
  }

  eventNotificationStateCache.delete(normalizedUserId);
}

export async function fetchUserJournalEntries(userId: string): Promise<UserJournalEntry[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  return loadWithTimedCache(
    userJournalEntriesCache,
    userJournalEntriesRequestCache,
    normalizedUserId,
    USER_JOURNAL_ENTRIES_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase
        .from('user_journal_entries')
        .select('id,content,created_at,updated_at')
        .eq('user_id', normalizedUserId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load journal entries.'));
      }

      return ((data ?? []) as UserJournalEntryRow[]).map((row) => ({
        content: row.content ?? '',
        createdAt: row.created_at,
        id: row.id,
        updatedAt: row.updated_at,
      }));
    },
  );
}

export async function createUserJournalEntry(input: {
  content: string;
  userId: string;
}): Promise<UserJournalEntry> {
  const normalizedUserId = input.userId.trim();
  if (!normalizedUserId) {
    throw new Error('Cannot create a journal entry without a user.');
  }

  const { data, error } = await supabase
    .from('user_journal_entries')
    .insert({
      content: input.content,
      user_id: normalizedUserId,
    })
    .select('id,content,created_at,updated_at')
    .single();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to create journal entry.'));
  }

  const row = data as UserJournalEntryRow;
  const createdEntry = {
    content: row.content ?? '',
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
  };

  const cachedEntries = readFreshTimedCache(
    userJournalEntriesCache,
    normalizedUserId,
    USER_JOURNAL_ENTRIES_CACHE_TTL_MS,
  );
  if (cachedEntries) {
    writeTimedCache(userJournalEntriesCache, normalizedUserId, [
      ...cachedEntries.value,
      createdEntry,
    ]);
  }

  return createdEntry;
}

export async function updateUserJournalEntry(input: {
  content: string;
  entryId: string;
  userId: string;
}): Promise<UserJournalEntry> {
  const normalizedUserId = input.userId.trim();
  if (!normalizedUserId) {
    throw new Error('Cannot update a journal entry without a user.');
  }

  const { data, error } = await supabase
    .from('user_journal_entries')
    .update({
      content: input.content,
    })
    .eq('id', input.entryId)
    .eq('user_id', normalizedUserId)
    .select('id,content,created_at,updated_at')
    .single();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update journal entry.'));
  }

  const row = data as UserJournalEntryRow;
  const updatedEntry = {
    content: row.content ?? '',
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
  };

  const cachedEntries = readFreshTimedCache(
    userJournalEntriesCache,
    normalizedUserId,
    USER_JOURNAL_ENTRIES_CACHE_TTL_MS,
  );
  if (cachedEntries) {
    writeTimedCache(
      userJournalEntriesCache,
      normalizedUserId,
      cachedEntries.value.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
    );
  }

  return updatedEntry;
}

export async function incrementPrayerLibraryStart(itemId: string) {
  const { data, error } = await supabase
    .from('prayer_library_items')
    .select('starts_count')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update prayer usage.'));
  }

  const nextStarts = ((data as { starts_count?: number } | null)?.starts_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from('prayer_library_items')
    .update({ starts_count: nextStarts })
    .eq('id', itemId);

  if (updateError) {
    throw new Error(toSupabaseErrorMessage(updateError, 'Failed to update prayer usage.'));
  }
}

export async function fetchPrayerScriptVariantByTitle(input: {
  durationMinutes: number;
  language?: string;
  prayerLibraryItemId?: string;
  title: string;
}): Promise<string | null> {
  const prayerLibraryItemIdInput = input.prayerLibraryItemId?.trim() || '';
  const title = input.title.trim();
  if (!prayerLibraryItemIdInput && !title) {
    return null;
  }

  const language = input.language?.trim() || 'en';
  const normalizedDurationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const requestedCacheKey = buildPrayerScriptCacheKey({
    durationMinutes: normalizedDurationMinutes,
    language,
    ...(prayerLibraryItemIdInput ? { prayerLibraryItemId: prayerLibraryItemIdInput } : {}),
    ...(title ? { title } : {}),
  });
  if (!requestedCacheKey) {
    return null;
  }

  if (prayerScriptVariantCache.has(requestedCacheKey)) {
    return prayerScriptVariantCache.get(requestedCacheKey) ?? null;
  }

  const inFlightRequest = prayerScriptVariantRequestCache.get(requestedCacheKey);
  if (inFlightRequest) {
    return inFlightRequest;
  }

  const loadPromise = (async () => {
    let prayerLibraryItemId = prayerLibraryItemIdInput;

    if (!prayerLibraryItemId && title) {
      const normalizedTitle = normalizePrayerTitleKey(title);
      prayerLibraryItemId = prayerLibraryItemIdByTitleCache.get(normalizedTitle) ?? '';

      if (!prayerLibraryItemId) {
        const { data: prayerItem, error: prayerItemError } = await supabase
          .from('prayer_library_items')
          .select('id,title,is_public')
          .eq('title', title)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prayerItemError) {
          throw new Error(
            toSupabaseErrorMessage(
              prayerItemError,
              'Failed to load prayer library item for script.',
            ),
          );
        }

        prayerLibraryItemId = ((prayerItem as { id?: string } | null)?.id ?? '').trim();
        if (prayerLibraryItemId) {
          prayerLibraryItemIdByTitleCache.set(normalizedTitle, prayerLibraryItemId);
        }
      }
    }

    if (!prayerLibraryItemId) {
      return null;
    }

    const { data: scriptRow, error: scriptError } = await supabase
      .from('prayer_library_scripts')
      .select('id,script_text,duration_minutes,language')
      .eq('prayer_library_item_id', prayerLibraryItemId)
      .eq('duration_minutes', normalizedDurationMinutes)
      .eq('language', language)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scriptError) {
      throw new Error(toSupabaseErrorMessage(scriptError, 'Failed to load prayer script variant.'));
    }

    const script = ((scriptRow as PrayerLibraryScriptRow | null)?.script_text ?? '').trim();
    const normalizedScript = script.length > 0 ? script : null;

    const idCacheKey = buildPrayerScriptCacheKey({
      durationMinutes: normalizedDurationMinutes,
      language,
      prayerLibraryItemId,
    });
    if (idCacheKey) {
      prayerScriptVariantCache.set(idCacheKey, normalizedScript);
    }

    if (title) {
      const titleCacheKey = buildPrayerScriptCacheKey({
        durationMinutes: normalizedDurationMinutes,
        language,
        title,
      });
      if (titleCacheKey) {
        prayerScriptVariantCache.set(titleCacheKey, normalizedScript);
      }
    }

    return normalizedScript;
  })().finally(() => {
    prayerScriptVariantRequestCache.delete(requestedCacheKey);
  });

  prayerScriptVariantRequestCache.set(requestedCacheKey, loadPromise);
  const nextScript = await loadPromise;
  prayerScriptVariantCache.set(requestedCacheKey, nextScript);
  return nextScript;
}

export function prefetchPrayerScriptVariantByTitle(input: {
  durationMinutes: number;
  language?: string;
  prayerLibraryItemId?: string;
  title: string;
}) {
  void fetchPrayerScriptVariantByTitle(input).catch(() => {
    // Prefetch is best-effort and intentionally non-blocking.
  });
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error('Cannot load preferences without a user.');
  }

  return loadWithTimedCache(
    userPreferencesCache,
    userPreferencesRequestCache,
    normalizedUserId,
    USER_PREFERENCES_CACHE_TTL_MS,
    async () => {
      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: normalizedUserId,
        },
        {
          onConflict: 'id',
        },
      );

      if (upsertError) {
        throw new Error(toSupabaseErrorMessage(upsertError, 'Failed to initialize profile.'));
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id,display_name,preferred_voice_id,preferred_breath_mode,preferred_ambient,preferred_session_minutes,high_contrast_mode,voice_enabled',
        )
        .eq('id', normalizedUserId)
        .single();

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load profile preferences.'));
      }

      const row = data as ProfileRow;
      return {
        highContrastMode: Boolean(row.high_contrast_mode),
        preferredAmbient: row.preferred_ambient?.trim() || 'Bowls',
        preferredBreathMode: row.preferred_breath_mode?.trim() || 'Deep',
        preferredSessionMinutes: row.preferred_session_minutes ?? 5,
        preferredVoiceId: row.preferred_voice_id?.trim() || '',
        voiceEnabled: row.voice_enabled ?? true,
      };
    },
  );
}

function calculateSoloStreakDays(completedDates: string[]) {
  if (completedDates.length === 0) {
    return 0;
  }

  const uniqueDays = Array.from(
    new Set(
      completedDates
        .map((dateValue) => {
          const date = new Date(dateValue);
          if (Number.isNaN(date.getTime())) {
            return null;
          }

          return startOfDay(date).toISOString();
        })
        .filter((value): value is string => value !== null),
    ),
  )
    .map((value) => new Date(value).getTime())
    .sort((a, b) => b - a);

  if (uniqueDays.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = uniqueDays[index - 1];
    const current = uniqueDays[index];
    if (previous === undefined || current === undefined) {
      break;
    }

    const diffDays = Math.round((previous - current) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

const SOLO_IMPACT_TARGET_MINUTES = 90;
const EVENT_IMPACT_TARGET_JOINS = 5;
const SOLO_IMPACT_WEIGHT = 0.5;
const EVENT_IMPACT_WEIGHT = 0.5;

function clampImpactScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toWeeklyImpactScore(value: number, target: number) {
  if (value <= 0 || target <= 0) {
    return 0;
  }

  return clampImpactScore((value / target) * 100);
}

function calculateWeeklyImpactScores(input: { eventsJoinedThisWeek: number; thisWeekMinutes: number }) {
  const weeklySoloImpactScore = toWeeklyImpactScore(input.thisWeekMinutes, SOLO_IMPACT_TARGET_MINUTES);
  const weeklyEventImpactScore = toWeeklyImpactScore(
    input.eventsJoinedThisWeek,
    EVENT_IMPACT_TARGET_JOINS,
  );
  const weightTotal = SOLO_IMPACT_WEIGHT + EVENT_IMPACT_WEIGHT;
  const normalizedWeightTotal = weightTotal > 0 ? weightTotal : 1;
  const weeklyCollectiveImpactScore = clampImpactScore(
    (weeklySoloImpactScore * SOLO_IMPACT_WEIGHT +
      weeklyEventImpactScore * EVENT_IMPACT_WEIGHT) /
      normalizedWeightTotal,
  );

  return {
    weeklyCollectiveImpactScore,
    weeklyEventImpactScore,
    weeklySoloImpactScore,
  };
}

export async function fetchProfileSummary(userId: string): Promise<ProfileSummary> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error('Cannot load profile summary without a user.');
  }

  return loadWithTimedCache(
    profileSummaryCache,
    profileSummaryRequestCache,
    normalizedUserId,
    PROFILE_SUMMARY_CACHE_TTL_MS,
    async () => {
      const now = new Date();
      const weekStart = startOfWeekMonday(now);

      const [preferences, membershipRes, roomParticipantRes, soloSessionsRes] = await Promise.all([
        fetchUserPreferences(normalizedUserId),
        supabase
          .from('circle_members')
          .select('circle_id')
          .eq('user_id', normalizedUserId)
          .eq('status', 'active'),
        supabase
          .from('room_participants')
          .select('room_id,joined_at,rooms!inner(room_kind,occurrence_id)')
          .eq('user_id', normalizedUserId)
          .eq('rooms.room_kind', 'event_occurrence')
          .order('joined_at', { ascending: false }),
        supabase
          .from('solo_sessions')
          .select('id,duration_seconds,completed_at')
          .eq('user_id', normalizedUserId)
          .order('completed_at', { ascending: false }),
      ]);

      if (membershipRes.error) {
        throw new Error(
          toSupabaseErrorMessage(membershipRes.error, 'Failed to load circle stats.'),
        );
      }
      if (roomParticipantRes.error) {
        throw new Error(
          toSupabaseErrorMessage(roomParticipantRes.error, 'Failed to load live room participation.'),
        );
      }
      if (soloSessionsRes.error) {
        throw new Error(
          toSupabaseErrorMessage(soloSessionsRes.error, 'Failed to load solo stats.'),
        );
      }

      const circleIds = ((membershipRes.data ?? []) as { circle_id: string }[]).map(
        (row) => row.circle_id,
      );

      let circleMembers = 0;
      if (circleIds.length > 0) {
        const { data, error } = await supabase
          .from('circle_members')
          .select('user_id,circle_id')
          .in('circle_id', circleIds)
          .eq('status', 'active');

        if (error) {
          throw new Error(
            toSupabaseErrorMessage(error, 'Failed to load circle membership counts.'),
          );
        }

        circleMembers = new Set(
          ((data ?? []) as { user_id: string }[])
            .map((row) => row.user_id)
            .filter((memberId) => memberId !== normalizedUserId),
        ).size;
      }

      const eventRows = (roomParticipantRes.data ?? []) as {
        joined_at: string;
        room_id: string;
        rooms:
          | {
              occurrence_id?: string | null;
              room_kind?: string | null;
            }
          | Array<{
              occurrence_id?: string | null;
              room_kind?: string | null;
            }>
          | null;
      }[];
      const eventsJoinedThisWeek = new Set(
        eventRows
          .filter((row) => new Date(row.joined_at).getTime() >= weekStart.getTime())
          .map((row) => {
            const roomRelation = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
            const occurrenceId = roomRelation?.occurrence_id?.trim();
            if (occurrenceId) {
              return occurrenceId;
            }

            return row.room_id;
          }),
      ).size;

      const sessionRows = (soloSessionsRes.data ?? []) as SoloSessionRow[];
      const completedSessionRows = sessionRows.filter((row) => Boolean(row.completed_at));
      const minutesPrayed = minutesFromSeconds(
        completedSessionRows.reduce((acc, row) => acc + (row.duration_seconds ?? 0), 0),
      );
      const sessionsThisWeek = completedSessionRows.filter((row) => {
        const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : 0;
        return completedAt >= weekStart.getTime();
      }).length;

      const thisWeekMinutes = minutesFromSeconds(
        completedSessionRows
          .filter((row) => {
            const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : 0;
            return completedAt >= weekStart.getTime();
          })
          .reduce((acc, row) => acc + (row.duration_seconds ?? 0), 0),
      );

      const soloStreakDays = calculateSoloStreakDays(
        completedSessionRows
          .map((row) => row.completed_at)
          .filter((value): value is string => Boolean(value)),
      );

      const {
        weeklyCollectiveImpactScore,
        weeklyEventImpactScore,
        weeklySoloImpactScore,
      } = calculateWeeklyImpactScores({
        eventsJoinedThisWeek,
        thisWeekMinutes,
      });

      return {
        circleMembers,
        eventsJoinedThisWeek,
        highContrastMode: preferences.highContrastMode,
        minutesPrayed,
        sessionsThisWeek,
        soloStreakDays,
        weeklyCollectiveImpactScore,
        weeklyEventImpactScore,
        weeklySoloImpactScore,
      };
    },
  );
}

export async function fetchSoloStats(userId: string): Promise<SoloStats> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return {
      minutesThisWeek: 0,
      sessionsThisWeek: 0,
      sessionsToday: 0,
    };
  }

  return loadWithTimedCache(
    soloStatsCache,
    soloStatsRequestCache,
    normalizedUserId,
    SOLO_STATS_CACHE_TTL_MS,
    async () => {
      const now = new Date();
      const weekStart = startOfWeekMonday(now);
      const todayStart = startOfDay(now);

      const { data, error } = await supabase
        .from('solo_sessions')
        .select('id,duration_seconds,completed_at')
        .eq('user_id', normalizedUserId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load solo progress.'));
      }

      const sessions = (data ?? []) as SoloSessionRow[];
      const sessionsThisWeek = sessions.filter((row) => {
        const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : 0;
        return completedAt >= weekStart.getTime();
      });
      const sessionsToday = sessions.filter((row) => {
        const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : 0;
        return completedAt >= todayStart.getTime();
      });

      const minutesThisWeek = minutesFromSeconds(
        sessionsThisWeek.reduce((acc, row) => acc + (row.duration_seconds ?? 0), 0),
      );

      return {
        minutesThisWeek,
        sessionsThisWeek: sessionsThisWeek.length,
        sessionsToday: sessionsToday.length,
      };
    },
  );
}

export function prefetchCoreAppData(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const inFlight = coreAppDataPrefetchRequests.get(normalizedUserId);
  if (inFlight) {
    return;
  }

  const request = (async () => {
    await Promise.allSettled([
      fetchPrayerLibraryItems(),
      fetchEvents(120),
      fetchActiveEventUsers(15),
      fetchCommunitySnapshot(),
      fetchEventNotificationState(normalizedUserId),
      fetchUserPreferences(normalizedUserId),
      fetchProfileSummary(normalizedUserId),
      fetchUserJournalEntries(normalizedUserId),
      fetchSoloStats(normalizedUserId),
    ]);
  })().finally(() => {
    coreAppDataPrefetchRequests.delete(normalizedUserId);
  });

  coreAppDataPrefetchRequests.set(normalizedUserId, request);
}

export async function recordSoloSession(input: {
  durationSeconds: number;
  intention: string;
  scriptText: string;
  userId: string;
}) {
  if (input.durationSeconds <= 0) {
    return;
  }

  const { error } = await supabase.from('solo_sessions').insert({
    completed_at: new Date().toISOString(),
    duration_seconds: Math.round(input.durationSeconds),
    intention: input.intention.trim(),
    script_text: input.scriptText.trim() || null,
    user_id: input.userId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to record solo session.'));
  }

  const normalizedUserId = input.userId.trim();
  if (normalizedUserId) {
    soloStatsCache.delete(normalizedUserId);
    profileSummaryCache.delete(normalizedUserId);
  }
}

async function resolveEventOccurrenceForJoinTarget(input: EventJoinTarget | string) {
  const joinTarget = normalizeEventJoinTarget(input);
  const occurrence = await getEventOccurrenceByJoinTarget({
    ...(joinTarget.occurrenceId ? { occurrenceId: joinTarget.occurrenceId } : {}),
    ...(joinTarget.occurrenceKey ? { occurrenceKey: joinTarget.occurrenceKey } : {}),
    ...(joinTarget.roomId ? { roomId: joinTarget.roomId } : {}),
  });

  return {
    joinTarget,
    occurrence,
  };
}

export async function fetchEventRoomSnapshot(
  input: EventJoinTarget | string,
  userId: string,
): Promise<EventRoomSnapshot> {
  const normalizedUserId = userId.trim();
  const { joinTarget, occurrence } = await resolveEventOccurrenceForJoinTarget(input);
  if (!occurrence) {
    throw new Error('Event occurrence not found.');
  }

  let roomId = occurrence.roomId?.trim() || null;
  if (!roomId && occurrence.status === 'scheduled') {
    try {
      const ensured = await ensureJoinableOccurrenceRoom({
        occurrenceId: occurrence.occurrenceId,
        ...(joinTarget.occurrenceKey ? { occurrenceKey: joinTarget.occurrenceKey } : {}),
        ...(joinTarget.roomId ? { roomId: joinTarget.roomId } : {}),
      });
      roomId = ensured.roomId;
    } catch {
      // Joinability can fail outside the window; keep the canonical occurrence snapshot.
    }
  }

  let participantCount = occurrence.activeParticipantCount;
  let isJoined = false;

  if (roomId) {
    const summary = await getRoomPresenceSummary(roomId);
    participantCount = summary.activeParticipantCount;

    if (normalizedUserId) {
      const participants = await listRoomParticipants(roomId, false);
      isJoined = participants.some(
        (participant) => participant.userId === normalizedUserId && participant.presenceState !== 'left',
      );
    }
  }

  const [event, eventContent] = await Promise.all([
    Promise.resolve(mapCanonicalOccurrenceToAppEvent(occurrence)),
    fetchEventOccurrenceContent(occurrence.occurrenceId),
  ]);

  return {
    event: {
      ...event,
      participants: participantCount,
    },
    eventContent,
    isJoined,
    joinedCount: participantCount,
    occurrenceId: occurrence.occurrenceId,
    roomId,
  };
}

export async function joinEventRoom(input: EventJoinTarget | string, userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error('User id is required to join a room.');
  }

  const { joinTarget, occurrence } = await resolveEventOccurrenceForJoinTarget(input);
  if (!occurrence) {
    throw new Error('Event occurrence not found.');
  }

  const { error } = await supabase.rpc('join_event_room', {
    p_legacy_event_id: null,
    p_occurrence_id: occurrence.occurrenceId,
    p_occurrence_key: joinTarget.occurrenceKey || occurrence.occurrenceKey || null,
    p_room_id: joinTarget.roomId || occurrence.roomId || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to join room.'));
  }

  invalidateEventRuntimeCaches(occurrence.occurrenceId);
}

export async function leaveEventRoom(input: EventJoinTarget | string, userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const { joinTarget, occurrence } = await resolveEventOccurrenceForJoinTarget(input);
  if (!occurrence) {
    return;
  }

  const { error } = await supabase.rpc('leave_event_room', {
    p_legacy_event_id: null,
    p_occurrence_id: occurrence.occurrenceId,
    p_occurrence_key: joinTarget.occurrenceKey || occurrence.occurrenceKey || null,
    p_room_id: joinTarget.roomId || occurrence.roomId || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to leave room.'));
  }

  invalidateEventRuntimeCaches(occurrence.occurrenceId);
}

export async function refreshEventPresence(input: EventJoinTarget | string, userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const { joinTarget, occurrence } = await resolveEventOccurrenceForJoinTarget(input);
  if (!occurrence) {
    return;
  }

  const { error } = await supabase.rpc('refresh_event_room_presence', {
    p_legacy_event_id: null,
    p_occurrence_id: occurrence.occurrenceId,
    p_occurrence_key: joinTarget.occurrenceKey || occurrence.occurrenceKey || null,
    p_room_id: joinTarget.roomId || occurrence.roomId || null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to refresh room presence.'));
  }

  activeEventUsersCache.clear();
  eventByIdCache.delete(occurrence.occurrenceId);
}

export async function createSharedSoloSession(input: {
  durationMinutes: number;
  hostUserId: string;
  intention: string;
  prayerLibraryItemId?: string;
  scriptText: string;
  voiceId: string;
}): Promise<SharedSoloSession> {
  const hostUserId = input.hostUserId.trim();
  const scriptText = input.scriptText.trim();
  const intention = input.intention.trim() || 'Shared prayer';
  const voiceId = input.voiceId.trim();
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const prayerLibraryItemId = input.prayerLibraryItemId?.trim() || null;

  if (!hostUserId) {
    throw new Error('Cannot create a shared session without a host user.');
  }
  if (!scriptText) {
    throw new Error('Cannot create a shared session without a script.');
  }
  if (!voiceId) {
    throw new Error('Cannot create a shared session without a voice.');
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('shared_solo_sessions')
    .insert({
      duration_minutes: durationMinutes,
      host_user_id: hostUserId,
      intention,
      playback_position_ms: 0,
      playback_state: 'idle',
      ...(prayerLibraryItemId ? { prayer_library_item_id: prayerLibraryItemId } : {}),
      script_text: scriptText,
      status: 'active',
      voice_id: voiceId,
    })
    .select(SHARED_SOLO_SESSION_SELECT_FIELDS)
    .single();

  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to start a shared session right now.',
        'createSharedSoloSession',
      ),
    );
  }

  const row = data as SharedSoloSessionRow;

  const { error: participantError } = await supabase
    .from('shared_solo_session_participants')
    .upsert(
      {
        is_active: true,
        joined_at: nowIso,
        last_seen_at: nowIso,
        role: 'host',
        session_id: row.id,
        user_id: hostUserId,
      },
      {
        onConflict: 'session_id,user_id',
      },
    );

  if (participantError) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        participantError,
        'Unable to initialize shared session participants.',
        'createSharedSoloSession.participants',
      ),
    );
  }

  return mapSharedSoloSessionRow(row);
}

export async function findReusableSharedSoloSession(input: {
  durationMinutes: number;
  hostUserId: string;
  intention: string;
  prayerLibraryItemId?: string;
  scriptText: string;
  voiceId: string;
}): Promise<SharedSoloSession | null> {
  const hostUserId = input.hostUserId.trim();
  const scriptText = input.scriptText.trim();
  const intention = input.intention.trim() || 'Shared prayer';
  const voiceId = input.voiceId.trim();
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const prayerLibraryItemId = input.prayerLibraryItemId?.trim() || null;

  if (!hostUserId || !scriptText || !voiceId) {
    return null;
  }

  let query = supabase
    .from('shared_solo_sessions')
    .select(SHARED_SOLO_SESSION_SELECT_FIELDS)
    .eq('host_user_id', hostUserId)
    .eq('status', 'active')
    .eq('duration_minutes', durationMinutes)
    .eq('voice_id', voiceId)
    .eq('intention', intention)
    .eq('script_text', scriptText)
    .order('updated_at', { ascending: false })
    .limit(1);

  query = prayerLibraryItemId
    ? query.eq('prayer_library_item_id', prayerLibraryItemId)
    : query.is('prayer_library_item_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to check existing shared sessions right now.',
        'findReusableSharedSoloSession',
      ),
    );
  }

  if (!data) {
    return null;
  }

  return mapSharedSoloSessionRow(data as SharedSoloSessionRow);
}

export async function fetchSharedSoloSessionSnapshot(
  sessionId: string,
  userId: string,
): Promise<SharedSoloSessionSnapshot> {
  const normalizedSessionId = sessionId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedSessionId) {
    throw new Error('Shared solo session id is required.');
  }

  const [sessionResponse, participantsResponse] = await Promise.all([
    supabase
      .from('shared_solo_sessions')
      .select(SHARED_SOLO_SESSION_SELECT_FIELDS)
      .eq('id', normalizedSessionId)
      .maybeSingle(),
    supabase
      .from('shared_solo_session_participants')
      .select('session_id,user_id,role,is_active,joined_at,last_seen_at')
      .eq('session_id', normalizedSessionId)
      .eq('is_active', true)
      .gte('last_seen_at', new Date(Date.now() - SHARED_SOLO_ACTIVE_WINDOW_MS).toISOString()),
  ]);

  if (sessionResponse.error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        sessionResponse.error,
        'Unable to load this shared session.',
        'fetchSharedSoloSessionSnapshot.session',
      ),
    );
  }

  if (!sessionResponse.data) {
    throw new Error('Shared solo session not found.');
  }

  if (participantsResponse.error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        participantsResponse.error,
        'Unable to load shared session participants.',
        'fetchSharedSoloSessionSnapshot.participants',
      ),
    );
  }

  const participants = (participantsResponse.data ?? [])
    .map((row) => mapSharedSoloParticipantRow(row as SharedSoloSessionParticipantRow))
    .sort((left, right) => {
      if (left.role === right.role) {
        return left.joinedAt.localeCompare(right.joinedAt);
      }

      return left.role === 'host' ? -1 : 1;
    });

  return {
    isJoined: participants.some((participant) => participant.userId === normalizedUserId),
    joinedCount: participants.length,
    participants,
    session: mapSharedSoloSessionRow(sessionResponse.data as SharedSoloSessionRow),
  };
}

export async function joinSharedSoloSession(input: { sessionId: string; userId: string }) {
  const normalizedSessionId = input.sessionId.trim();
  const normalizedUserId = input.userId.trim();

  if (!normalizedSessionId || !normalizedUserId) {
    return;
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('shared_solo_session_participants').upsert(
    {
      is_active: true,
      last_seen_at: nowIso,
      session_id: normalizedSessionId,
      user_id: normalizedUserId,
    },
    {
      onConflict: 'session_id,user_id',
    },
  );

  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to join the shared session right now.',
        'joinSharedSoloSession',
      ),
    );
  }
}

export async function leaveSharedSoloSession(sessionId: string, userId: string) {
  const normalizedSessionId = sessionId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedSessionId || !normalizedUserId) {
    return;
  }

  const { error } = await supabase
    .from('shared_solo_session_participants')
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .eq('session_id', normalizedSessionId)
    .eq('user_id', normalizedUserId);

  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to leave the shared session right now.',
        'leaveSharedSoloSession',
      ),
    );
  }
}

export async function refreshSharedSoloSessionPresence(sessionId: string, userId: string) {
  const normalizedSessionId = sessionId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedSessionId || !normalizedUserId) {
    return;
  }

  const { error } = await supabase
    .from('shared_solo_session_participants')
    .update({
      is_active: true,
      last_seen_at: new Date().toISOString(),
    })
    .eq('session_id', normalizedSessionId)
    .eq('user_id', normalizedUserId)
    .eq('is_active', true);

  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to refresh shared session presence.',
        'refreshSharedSoloSessionPresence',
      ),
    );
  }
}

export async function updateSharedSoloSessionHostState(input: {
  endedAt?: string | null;
  hostUserId: string;
  playbackPositionMs: number;
  playbackState: SharedSoloSessionPlaybackState;
  sessionId: string;
  startedAt?: string | null;
  status?: SharedSoloSessionStatus;
}) {
  const normalizedSessionId = input.sessionId.trim();
  const normalizedHostUserId = input.hostUserId.trim();
  if (!normalizedSessionId || !normalizedHostUserId) {
    return;
  }

  const payload: {
    ended_at?: string | null;
    playback_position_ms: number;
    playback_state: SharedSoloSessionPlaybackState;
    started_at?: string | null;
    status?: SharedSoloSessionStatus;
  } = {
    playback_position_ms: Math.max(0, Math.round(input.playbackPositionMs)),
    playback_state: input.playbackState,
  };

  if (input.startedAt !== undefined) {
    payload.started_at = input.startedAt;
  }
  if (input.endedAt !== undefined) {
    payload.ended_at = input.endedAt;
  }
  if (input.status) {
    payload.status = input.status;
  }

  const { error } = await supabase
    .from('shared_solo_sessions')
    .update(payload)
    .eq('id', normalizedSessionId)
    .eq('host_user_id', normalizedHostUserId);

  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to sync shared session state right now.',
        'updateSharedSoloSessionHostState',
      ),
    );
  }
}

export async function endSharedSoloSession(sessionId: string, hostUserId: string) {
  const normalizedSessionId = sessionId.trim();
  const normalizedHostUserId = hostUserId.trim();
  if (!normalizedSessionId || !normalizedHostUserId) {
    return;
  }

  const nowIso = new Date().toISOString();
  await updateSharedSoloSessionHostState({
    endedAt: nowIso,
    hostUserId: normalizedHostUserId,
    playbackPositionMs: 0,
    playbackState: 'ended',
    sessionId: normalizedSessionId,
    status: 'ended',
  });

  const { error } = await supabase
    .from('shared_solo_session_participants')
    .update({
      is_active: false,
      last_seen_at: nowIso,
    })
    .eq('session_id', normalizedSessionId)
    .eq('is_active', true);

  if (error) {
    throw new Error(
      toSharedSoloReleaseSafeMessage(
        error,
        'Unable to finalize shared session cleanup.',
        'endSharedSoloSession',
      ),
    );
  }
}

export function subscribeSharedSoloSession(input: {
  onParticipantsChange?: () => void;
  onSessionChange?: () => void;
  sessionId: string;
}) {
  const normalizedSessionId = input.sessionId.trim();
  if (!normalizedSessionId) {
    return () => {
      // No session to unsubscribe from.
    };
  }

  const channel = supabase
    .channel(`shared-solo-session-${normalizedSessionId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `id=eq.${normalizedSessionId}`,
        schema: 'public',
        table: 'shared_solo_sessions',
      },
      () => {
        input.onSessionChange?.();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `session_id=eq.${normalizedSessionId}`,
        schema: 'public',
        table: 'shared_solo_session_participants',
      },
      () => {
        input.onParticipantsChange?.();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

