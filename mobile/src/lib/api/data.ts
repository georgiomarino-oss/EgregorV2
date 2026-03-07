import { EVENT_LIBRARY_CATALOG, type EventLibrarySeedItem } from '../catalog/eventLibraryCatalog';
import { supabase } from '../supabase';

export type EventStatus = 'live' | 'scheduled' | 'completed' | 'cancelled';
export type EventVisibility = 'public' | 'private';

interface EventRow {
  country_code: string | null;
  created_at: string;
  description: string | null;
  duration_minutes: number | null;
  host_note: string | null;
  id: string;
  region: string | null;
  starts_at: string;
  status: EventStatus;
  subtitle: string | null;
  title: string;
  visibility: EventVisibility;
}

interface EventParticipantRow {
  event_id: string;
  is_active: boolean;
  joined_at: string;
  last_seen_at: string;
  user_id: string;
}

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
  script_text: string;
}

interface EventLibraryRow {
  body: string;
  category: string | null;
  duration_minutes: number | null;
  id: string;
  script_text: string;
  starts_count: number | null;
  title: string;
}

interface NewsDrivenEventRow {
  category: string;
  country_code: string | null;
  duration_minutes: number;
  event_day: string;
  headline: string;
  id: string;
  location_hint: string | null;
  script_text: string;
  source_title: string | null;
  source_url: string;
  starts_at: string;
  summary: string;
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

interface UserIntentionRow {
  created_at: string;
  id: string;
  intention: string;
}

interface PrayerCircleMemberRpcRow {
  display_name: string | null;
  is_owner: boolean;
  joined_at: string;
  user_id: string;
}

interface PrayerCircleUserRpcRow {
  display_name: string | null;
  user_id: string;
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
  startsCount: number;
  subtitle: string;
  title: string;
}

export interface EventLibraryItem {
  body: string;
  category: string | null;
  durationMinutes: number;
  id: string;
  script: string;
  startsCount: number;
  subtitle: string;
  title: string;
}

export interface NewsDrivenEventItem {
  category: string;
  countryCode: string | null;
  durationMinutes: number;
  id: string;
  locationHint: string | null;
  script: string;
  sourceTitle: string | null;
  sourceUrl: string;
  startsAt: string;
  summary: string;
  title: string;
}

export interface EventNotificationState {
  subscribedAll: boolean;
  subscriptionKeys: string[];
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
  weeklyImpactChangePercent: number;
}

export interface SoloStats {
  minutesThisWeek: number;
  sessionsThisWeek: number;
  sessionsToday: number;
}

export interface EventRoomSnapshot {
  event: AppEvent;
  isJoined: boolean;
  joinedCount: number;
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

export interface PrayerCircleMember {
  displayName: string;
  isOwner: boolean;
  joinedAt: string;
  userId: string;
}

export interface PrayerCircleUserSuggestion {
  displayName: string;
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
const EVENT_BY_ID_CACHE_TTL_MS = 30_000;
const COMMUNITY_SNAPSHOT_CACHE_TTL_MS = 20_000;
const EVENT_LIBRARY_CACHE_TTL_MS = 5 * 60_000;
const EVENT_LIBRARY_ITEM_CACHE_TTL_MS = 5 * 60_000;
const NEWS_DRIVEN_EVENTS_CACHE_TTL_MS = 60_000;
const ACTIVE_EVENT_USERS_CACHE_TTL_MS = 15_000;
const EVENT_NOTIFICATION_STATE_CACHE_TTL_MS = 30_000;
const CIRCLE_MEMBERS_CACHE_TTL_MS = 30_000;
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
const eventByIdRequestCache = new Map<string, Promise<AppEvent | null>>();
const communitySnapshotCache = new Map<string, TimedCacheEntry<CommunitySnapshot>>();
const communitySnapshotRequestCache = new Map<string, Promise<CommunitySnapshot>>();
const eventLibraryItemsCache = new Map<string, TimedCacheEntry<EventLibraryItem[]>>();
const eventLibraryItemsRequestCache = new Map<string, Promise<EventLibraryItem[]>>();
const eventLibraryItemByIdCache = new Map<string, TimedCacheEntry<EventLibraryItem | null>>();
const eventLibraryItemByIdRequestCache = new Map<string, Promise<EventLibraryItem | null>>();
const newsDrivenEventsCache = new Map<string, TimedCacheEntry<NewsDrivenEventItem[]>>();
const newsDrivenEventsRequestCache = new Map<string, Promise<NewsDrivenEventItem[]>>();
const activeEventUsersCache = new Map<string, TimedCacheEntry<ActiveEventUserPresence[]>>();
const activeEventUsersRequestCache = new Map<string, Promise<ActiveEventUserPresence[]>>();
const eventNotificationStateCache = new Map<string, TimedCacheEntry<EventNotificationState>>();
const eventNotificationStateRequestCache = new Map<string, Promise<EventNotificationState>>();
const prayerCircleMembersCache = new Map<string, TimedCacheEntry<PrayerCircleMember[]>>();
const prayerCircleMembersRequestCache = new Map<string, Promise<PrayerCircleMember[]>>();
const eventsCircleMembersCache = new Map<string, TimedCacheEntry<PrayerCircleMember[]>>();
const eventsCircleMembersRequestCache = new Map<string, Promise<PrayerCircleMember[]>>();
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
  eventsCache.clear();
  if (eventId?.trim()) {
    eventByIdCache.delete(eventId.trim());
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

export function getCachedEvents(limit = 8) {
  return readFreshTimedCache(eventsCache, `${limit}`, EVENTS_CACHE_TTL_MS)?.value ?? null;
}

export function getCachedEventById(eventId: string) {
  const normalizedEventId = eventId.trim();
  if (!normalizedEventId) {
    return undefined;
  }

  return readFreshTimedCache(eventByIdCache, normalizedEventId, EVENT_BY_ID_CACHE_TTL_MS)?.value;
}

export function getCachedCommunitySnapshot() {
  return (
    readFreshTimedCache(communitySnapshotCache, 'default', COMMUNITY_SNAPSHOT_CACHE_TTL_MS)
      ?.value ?? null
  );
}

export function getCachedEventLibraryItems(limit = 80) {
  return (
    readFreshTimedCache(eventLibraryItemsCache, `${limit}`, EVENT_LIBRARY_CACHE_TTL_MS)?.value ??
    null
  );
}

export function getCachedEventLibraryItemById(eventTemplateId: string) {
  const normalizedId = eventTemplateId.trim();
  if (!normalizedId) {
    return undefined;
  }

  return readFreshTimedCache(
    eventLibraryItemByIdCache,
    normalizedId,
    EVENT_LIBRARY_ITEM_CACHE_TTL_MS,
  )?.value;
}

export function getCachedNewsDrivenEvents(limit = 80) {
  return (
    readFreshTimedCache(newsDrivenEventsCache, `${limit}`, NEWS_DRIVEN_EVENTS_CACHE_TTL_MS)
      ?.value ?? null
  );
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

export function getCachedPrayerCircleMembers() {
  return (
    readFreshTimedCache(prayerCircleMembersCache, 'default', CIRCLE_MEMBERS_CACHE_TTL_MS)?.value ??
    null
  );
}

export function getCachedEventsCircleMembers() {
  return (
    readFreshTimedCache(eventsCircleMembersCache, 'default', CIRCLE_MEMBERS_CACHE_TTL_MS)?.value ??
    null
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

function toSlug(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapSeedEventLibraryItem(item: EventLibrarySeedItem): EventLibraryItem {
  const duration = item.durationMinutes;
  return {
    body: item.body,
    category: item.category,
    durationMinutes: duration,
    id: item.id?.trim() || `seed-${toSlug(item.title)}`,
    script: item.script,
    startsCount: 0,
    subtitle: `${item.category} - ${formatDurationMinutes(duration)} - Manifestation room`,
    title: item.title,
  };
}

function mapEventLibraryRow(row: EventLibraryRow): EventLibraryItem {
  const duration = row.duration_minutes ?? 10;
  const starts = row.starts_count ?? 0;
  const category = row.category?.trim() || null;

  return {
    body: row.body,
    category,
    durationMinutes: duration,
    id: row.id,
    script: row.script_text,
    startsCount: starts,
    subtitle: `${category ?? 'Manifestation'} - ${formatDurationMinutes(duration)} - ${starts} starts`,
    title: row.title,
  };
}

function mapNewsDrivenEventRow(row: NewsDrivenEventRow): NewsDrivenEventItem {
  return {
    category: row.category?.trim() || 'Humanitarian',
    countryCode: row.country_code?.trim().toUpperCase() || null,
    durationMinutes: row.duration_minutes ?? 10,
    id: row.id,
    locationHint: row.location_hint?.trim() || null,
    script: row.script_text,
    sourceTitle: row.source_title?.trim() || null,
    sourceUrl: row.source_url,
    startsAt: row.starts_at,
    summary: row.summary,
    title: row.headline,
  };
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

function mapEventRow(row: EventRow, participants: number): AppEvent {
  return {
    countryCode: row.country_code,
    description: row.description,
    durationMinutes: row.duration_minutes ?? 20,
    hostNote: row.host_note,
    id: row.id,
    participants,
    region: row.region,
    startsAt: row.starts_at,
    status: row.status,
    subtitle: row.subtitle,
    title: row.title,
    visibility: row.visibility,
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

async function fetchParticipantCountsByEvent(
  eventIds: string[],
  activeWindowMinutes = 90,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (eventIds.length === 0) {
    return counts;
  }

  const cutoff = new Date(Date.now() - activeWindowMinutes * 60 * 1000);
  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id,user_id,last_seen_at,is_active')
    .in('event_id', eventIds)
    .eq('is_active', true)
    .gte('last_seen_at', toIso(cutoff));

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load event participants.'));
  }

  const rows = (data ?? []) as EventParticipantRow[];
  for (const row of rows) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  return counts;
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
      const cutoff = new Date(Date.now() - activeWindowMinutes * 60 * 1000);
      const { data, error } = await supabase
        .from('event_participants')
        .select('event_id,user_id,last_seen_at,is_active')
        .eq('is_active', true)
        .gte('last_seen_at', toIso(cutoff))
        .order('last_seen_at', { ascending: false })
        .limit(500);

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load active user presence.'));
      }

      return ((data ?? []) as EventParticipantRow[]).map((row) => ({
        eventId: row.event_id,
        lastSeenAt: row.last_seen_at,
        userId: row.user_id,
      }));
    },
  );
}

export async function fetchEvents(limit = 8): Promise<AppEvent[]> {
  const cacheKey = `${limit}`;
  return loadWithTimedCache(
    eventsCache,
    eventsRequestCache,
    cacheKey,
    EVENTS_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id,title,subtitle,description,host_note,region,country_code,starts_at,status,duration_minutes,visibility,created_at',
        )
        .in('status', ['live', 'scheduled'])
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load events.'));
      }

      const eventRows = (data ?? []) as EventRow[];
      const participantCounts = await fetchParticipantCountsByEvent(
        eventRows.map((event) => event.id),
      );

      const mappedEvents = eventRows
        .map((row) => mapEventRow(row, participantCounts.get(row.id) ?? 0))
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

export async function fetchEventById(eventId: string): Promise<AppEvent | null> {
  const normalizedEventId = eventId.trim();
  if (!normalizedEventId) {
    return null;
  }

  return loadWithTimedCache(
    eventByIdCache,
    eventByIdRequestCache,
    normalizedEventId,
    EVENT_BY_ID_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id,title,subtitle,description,host_note,region,country_code,starts_at,status,duration_minutes,visibility,created_at',
        )
        .eq('id', normalizedEventId)
        .maybeSingle();

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load event details.'));
      }

      if (!data) {
        return null;
      }

      const counts = await fetchParticipantCountsByEvent([normalizedEventId]);
      return mapEventRow(data as EventRow, counts.get(normalizedEventId) ?? 0);
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
      const nowMs = Date.now();
      const liveWindowStartIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
      const liveWindowEndIso = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();

      const [events, liveStatusResponse, liveWindowResponse] = await Promise.all([
        fetchEvents(20),
        supabase
          .from('events')
          .select(
            'id,title,subtitle,description,host_note,region,country_code,starts_at,status,duration_minutes,visibility,created_at',
          )
          .eq('status', 'live')
          .order('starts_at', { ascending: true })
          .limit(300),
        supabase
          .from('events')
          .select(
            'id,title,subtitle,description,host_note,region,country_code,starts_at,status,duration_minutes,visibility,created_at',
          )
          .in('status', ['live', 'scheduled'])
          .gte('starts_at', liveWindowStartIso)
          .lte('starts_at', liveWindowEndIso)
          .order('starts_at', { ascending: true })
          .limit(600),
      ]);

      if (liveStatusResponse.error) {
        throw new Error(
          toSupabaseErrorMessage(liveStatusResponse.error, 'Failed to load live events.'),
        );
      }
      if (liveWindowResponse.error) {
        throw new Error(
          toSupabaseErrorMessage(liveWindowResponse.error, 'Failed to load recent events.'),
        );
      }

      const liveStatusRows = (liveStatusResponse.data ?? []) as EventRow[];
      const liveWindowRows = (liveWindowResponse.data ?? []) as EventRow[];
      const liveStatusCounts = await fetchParticipantCountsByEvent(
        liveStatusRows.map((eventRow) => eventRow.id),
      );
      const liveWindowCounts = await fetchParticipantCountsByEvent(
        liveWindowRows.map((eventRow) => eventRow.id),
      );

      const liveEventsByStatus = liveStatusRows.map((row) =>
        mapEventRow(row, liveStatusCounts.get(row.id) ?? 0),
      );
      const liveEventsByTime = liveWindowRows
        .map((row) => mapEventRow(row, liveWindowCounts.get(row.id) ?? 0))
        .filter((event) => isEventLiveNow(event));
      const liveEventMap = new Map<string, AppEvent>();

      for (const liveEvent of liveEventsByStatus) {
        liveEventMap.set(liveEvent.id, liveEvent);
      }
      for (const liveEvent of liveEventsByTime) {
        if (!liveEventMap.has(liveEvent.id)) {
          liveEventMap.set(liveEvent.id, liveEvent);
        }
      }

      const liveEvents = Array.from(liveEventMap.values());
      const liveEventIds = liveEvents.map((event) => event.id);

      let uniqueActiveParticipants = 0;
      const onlineCutoff = new Date(Date.now() - 2 * 60 * 1000);

      const { data: onlinePresenceData, error: onlinePresenceError } = await supabase
        .from('app_user_presence')
        .select('user_id,is_online,last_seen_at')
        .eq('is_online', true)
        .gte('last_seen_at', toIso(onlineCutoff))
        .limit(5000);

      if (onlinePresenceError) {
        const message = toSupabaseErrorMessage(
          onlinePresenceError,
          'Failed to load online participant presence.',
        );
        if (!isMissingTableMessage(message, 'app_user_presence')) {
          throw new Error(message);
        }
      } else {
        uniqueActiveParticipants = new Set(
          ((onlinePresenceData ?? []) as AppUserPresenceRow[]).map((entry) => entry.user_id),
        ).size;
      }

      if (liveEventIds.length > 0) {
        const cutoff = new Date(Date.now() - 90 * 60 * 1000);
        const { data, error } = await supabase
          .from('event_participants')
          .select('user_id,event_id,last_seen_at,is_active')
          .in('event_id', liveEventIds)
          .eq('is_active', true)
          .gte('last_seen_at', toIso(cutoff));

        if (error) {
          throw new Error(toSupabaseErrorMessage(error, 'Failed to load community participants.'));
        }

        if (uniqueActiveParticipants === 0) {
          uniqueActiveParticipants = new Set(
            ((data ?? []) as EventParticipantRow[]).map((entry) => entry.user_id),
          ).size;
        }
      }

      const countries = new Set(
        liveEvents
          .map(
            (event) =>
              event.countryCode?.trim().toUpperCase() || event.region?.trim().toUpperCase() || null,
          )
          .filter((value): value is string => Boolean(value)),
      ).size;

      const strongestLiveEvent = liveEvents
        .slice()
        .sort((a, b) => b.participants - a.participants || a.title.localeCompare(b.title))[0];

      const prioritizedAlerts = [
        ...liveEvents
          .slice()
          .sort((a, b) => b.participants - a.participants || a.title.localeCompare(b.title)),
        ...events.filter((event) => !liveEventMap.has(event.id)),
      ];

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
    const items = rows.map((row) => {
      const duration = row.duration_minutes ?? 5;
      const starts = row.starts_count ?? 0;
      const category = row.category?.trim();
      const categoryPart = category ? `${category} • ` : '';

      return {
        body: row.body,
        category: category ?? null,
        durationMinutes: duration,
        id: row.id,
        startsCount: starts,
        subtitle: `${categoryPart}${formatDurationMinutes(duration)} • ${starts} starts`,
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

function getSeedEventLibraryItems(): EventLibraryItem[] {
  return EVENT_LIBRARY_CATALOG.map(mapSeedEventLibraryItem);
}

export async function fetchEventLibraryItems(limit = 80): Promise<EventLibraryItem[]> {
  const cacheKey = `${limit}`;
  return loadWithTimedCache(
    eventLibraryItemsCache,
    eventLibraryItemsRequestCache,
    cacheKey,
    EVENT_LIBRARY_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase
        .from('event_library_items')
        .select('id,title,body,script_text,category,duration_minutes,starts_count')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        const message = toSupabaseErrorMessage(error, 'Failed to load event library.');
        if (message.toLowerCase().includes('event_library_items')) {
          return getSeedEventLibraryItems();
        }
        throw new Error(message);
      }

      const rows = (data ?? []) as EventLibraryRow[];
      if (rows.length === 0) {
        return getSeedEventLibraryItems();
      }

      const items = rows.map(mapEventLibraryRow);
      const cachedAt = Date.now();
      for (const item of items) {
        eventLibraryItemByIdCache.set(item.id, {
          cachedAt,
          value: item,
        });
      }

      return items;
    },
  );
}

export async function fetchEventLibraryItemById(
  eventTemplateId: string,
): Promise<EventLibraryItem | null> {
  const normalizedId = eventTemplateId.trim();
  if (!normalizedId) {
    return null;
  }

  return loadWithTimedCache(
    eventLibraryItemByIdCache,
    eventLibraryItemByIdRequestCache,
    normalizedId,
    EVENT_LIBRARY_ITEM_CACHE_TTL_MS,
    async () => {
      const seedItem = getSeedEventLibraryItems().find((item) => item.id === normalizedId);

      const { data, error } = await supabase
        .from('event_library_items')
        .select('id,title,body,script_text,category,duration_minutes,starts_count')
        .eq('id', normalizedId)
        .maybeSingle();

      if (error) {
        const message = toSupabaseErrorMessage(error, 'Failed to load event template.');
        if (message.toLowerCase().includes('event_library_items')) {
          return seedItem ?? null;
        }
        throw new Error(message);
      }

      if (!data) {
        return seedItem ?? null;
      }

      return mapEventLibraryRow(data as EventLibraryRow);
    },
  );
}

export async function incrementEventLibraryStart(itemId: string) {
  if (itemId.startsWith('seed-') || EVENT_LIBRARY_CATALOG.some((item) => item.id === itemId)) {
    return;
  }

  const { data, error } = await supabase
    .from('event_library_items')
    .select('starts_count')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update event usage.'));
  }

  const nextStarts = ((data as { starts_count?: number } | null)?.starts_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from('event_library_items')
    .update({ starts_count: nextStarts })
    .eq('id', itemId);

  if (updateError) {
    throw new Error(toSupabaseErrorMessage(updateError, 'Failed to update event usage.'));
  }
}

export async function fetchNewsDrivenEvents(limit = 80): Promise<NewsDrivenEventItem[]> {
  const cacheKey = `${limit}`;
  return loadWithTimedCache(
    newsDrivenEventsCache,
    newsDrivenEventsRequestCache,
    cacheKey,
    NEWS_DRIVEN_EVENTS_CACHE_TTL_MS,
    async () => {
      const nowIso = new Date().toISOString();
      const endIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('news_driven_events')
        .select(
          'id,headline,summary,script_text,category,country_code,location_hint,duration_minutes,starts_at,source_title,source_url,event_day',
        )
        .gte('starts_at', nowIso)
        .lte('starts_at', endIso)
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (error) {
        const message = toSupabaseErrorMessage(error, 'Failed to load news driven events.');
        if (isMissingTableMessage(message, 'news_driven_events')) {
          return [];
        }
        throw new Error(message);
      }

      return ((data ?? []) as NewsDrivenEventRow[]).map(mapNewsDrivenEventRow);
    },
  );
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
      const { data, error } = await supabase
        .from('user_event_subscriptions')
        .select('scope,subscription_key')
        .eq('user_id', normalizedUserId);

      if (error) {
        const message = toSupabaseErrorMessage(
          error,
          'Failed to load event notification settings.',
        );
        if (isMissingTableMessage(message, 'user_event_subscriptions')) {
          return {
            subscribedAll: false,
            subscriptionKeys: [],
          };
        }
        throw new Error(message);
      }

      const rows = (data ?? []) as UserEventSubscriptionRow[];
      const subscriptionKeys = rows
        .filter((row) => row.scope === 'event')
        .map((row) => row.subscription_key)
        .filter((value) => value.trim().length > 0);
      const subscribedAll = rows.some((row) => row.scope === 'all');

      return {
        subscribedAll,
        subscriptionKeys,
      };
    },
  );
}

export async function setAllEventNotifications(userId: string, enabled: boolean) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
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
      if (isMissingTableMessage(message, 'user_event_subscriptions')) {
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
    if (isMissingTableMessage(message, 'user_event_subscriptions')) {
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

  if (input.enabled) {
    const { error } = await supabase.from('user_event_subscriptions').upsert(
      {
        scope: 'event',
        subscription_key: subscriptionKey,
        user_id: normalizedUserId,
      },
      {
        onConflict: 'user_id,scope,subscription_key',
      },
    );

    if (error) {
      const message = toSupabaseErrorMessage(error, 'Failed to save event notification.');
      if (isMissingTableMessage(message, 'user_event_subscriptions')) {
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
    .eq('scope', 'event')
    .eq('subscription_key', subscriptionKey);

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to save event notification.');
    if (isMissingTableMessage(message, 'user_event_subscriptions')) {
      return;
    }
    throw new Error(message);
  }

  eventNotificationStateCache.delete(normalizedUserId);
}

export async function fetchPrayerCircleMembers(): Promise<PrayerCircleMember[]> {
  return loadWithTimedCache(
    prayerCircleMembersCache,
    prayerCircleMembersRequestCache,
    'default',
    CIRCLE_MEMBERS_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase.rpc('get_prayer_circle_members');

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load prayer circle members.'));
      }

      return ((data ?? []) as PrayerCircleMemberRpcRow[]).map((row) => ({
        displayName: row.display_name?.trim() || 'Member',
        isOwner: Boolean(row.is_owner),
        joinedAt: row.joined_at,
        userId: row.user_id,
      }));
    },
  );
}

export async function fetchEventsCircleMembers(): Promise<PrayerCircleMember[]> {
  return loadWithTimedCache(
    eventsCircleMembersCache,
    eventsCircleMembersRequestCache,
    'default',
    CIRCLE_MEMBERS_CACHE_TTL_MS,
    async () => {
      const { data, error } = await supabase.rpc('get_events_circle_members');

      if (error) {
        throw new Error(toSupabaseErrorMessage(error, 'Failed to load events circle members.'));
      }

      return ((data ?? []) as PrayerCircleMemberRpcRow[]).map((row) => ({
        displayName: row.display_name?.trim() || 'Member',
        isOwner: Boolean(row.is_owner),
        joinedAt: row.joined_at,
        userId: row.user_id,
      }));
    },
  );
}

export async function searchUsersForPrayerCircle(
  query: string,
  limit = 20,
): Promise<PrayerCircleUserSuggestion[]> {
  const sanitized = query.trim();
  const { data, error } = await supabase.rpc('search_app_users_for_circle', {
    p_limit: limit,
    p_query: sanitized.length > 0 ? sanitized : null,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to search users.'));
  }

  return ((data ?? []) as PrayerCircleUserRpcRow[]).map((row) => ({
    displayName: row.display_name?.trim() || 'Member',
    userId: row.user_id,
  }));
}

export async function addPrayerCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('add_user_to_prayer_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to add user to prayer circle.'));
  }

  prayerCircleMembersCache.delete('default');
}

export async function addEventsCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('add_user_to_events_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to add user to events circle.'));
  }

