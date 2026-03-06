import { useCallback, useEffect, useState } from 'react';

import {
  fetchEventNotificationState,
  getCachedEventNotificationState,
  setAllEventNotifications,
  setEventNotificationSubscription,
} from '../../../lib/api/data';
import { supabase } from '../../../lib/supabase';

interface UseEventNotificationsInput {
  onError?: (message: string | null) => void;
}

interface UseEventNotificationsResult {
  subscribedAll: boolean;
  subscribedKeys: string[];
  toggleOccurrenceSubscription: (occurrenceKey: string) => Promise<void>;
  updatingSubscriptionKey: string | null;
  userId: string | null;
}

export function useEventNotifications({
  onError,
}: UseEventNotificationsInput = {}): UseEventNotificationsResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [subscribedAll, setSubscribedAll] = useState(false);
  const [subscribedKeys, setSubscribedKeys] = useState<string[]>([]);
  const [updatingSubscriptionKey, setUpdatingSubscriptionKey] = useState<string | null>(null);

  const loadNotificationState = useCallback(async (nextUserId: string) => {
    const cachedState = getCachedEventNotificationState(nextUserId);
    if (cachedState) {
      setSubscribedAll(cachedState.subscribedAll);
      setSubscribedKeys(cachedState.subscriptionKeys);
    }

    try {
      const state = await fetchEventNotificationState(nextUserId);
      setSubscribedAll(state.subscribedAll);
      setSubscribedKeys(state.subscriptionKeys);
    } catch {
      setSubscribedAll(false);
      setSubscribedKeys([]);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateUser = async () => {
      const { data } = await supabase.auth.getUser();
      const nextUserId = data.user?.id ?? null;
      if (!active) {
        return;
      }

      setUserId(nextUserId);
      if (nextUserId) {
        await loadNotificationState(nextUserId);
      }
    };

    void hydrateUser();

    return () => {
      active = false;
    };
  }, [loadNotificationState]);

  const toggleOccurrenceSubscription = useCallback(
    async (occurrenceKey: string) => {
      if (!userId) {
        onError?.('Sign in to subscribe for event notifications.');
        return;
      }

      setUpdatingSubscriptionKey(occurrenceKey);
      try {
        if (subscribedAll) {
          await setAllEventNotifications(userId, false);
          await setEventNotificationSubscription({
            enabled: true,
            subscriptionKey: occurrenceKey,
            userId,
          });
          setSubscribedAll(false);
          setSubscribedKeys([occurrenceKey]);
        } else if (subscribedKeys.includes(occurrenceKey)) {
          await setEventNotificationSubscription({
            enabled: false,
            subscriptionKey: occurrenceKey,
            userId,
          });
          setSubscribedKeys((current) => current.filter((value) => value !== occurrenceKey));
        } else {
          await setEventNotificationSubscription({
            enabled: true,
            subscriptionKey: occurrenceKey,
            userId,
          });
          setSubscribedKeys((current) => [...current, occurrenceKey]);
        }

        onError?.(null);
      } catch (nextError) {
        onError?.(
          nextError instanceof Error ? nextError.message : 'Failed to update subscriptions.',
        );
      } finally {
        setUpdatingSubscriptionKey(null);
      }
    },
    [onError, subscribedAll, subscribedKeys, userId],
  );

  return {
    subscribedAll,
    subscribedKeys,
    toggleOccurrenceSubscription,
    updatingSubscriptionKey,
    userId,
  };
}
