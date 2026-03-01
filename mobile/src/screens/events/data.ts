export type EventStatus = 'live' | 'scheduled';

export interface EventItem {
  id: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  status: EventStatus;
  title: string;
}

export interface PresenceUser {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

export const sampleEvents: EventItem[] = [
  {
    id: 'event-1',
    latitude: 51.5072,
    longitude: -0.1276,
    startsAt: 'Live now',
    status: 'live',
    title: 'London Dawn Prayer',
  },
  {
    id: 'event-2',
    latitude: 40.7128,
    longitude: -74.006,
    startsAt: 'Today 19:00',
    status: 'scheduled',
    title: 'NYC Evening Manifestation',
  },
  {
    id: 'event-3',
    latitude: -33.8688,
    longitude: 151.2093,
    startsAt: 'Live now',
    status: 'live',
    title: 'Sydney Unity Circle',
  },
  {
    id: 'event-4',
    latitude: 35.6764,
    longitude: 139.65,
    startsAt: 'Tomorrow 07:30',
    status: 'scheduled',
    title: 'Tokyo Community Intention',
  },
];

export const samplePresenceUsers: PresenceUser[] = [
  { id: 'user-1', latitude: 52.52, longitude: 13.405, name: 'Mina' },
  { id: 'user-2', latitude: -23.5505, longitude: -46.6333, name: 'Ravi' },
  { id: 'user-3', latitude: 37.7749, longitude: -122.4194, name: 'Elena' },
];
