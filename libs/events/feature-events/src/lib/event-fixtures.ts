import { CommunityEvent, EventDetail, EventList } from '@everise/core/api-types';

// Realistic events and lists for the specs.
const HOUR = 3_600_000;

// An event starting `startsIn` hours from now (negative: on since), for
// four hours.
export function communityEvent(id: number, startsIn: number, changes: Partial<CommunityEvent> = {}): CommunityEvent {
  const starts = Date.now() + startsIn * HOUR;
  return {
    id,
    title: `Event ${id}`,
    summary: 'Bring a date and dance the night away.',
    startsAt: new Date(starts).toISOString(),
    endsAt: new Date(starts + 4 * HOUR).toISOString(),
    live: startsIn <= 0,
    ageRating: 'EVERYONE',
    dataCentre: 'Light',
    world: 'Odin',
    location: 'Empyreum, Ward 30, Plot 52',
    tags: ['Bars & Lounges', 'Live DJs'],
    banner: `https://cdn.partake.gg/assets/${id}.webp`,
    recurring: false,
    attendees: 11,
    team: {
      name: 'Club Noir',
      icon: 'https://cdn.partake.gg/assets/icon.webp',
      discord: 'https://discord.gg/example',
      website: null,
    },
    url: `https://www.partake.gg/events/${id}`,
    ...changes,
  };
}

export function eventDetail(changes: Partial<EventDetail> = {}): EventDetail {
  return {
    ...communityEvent(56133, 2),
    description: '## Tonight\n\nBring a **date** and [dance](https://example.com) the night away.',
    ...changes,
  };
}

export function eventList(changes: Partial<EventList> = {}): EventList {
  return {
    fetchedAt: new Date().toISOString(),
    events: [
      communityEvent(1, -1),
      communityEvent(2, 2, { dataCentre: 'Chaos', world: 'Omega', ageRating: 'MATURE' }),
      communityEvent(3, 30),
    ],
    ...changes,
  };
}
