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

function formatEventSubtitle(event: AppEvent) {
  if (event.status === 'live') {
    return `${event.participants} active now`;
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

function rankEventStatus(status: EventStatus) {
  if (status === 'live') {
    return 0;
  }

  if (status === 'scheduled') {
    return 1;
  }

  if (status === 'completed') {
    return 2;
  }

  return 3;
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
}

export async function fetchEvents(limit = 8): Promise<AppEvent[]> {
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
  const participantCounts = await fetchParticipantCountsByEvent(eventRows.map((event) => event.id));

  return eventRows
    .map((row) => mapEventRow(row, participantCounts.get(row.id) ?? 0))
    .sort((a, b) => {
      const rankDiff = rankEventStatus(a.status) - rankEventStatus(b.status);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
}

export async function fetchEventById(eventId: string): Promise<AppEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(
      'id,title,subtitle,description,host_note,region,country_code,starts_at,status,duration_minutes,visibility,created_at',
    )
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to load event details.'));
  }

  if (!data) {
    return null;
  }

  const counts = await fetchParticipantCountsByEvent([eventId]);
  return mapEventRow(data as EventRow, counts.get(eventId) ?? 0);
}

export async function fetchCommunitySnapshot(): Promise<CommunitySnapshot> {
  const events = await fetchEvents(12);
  const liveEvents = events.filter((event) => event.status === 'live');
  const liveEventIds = liveEvents.map((event) => event.id);

  let uniqueActiveParticipants = 0;

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

    uniqueActiveParticipants = new Set(
      ((data ?? []) as EventParticipantRow[]).map((entry) => entry.user_id),
    ).size;
  }

  const countries = new Set(
    liveEvents
      .map((event) => event.countryCode ?? event.region)
      .filter((value): value is string => Boolean(value && value.trim())),
  ).size;

  const strongestLiveEvent = liveEvents
    .slice()
    .sort((a, b) => b.participants - a.participants || a.title.localeCompare(b.title))[0];

  const alerts = events.slice(0, 2).map((event) => ({
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
}

export async function fetchPrayerLibraryItems(): Promise<PrayerLibraryItem[]> {
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
  return rows.map((row) => {
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
}

function getSeedEventLibraryItems(): EventLibraryItem[] {
  return EVENT_LIBRARY_CATALOG.map(mapSeedEventLibraryItem);
}

export async function fetchEventLibraryItems(limit = 80): Promise<EventLibraryItem[]> {
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

  return rows.map(mapEventLibraryRow);
}

export async function fetchEventLibraryItemById(
  eventTemplateId: string,
): Promise<EventLibraryItem | null> {
  const normalizedId = eventTemplateId.trim();
  if (!normalizedId) {
    return null;
  }

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
}

export async function fetchEventNotificationState(userId: string): Promise<EventNotificationState> {
  const { data, error } = await supabase
    .from('user_event_subscriptions')
    .select('scope,subscription_key')
    .eq('user_id', userId);

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to load event notification settings.');
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
}

export async function setAllEventNotifications(userId: string, enabled: boolean) {
  if (enabled) {
    const { error } = await supabase.from('user_event_subscriptions').upsert(
      {
        scope: 'all',
        subscription_key: '*',
        user_id: userId,
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

    return;
  }

  const { error } = await supabase
    .from('user_event_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('scope', 'all')
    .eq('subscription_key', '*');

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to update all-event notifications.');
    if (isMissingTableMessage(message, 'user_event_subscriptions')) {
      return;
    }
    throw new Error(message);
  }
}

export async function setEventNotificationSubscription(input: {
  enabled: boolean;
  subscriptionKey: string;
  userId: string;
}) {
  const subscriptionKey = input.subscriptionKey.trim();
  if (!subscriptionKey) {
    return;
  }

  if (input.enabled) {
    const { error } = await supabase.from('user_event_subscriptions').upsert(
      {
        scope: 'event',
        subscription_key: subscriptionKey,
        user_id: input.userId,
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

    return;
  }

  const { error } = await supabase
    .from('user_event_subscriptions')
    .delete()
    .eq('user_id', input.userId)
    .eq('scope', 'event')
    .eq('subscription_key', subscriptionKey);

  if (error) {
    const message = toSupabaseErrorMessage(error, 'Failed to save event notification.');
    if (isMissingTableMessage(message, 'user_event_subscriptions')) {
      return;
    }
    throw new Error(message);
  }
}

export async function fetchPrayerCircleMembers(): Promise<PrayerCircleMember[]> {
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
}

export async function fetchEventsCircleMembers(): Promise<PrayerCircleMember[]> {
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
}

export async function addEventsCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('add_user_to_events_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to add user to events circle.'));
  }
}

export async function removePrayerCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('remove_user_from_prayer_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove user from prayer circle.'));
  }
}

export async function removeEventsCircleMember(targetUserId: string) {
  const { error } = await supabase.rpc('remove_user_from_events_circle', {
    p_target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to remove user from events circle.'));
  }
}

export async function fetchUserJournalEntries(userId: string): Promise<UserJournalEntry[]> {
  const { data, error } = await supabase
    .from('user_journal_entries')
    .select('id,content,created_at,updated_at')
    .eq('user_id', userId)
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
}

export async function createUserJournalEntry(input: {
  content: string;
  userId: string;
}): Promise<UserJournalEntry> {
  const { data, error } = await supabase
    .from('user_journal_entries')
    .insert({
      content: input.content,
      user_id: input.userId,
    })
    .select('id,content,created_at,updated_at')
    .single();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to create journal entry.'));
  }

  const row = data as UserJournalEntryRow;
  return {
    content: row.content ?? '',
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
  };
}

export async function updateUserJournalEntry(input: {
  content: string;
  entryId: string;
  userId: string;
}): Promise<UserJournalEntry> {
  const { data, error } = await supabase
    .from('user_journal_entries')
    .update({
      content: input.content,
    })
    .eq('id', input.entryId)
    .eq('user_id', input.userId)
    .select('id,content,created_at,updated_at')
    .single();

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update journal entry.'));
  }

  const row = data as UserJournalEntryRow;
  return {
    content: row.content ?? '',
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
  };
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
  title: string;
}): Promise<string | null> {
  const title = input.title.trim();
  if (!title) {
    return null;
  }

  const language = input.language?.trim() || 'en';

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
      toSupabaseErrorMessage(prayerItemError, 'Failed to load prayer library item for script.'),
    );
  }

  const prayerLibraryItemId = (prayerItem as { id?: string } | null)?.id;
  if (!prayerLibraryItemId) {
    return null;
  }

  const { data: scriptRow, error: scriptError } = await supabase
    .from('prayer_library_scripts')
    .select('id,script_text,duration_minutes,language')
    .eq('prayer_library_item_id', prayerLibraryItemId)
    .eq('duration_minutes', input.durationMinutes)
    .eq('language', language)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scriptError) {
    throw new Error(toSupabaseErrorMessage(scriptError, 'Failed to load prayer script variant.'));
  }

  const script = ((scriptRow as PrayerLibraryScriptRow | null)?.script_text ?? '').trim();
  if (!script) {
    return null;
  }

  return script;
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
  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: userId,
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
    .eq('id', userId)
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
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const [preferences, membershipRes, eventParticipantRes, soloSessionsRes] = await Promise.all([
    fetchUserPreferences(userId),
    supabase.from('circle_members').select('circle_id').eq('user_id', userId),
    supabase
      .from('event_participants')
      .select('event_id,joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false }),
    supabase
      .from('solo_sessions')
      .select('id,duration_seconds,completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),
  ]);

  if (membershipRes.error) {
    throw new Error(toSupabaseErrorMessage(membershipRes.error, 'Failed to load circle stats.'));
  }
  if (eventParticipantRes.error) {
    throw new Error(
      toSupabaseErrorMessage(eventParticipantRes.error, 'Failed to load event participation.'),
    );
  }
  if (soloSessionsRes.error) {
    throw new Error(toSupabaseErrorMessage(soloSessionsRes.error, 'Failed to load solo stats.'));
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
      throw new Error(toSupabaseErrorMessage(error, 'Failed to load circle membership counts.'));
    }

    circleMembers = new Set(
      ((data ?? []) as { user_id: string }[])
        .map((row) => row.user_id)
        .filter((memberId) => memberId !== userId),
    ).size;
  }

  const eventRows = (eventParticipantRes.data ?? []) as { event_id: string; joined_at: string }[];
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
    weeklyImpactChangePercent: calculateImpactChangePercent(thisWeekMinutes, previousWeekMinutes),
  };
}

export async function setHighContrastMode(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ high_contrast_mode: enabled })
    .eq('id', userId);

  if (error) {
    throw new Error(toSupabaseErrorMessage(error, 'Failed to update accessibility preference.'));
  }
}

export async function fetchSoloStats(userId: string): Promise<SoloStats> {
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const todayStart = startOfDay(now);

  const { data, error } = await supabase
    .from('solo_sessions')
    .select('id,duration_seconds,completed_at')
    .eq('user_id', userId)
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
}
