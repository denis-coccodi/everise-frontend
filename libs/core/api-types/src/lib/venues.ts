import { Schemas } from './schemas';

// A data centre's player-run venues opening this week, as FFXIV Venues
// (ffxivvenues.com) lists them.
export type VenueList = Schemas['VenuesResponse'];

export type Venue = VenueList['venues'][number];

export type VenueDataCentre = VenueList['dataCentre'];
