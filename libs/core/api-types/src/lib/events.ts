import { Schemas } from './schemas';

// The community's Final Fantasy XIV events going on or starting this week,
// as Partake (partake.gg) lists them: rated at most MATURE.
export type EventList = Schemas['EventsResponse'];

// One event as the lists show it. Not "Event": that is the DOM's.
export type CommunityEvent = EventList['events'][number];

export type EventAgeRating = CommunityEvent['ageRating'];

// An event's own page: what its card shows, and the organisers'
// description (Markdown).
export type EventPage = Schemas['EventPageResponse'];

export type EventDetail = EventPage['event'];

// The venue on the site an event is surely held at, to link to its page.
export type EventVenue = NonNullable<EventPage['venue']>;

// Sharing an event in the Everise Discord.
export type NewEventDiscordShare = Schemas['NewEventDiscordShare'];
export type EventDiscordShareResponse = Schemas['EventDiscordShareResponse'];
