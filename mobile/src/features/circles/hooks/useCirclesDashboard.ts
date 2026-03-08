import { useCallback, useEffect, useState } from 'react';

import {
  listMyCircles,
  listPendingCircleInvites,
  listSharedWithMe,
  type CanonicalCircleSummary,
  type CircleInviteSummary,
} from '../../../lib/api/circles';

interface CirclesDashboardState {
  error: string | null;
  loading: boolean;
  myCircles: CanonicalCircleSummary[];
  pendingInvites: CircleInviteSummary[];
  refreshing: boolean;
  sharedCircles: CanonicalCircleSummary[];
}

export function useCirclesDashboard() {
  const [state, setState] = useState<CirclesDashboardState>({
    error: null,
    loading: true,
    myCircles: [],
    pendingInvites: [],
    refreshing: false,
    sharedCircles: [],
  });

  const load = useCallback(async (refresh = false) => {
    setState((current) => ({
      ...current,
      ...(refresh
        ? { refreshing: true }
        : {
            loading: true,
          }),
    }));

    try {
      const [myCircles, sharedCircles, pendingInvites] = await Promise.all([
        listMyCircles(),
        listSharedWithMe(),
        listPendingCircleInvites(),
      ]);

      setState({
        error: null,
        loading: false,
        myCircles,
        pendingInvites,
        refreshing: false,
        sharedCircles,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load circles and invites.';

      setState((current) => ({
        ...current,
        error: message,
        loading: false,
        refreshing: false,
      }));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(false);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [load]);

  return {
    ...state,
    reload: () => load(true),
  };
}

export type { CirclesDashboardState };
