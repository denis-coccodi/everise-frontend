import { Schemas } from './schemas';

// A data centre's Party Finder listings, as xivpf.com collects them.
export type PartyFinderBoard = Schemas['PartyFinderResponse'];

export type PartyFinderListing = PartyFinderBoard['listings'][number];

export type DataCentre = PartyFinderBoard['dataCentre'];

export type PartyRole = PartyFinderListing['slots'][number]['roles'][number];

// Sharing a listing: as a post (optionally in Discord too), or in Discord only.
export type NewPartyFinderPost = Schemas['NewPartyFinderPost'];
export type NewPartyFinderDiscordShare = Schemas['NewPartyFinderDiscordShare'];
export type PartyFinderDiscordShareResponse = Schemas['PartyFinderDiscordShareResponse'];
