import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchActiveEventUsers,
  getCachedActiveEventUsers,
  getCachedEventFeed,
  listEventFeed,
  type ActiveEventUserPresence,
  type CanonicalEventOccurrence,
} from '../../../lib/api/data';
import { supabase } from '../../../lib/supabase';

interface UseEventsDataResult {
  activePresence: ActiveEventUserPresence[];
  activePresenceError: string | null;
  loading: boolean;
  nowTick: number;
  occurrences: CanonicalEventOccurrence[];
  occurrencesError: string | null;
  reloadActivePresence: () => Promise<void>;
  reloadOccurrences: () => Promise<void>;
}

export function useEventsData(): UseEventsDataResult {
  const initialOccurrencesRef = useRef<CanonicalEventOccurrence[]>(
    getCachedEventFeed({ horizonHours: 120 }) ?? [],
  );
  const initialPresenceRef = useRef<ActiveEventUserPresence[]>(getCachedActiveEventUsers(15) ?? []);
  const hasHydratedOccurrencesRef = useRef(initialOccurrencesRef.current.length > 0);

  const [occurrences, setOccurrences] = useState<CanonicalEventOccurrence[]>(
    initialOccurrencesRef.current,
  );
  const [loading, setLoading] = useState(initialOccurrencesRef.current.length === 0);
  const [occurrencesError, setOccurrencesError] = useState<string | null>(null);

  const [activePresence, setActivePresence] = useState<ActiveEventUserPresence[]>(
    initialPresenceRef.current,
  );
  const [activePresenceError, setActivePresenceError] = useState<string | null>(null);

  const [nowTick, setNowTick] = useState(() => Date.now());

  const reloadOccurrences = useCallback(async () => {
    if (!hasHydratedOccurrencesRef.current) {
      setLoading(true);
    }

    try {
      const nextOccurrences = await listEventFeed({ horizonHours: 120 });
      setOccurrences(nextOccurrences);
      hasHydratedOccurrencesRef.current = nextOccurrences.length > 0;
      setOccurrencesError(null);
    } catch (nextError) {
      setOccurrencesError(
        nextError instanceof Error ? nextError.message : 'Failed to load live feed.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadActivePresence = useCallback(async () => {
    try {
      const nextPresence = await fetchActiveEventUsers(15);
      setActivePresence(nextPresence);
      setActivePresenceError(null);
    } catch (nextError) {
      setActivePresence([]);
      setActivePresenceError(
        nextError instanceof Error ? nextError.message : 'Failed to load live presence.',
      );
    }
  }, []);

  useEffect(() => {
    void reloadOccurrences();
    void reloadActivePresence();
  }, [reloadActivePresence, reloadOccurrences]);

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
      void reloadOccurrences();
      void reloadActivePresence();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [reloadActivePresence, reloadOccurrences]);

  useEffect(() => {
    const channel = supabase
      .channel('live-events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_occurrences' },
        () => {
          void reloadOccurrences();
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        void reloadOccurrences();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants' }, () => {
        void reloadOccurrences();
        void reloadActivePresence();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reloadActivePresence, reloadOccurrences]);

  return {
    activePresence,
    activePresenceError,
    loading,
    nowTick,
    occurrences,
    occurrencesError,
    reloadActivePresence,
    reloadOccurrences,
  };
}
