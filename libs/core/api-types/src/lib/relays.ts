import { Schemas } from './schemas';

// The Weekly and Hunts tabs: what the Everise Discord relays from the
// channels it follows, 1:1 (Discord's Markdown, emoji and times).
export type WeeklyResponse = Schemas['WeeklyResponse'];
export type HuntsResponse = Schemas['HuntsResponse'];

// The latest Fashion Report or Island Sanctuary season, with its days.
export type WeeklyPost = NonNullable<WeeklyResponse['fashionReport']>;
export type HuntTrain = HuntsResponse['posts'][number];

export type RelayMessage = Schemas['RelayMessage'];
export type RelayEmbed = Schemas['RelayEmbed'];
export type RelayImage = Schemas['RelayImage'];
export type RelayAttachment = RelayMessage['attachments'][number];
