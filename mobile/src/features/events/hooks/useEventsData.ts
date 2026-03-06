import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchActiveEventUsers,
  fetchEventLibraryItems,
  fetchEvents,
  fetchNewsDrivenEvents,
  getCachedActiveEventUsers,
  getCachedEventLibraryItems,
  getCachedEvents,
  getCachedNewsDrivenEvents,
  type ActiveEventUserPresence,
  type AppEvent,
  type EventLibraryItem,
  type NewsDrivenEventItem,
} from '../../../lib/api/data';
import { supabase } from '../../../lib/supabase';

interface UseEventsDataResult {
  activePresence: ActiveEventUserPresence[];
  error: string | null;
  events: AppEvent[];
  libraryError: string | null;
  libraryItems: EventLibraryItem[];
  libraryLoading: boolean;
  loading: boolean;
  newsItems: NewsDrivenEventItem[];
  newsSyncError: string | null;
  nowTick: number;
  reloadActivePresence: () => Promise<void>;
  reloadEvents: () => Promise<void>;
  reloadLibrary: () => Promise<void>;
  reloadNewsEvents: () => Promise<void>;
}

export function useEventsData(): UseEventsDataResult {
  const initialEventsRef = useRef<AppEvent[]>(getCachedEvents(120) ?? []);
  const initialLibraryItemsRef = useRef<EventLibraryItem[]>(getCachedEventLibraryItems(80) ?? []);
  const initialNewsItemsRef = useRef<NewsDrivenEventItem[]>(getCachedNewsDrivenEvents(80) ?? []);
  const initialPresenceRef = useRef<ActiveEventUserPresence[]>(getCachedActiveEventUsers(15) ?? []);
  const hasHydratedEventsRef = useRef(initialEventsRef.current.length > 0);
  const hasHydratedLibraryRef = useRef(initialLibraryItemsRef.current.length > 0);

  const [events, setEvents] = useState<AppEvent[]>(initialEventsRef.current);
  const [loading, setLoading] = useState(initialEventsRef.current.length === 0);
  const [error, setError] = useState<string | null>(null);

  const [libraryItems, setLibraryItems] = useState<EventLibraryItem[]>(
    initialLibraryItemsRef.current,
  );
  const [libraryLoading, setLibraryLoading] = useState(initialLibraryItemsRef.current.length === 0);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [newsItems, setNewsItems] = useState<NewsDrivenEventItem[]>(initialNewsItemsRef.current);
  const [newsSyncError, setNewsSyncError] = useState<string | null>(null);

  const [activePresence, setActivePresence] = useState<ActiveEventUserPresence[]>(
    initialPresenceRef.current,
  );

  const [nowTick, setNowTick] = useState(() => Date.now());

  const reloadEvents = useCallback(async () => {
    if (!hasHydratedEventsRef.current) {
      setLoading(true);
    }

    try {
      const nextEvents = await fetchEvents(120);
      setEvents(nextEvents);
      hasHydratedEventsRef.current = nextEvents.length > 0;
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadLibrary = useCallback(async () => {
    if (!hasHydratedLibraryRef.current) {
      setLibraryLoading(true);
    }

    try {
      const nextLibraryItems = await fetchEventLibraryItems(80);
      setLibraryItems(nextLibraryItems);
      hasHydratedLibraryRef.current = nextLibraryItems.length > 0;
      setLibraryError(null);
    } catch (nextError) {
      setLibraryError(
        nextError instanceof Error ? nextError.message : 'Failed to load event library.',
      );
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const reloadNewsEvents = useCallback(async () => {
    try {
      const nextNewsItems = await fetchNewsDrivenEvents(80);
      setNewsItems(nextNewsItems);
      setNewsSyncError(null);
    } catch {
      setNewsItems([]);
      setNewsSyncError('Could not load news-driven events.');
    }
  }, []);

  const reloadActivePresence = useCallback(async () => {
    try {
      const nextPresence = await fetchActiveEventUsers(15);
      setActivePresence(nextPresence);
    } catch {
      setActivePresence([]);
    }
  }, []);

  useEffect(() => {
    void reloadEvents();
    void reloadLibrary();
    void reloadNewsEvents();
    void reloadActivePresence();
  }, [reloadActivePresence, reloadEvents, reloadLibrary, reloadNewsEvents]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void reloadEvents();
      void reloadNewsEvents();
      void reloadActivePresence();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [reloadActivePresence, reloadEvents, reloadNewsEvents]);

  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void reloadEvents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_driven_events' }, () => {
        void reloadNewsEvents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => {
        void reloadActivePresence();
        void reloadEvents();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reloadActivePresence, reloadEvents, reloadNewsEvents]);

  return {
    activePresence,
    error,
    events,
    libraryError,
    libraryItems,
    libraryLoading,
    loading,
    newsItems,
    newsSyncError,
    nowTick,
    reloadActivePresence,
    reloadEvents,
    reloadLibrary,
    reloadNewsEvents,
  };
}
