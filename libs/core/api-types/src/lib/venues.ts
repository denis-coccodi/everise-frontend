import { Schemas } from './schemas';

// A data centre's player-run venues opening this week, as FFXIV Venues
// (ffxivvenues.com) lists them.
export type VenueList = Schemas['VenuesResponse'];

export type Venue = VenueList['venues'][number];

export type VenueDataCentre = VenueList['dataCentre'];

// The data centres with venues, by region.
export type VenueRegions = Schemas['VenueRegionsResponse'];

// A venue's own page: what its card shows, its data centre, its next
// opening (null when none is set) and its regular openings.
export type VenuePage = Schemas['VenuePageResponse'];

export type VenueDetail = VenuePage['venue'];

export type ScheduledOpening = VenueDetail['schedule'][number];

// Sharing a venue in the Everise Discord.
export type NewVenueDiscordShare = Schemas['NewVenueDiscordShare'];
export type VenueDiscordShareResponse = Schemas['VenueDiscordShareResponse'];
