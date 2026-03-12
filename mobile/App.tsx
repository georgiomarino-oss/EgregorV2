import 'react-native-url-polyfill/auto';

import { useEffect, useMemo } from 'react';

import { AppRoot } from './src/app/AppRoot';
import { initializeCrashReporting } from './src/lib/observability';
import type { CaptureNavigationTarget } from './src/app/navigation/types';

initializeCrashReporting();

function parseCaptureTargetFromHash(): CaptureNavigationTarget | undefined {
  if (!__DEV__) {
    return undefined;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const locationHash = typeof window.location?.hash === 'string' ? window.location.hash : undefined;

  if (!locationHash) {
    return undefined;
  }

  const hash = locationHash.startsWith('#') ? locationHash.slice(1) : locationHash;

  if (!hash || (!hash.includes('figmacapture=') && !hash.includes('figmatarget='))) {
    return undefined;
  }

  const params = new URLSearchParams(hash);
  const quickTargetParam = params.get('figmatarget')?.trim().toLowerCase();
  const tabParam = params.get('figmatab')?.trim().toLowerCase();
  const rootParam = params.get('figmaroot')?.trim().toLowerCase();
  const soloRouteParam = params.get('figmasoloroute')?.trim().toLowerCase();
  const eventsRouteParam = params.get('figmaeventsroute')?.trim().toLowerCase();
  const profileRouteParam = params.get('figmaprofileroute')?.trim().toLowerCase();
  const communityRouteParam = params.get('figmacommunityroute')?.trim().toLowerCase();

  const tabMap: Record<string, CaptureNavigationTarget['tab']> = {
    community: 'CommunityTab',
    communitytab: 'CommunityTab',
    events: 'EventsTab',
    eventstab: 'EventsTab',
    profile: 'ProfileTab',
    profiletab: 'ProfileTab',
    solo: 'SoloTab',
    solotab: 'SoloTab',
  };

  const soloRouteMap: Record<string, CaptureNavigationTarget['soloRoute']> = {
    solohome: 'SoloHome',
    sololive: 'SoloLive',
  };

  const eventsRouteMap: Record<string, CaptureNavigationTarget['eventsRoute']> = {
    eventdetails: 'EventDetails',
    eventroom: 'EventRoom',
    eventshome: 'EventsHome',
  };

  const profileRouteMap: Record<string, CaptureNavigationTarget['profileRoute']> = {
    profilehome: 'ProfileHome',
    profilesettings: 'ProfileSettings',
  };

  const communityRouteMap: Record<string, CaptureNavigationTarget['communityRoute']> = {
    communityhome: 'CommunityHome',
  };

  const target: CaptureNavigationTarget = {};
  const captureEventStartAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
  const quickTargetMap: Record<string, CaptureNavigationTarget> = {
    auth: { root: 'auth' },
    communityhome: { root: 'main', tab: 'CommunityTab', communityRoute: 'CommunityHome' },
    entry: { root: 'entry' },
    eventdetails: {
      eventDetailsParams: { occurrenceId: '00000000-0000-0000-0000-000000000000' },
      eventsRoute: 'EventDetails',
      root: 'main',
      tab: 'EventsTab',
    },
    eventroom: {
      eventRoomParams: {
        durationMinutes: 10,
        eventTitle: 'Global Harmonic Prayer',
        occurrenceId: '00000000-0000-0000-0000-000000000000',
        scheduledStartAt: captureEventStartAt,
        scriptText:
          'Breathe together in one steady rhythm. Let gratitude rise and settle through the room. Hold one intention for healing and peace.',
      },
      eventsRoute: 'EventRoom',
      root: 'main',
      tab: 'EventsTab',
    },
    eventshome: { root: 'main', tab: 'EventsTab', eventsRoute: 'EventsHome' },
    missingenv: { root: 'missingEnv' },
    profile: { root: 'main', tab: 'ProfileTab', profileRoute: 'ProfileHome' },
    profilesettings: { root: 'main', tab: 'ProfileTab', profileRoute: 'ProfileSettings' },
    solohost: {
      root: 'main',
      soloParams: { captureSharedRole: 'host' },
      soloRoute: 'SoloLive',
      tab: 'SoloTab',
    },
    soloparticipant: {
      root: 'main',
      soloParams: { captureSharedRole: 'participant', sharedSessionId: 'capture-preview' },
      soloRoute: 'SoloLive',
      tab: 'SoloTab',
    },
  };
  if (quickTargetParam && quickTargetMap[quickTargetParam]) {
    return quickTargetMap[quickTargetParam];
  }

  const mappedRoot: CaptureNavigationTarget['root'] =
    rootParam === 'auth' ? 'auth' : rootParam === 'main' ? 'main' : undefined;
  const mappedExtendedRoot: CaptureNavigationTarget['root'] =
    rootParam === 'entry' ? 'entry' : rootParam === 'missingenv' ? 'missingEnv' : mappedRoot;
  const mappedTab = tabParam ? tabMap[tabParam] : undefined;
  const mappedSoloRoute = soloRouteParam ? soloRouteMap[soloRouteParam] : undefined;
  const mappedEventsRoute = eventsRouteParam ? eventsRouteMap[eventsRouteParam] : undefined;
  const mappedProfileRoute = profileRouteParam ? profileRouteMap[profileRouteParam] : undefined;
  const mappedCommunityRoute = communityRouteParam
    ? communityRouteMap[communityRouteParam]
    : undefined;

  if (mappedExtendedRoot) {
    target.root = mappedExtendedRoot;
  }
  if (mappedTab) {
    target.tab = mappedTab;
  }
  if (mappedSoloRoute) {
    target.soloRoute = mappedSoloRoute;
  }
  if (mappedEventsRoute) {
    target.eventsRoute = mappedEventsRoute;
  }
  if (mappedProfileRoute) {
    target.profileRoute = mappedProfileRoute;
  }
  if (mappedCommunityRoute) {
    target.communityRoute = mappedCommunityRoute;
  }

  const soloPreviewRoleParam = params.get('figmasolopreview')?.trim().toLowerCase();
  if (soloPreviewRoleParam === 'participant' || soloPreviewRoleParam === 'host') {
    const soloParams: NonNullable<CaptureNavigationTarget['soloParams']> = {
      captureSharedRole: soloPreviewRoleParam,
    };
    if (soloPreviewRoleParam === 'participant') {
      soloParams.sharedSessionId = 'capture-preview';
    }
    target.soloParams = soloParams;
    if (!target.soloRoute) {
      target.soloRoute = 'SoloLive';
    }
    if (!target.tab) {
      target.tab = 'SoloTab';
    }
    if (!target.root) {
      target.root = 'main';
    }
  }

  if (Object.keys(target).length === 0) {
    return undefined;
  }

  return target;
}

export default function App() {
  const captureTarget = useMemo(() => parseCaptureTargetFromHash(), []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const locationHash =
      typeof window.location?.hash === 'string' ? window.location.hash : undefined;

    if (
      !locationHash ||
      (!locationHash.includes('figmacapture=') && !locationHash.includes('figmatarget='))
    ) {
      return;
    }

    const existing = document.querySelector('script[data-egregor-figma-capture="true"]');
    if (existing) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    script.async = true;
    script.dataset.egregorFigmaCapture = 'true';
    document.head.appendChild(script);
  }, []);

  return <AppRoot {...(captureTarget ? { captureTarget } : {})} />;
}
