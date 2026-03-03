import 'react-native-url-polyfill/auto';

import { useEffect, useMemo } from 'react';

import { AppRoot } from './src/app/AppRoot';
import type { CaptureNavigationTarget } from './src/app/navigation/types';

function parseCaptureTargetFromHash(): CaptureNavigationTarget | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const locationHash =
    typeof window.location?.hash === 'string' ? window.location.hash : undefined;

  if (!locationHash) {
    return undefined;
  }

  const hash = locationHash.startsWith('#') ? locationHash.slice(1) : locationHash;

  if (!hash || !hash.includes('figmacapture=')) {
    return undefined;
  }

  const params = new URLSearchParams(hash);
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
    prayerlibrary: 'PrayerLibrary',
    solohome: 'SoloHome',
    sololive: 'SoloLive',
    solosetup: 'SoloSetup',
  };

  const eventsRouteMap: Record<string, CaptureNavigationTarget['eventsRoute']> = {
    eventdetails: 'EventDetails',
    eventroom: 'EventRoom',
    eventshome: 'EventsHome',
  };

  const profileRouteMap: Record<string, CaptureNavigationTarget['profileRoute']> = {
    profilehome: 'ProfileHome',
  };

  const communityRouteMap: Record<string, CaptureNavigationTarget['communityRoute']> = {
    communityhome: 'CommunityHome',
  };

  const target: CaptureNavigationTarget = {};
  const mappedRoot: CaptureNavigationTarget['root'] =
    rootParam === 'auth' ? 'auth' : rootParam === 'main' ? 'main' : undefined;
  const mappedTab = tabParam ? tabMap[tabParam] : undefined;
  const mappedSoloRoute = soloRouteParam ? soloRouteMap[soloRouteParam] : undefined;
  const mappedEventsRoute = eventsRouteParam ? eventsRouteMap[eventsRouteParam] : undefined;
  const mappedProfileRoute = profileRouteParam ? profileRouteMap[profileRouteParam] : undefined;
  const mappedCommunityRoute = communityRouteParam
    ? communityRouteMap[communityRouteParam]
    : undefined;

  if (mappedRoot) {
    target.root = mappedRoot;
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

  if (Object.keys(target).length === 0) {
    return undefined;
  }

  return target;
}

export default function App() {
  const captureTarget = useMemo(() => parseCaptureTargetFromHash(), []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const locationHash =
      typeof window.location?.hash === 'string' ? window.location.hash : undefined;

    if (!locationHash || !locationHash.includes('figmacapture=')) {
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