  eventsCircleMembersCache.delete('default');
}

export async function removePrayerCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('remove_user_from_prayer_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove user from prayer circle.'));
  }

  prayerCircleMembersCache.delete('default');
}

export async function removeEventsCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('remove_user_from_events_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove user from events circle.'));
  }

  eventsCircleMembersCache.delete('default');
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

export async function fetchLatestIntention(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_intentions')
    .select('id,intention,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load your latest intention.'));
  }

  return ((data as UserIntentionRow | null)?.intention ?? '').trim();
}

export async function saveIntention(userId: string, intention: string) {
  const trimmed = intention.trim();
  if (!trimmed) {
    return;
  }

  const { error } = await supabase.from('user_intentions').insert({
    intention: trimmed,
    user_id: userId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to save intention.'));
  }
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

function calculateImpactChangePercent(thisWeekMinutes: number, previousWeekMinutes: number) {
  if (previousWeekMinutes === 0) {
    if (thisWeekMinutes === 0) {
      return 0;
    }
    return 100;
  }

  return Math.round(((thisWeekMinutes - previousWeekMinutes) / previousWeekMinutes) * 100);
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
      const previousWeekStart = new Date(weekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);

      const [preferences, membershipRes, eventParticipantRes, soloSessionsRes] = await Promise.all([
        fetchUserPreferences(normalizedUserId),
        supabase.from('circle_members').select('circle_id').eq('user_id', normalizedUserId),
        supabase
          .from('event_participants')
          .select('event_id,joined_at')
          .eq('user_id', normalizedUserId)
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
      if (eventParticipantRes.error) {
        throw new Error(
          toSupabaseErrorMessage(eventParticipantRes.error, 'Failed to load event participation.'),
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
          .in('circle_id', circleIds);

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

      const eventRows = (eventParticipantRes.data ?? []) as {
        event_id: string;
        joined_at: string;
      }[];
      const eventsJoinedThisWeek = new Set(
        eventRows
          .filter((row) => new Date(row.joined_at).getTime() >= weekStart.getTime())
          .map((row) => row.event_id),
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

      const previousWeekMinutes = minutesFromSeconds(
        completedSessionRows
          .filter((row) => {
            const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : 0;
            return completedAt >= previousWeekStart.getTime() && completedAt < weekStart.getTime();
          })
          .reduce((acc, row) => acc + (row.duration_seconds ?? 0), 0),
      );

      const soloStreakDays = calculateSoloStreakDays(
        completedSessionRows
          .map((row) => row.completed_at)
          .filter((value): value is string => Boolean(value)),
      );

      return {
        circleMembers,
        eventsJoinedThisWeek,
        highContrastMode: preferences.highContrastMode,
        minutesPrayed,
        sessionsThisWeek,
        soloStreakDays,
        weeklyImpactChangePercent: calculateImpactChangePercent(
          thisWeekMinutes,
          previousWeekMinutes,
        ),
      };
    },
  );
}

export async function setHighContrastMode(userId: string, enabled: boolean) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ high_contrast_mode: enabled })
    .eq('id', normalizedUserId);

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update accessibility preference.'));
  }

  userPreferencesCache.delete(normalizedUserId);
  profileSummaryCache.delete(normalizedUserId);
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
      fetchEventLibraryItems(80),
      fetchNewsDrivenEvents(80),
      fetchActiveEventUsers(15),
      fetchCommunitySnapshot(),
      fetchEventNotificationState(normalizedUserId),
      fetchUserPreferences(normalizedUserId),
      fetchProfileSummary(normalizedUserId),
      fetchUserJournalEntries(normalizedUserId),
      fetchSoloStats(normalizedUserId),
      fetchPrayerCircleMembers(),
      fetchEventsCircleMembers(),
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

export async function fetchEventRoomSnapshot(
  eventId: string,
  userId: string,
): Promise<EventRoomSnapshot> {
  const [event, participantCounts, participationState] = await Promise.all([
    fetchEventById(eventId),
    fetchParticipantCountsByEvent([eventId]),
    supabase
      .from('event_participants')
      .select('event_id,user_id,is_active,last_seen_at,joined_at')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (!event) {
    throw new Error('Event not found.');
  }

  if (participationState.error) {
    throw new Error(
      toSupabaseErrorMessage(participationState.error, 'Failed to load event room state.'),
    );
  }

  const participantState = participationState.data as EventParticipantRow | null;

  return {
    event: {
      ...event,
      participants: participantCounts.get(eventId) ?? 0,
    },
    isJoined: Boolean(participantState?.is_active),
    joinedCount: participantCounts.get(eventId) ?? 0,
  };
}

export async function joinEventRoom(eventId: string, userId: string) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('event_participants').upsert(
    {
      event_id: eventId,
      is_active: true,
      joined_at: nowIso,
      last_seen_at: nowIso,
      user_id: userId,
    },
    {
      onConflict: 'event_id,user_id',
    },
  );

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to join room.'));
  }

  invalidateEventRuntimeCaches(eventId);
}

export async function leaveEventRoom(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_participants')
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to leave room.'));
  }

  invalidateEventRuntimeCaches(eventId);
}

export async function refreshEventPresence(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_participants')
    .update({
      is_active: true,
      last_seen_at: new Date().toISOString(),
    })
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to refresh room presence.'));
  }

  activeEventUsersCache.clear();
  if (eventId.trim()) {
    eventByIdCache.delete(eventId.trim());
  }
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
