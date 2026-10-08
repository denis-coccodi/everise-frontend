import { Schemas } from './schemas';

// Who's online on the Discord server, for signed-in members; null when the
// server's widget is turned off.
export type DiscordWidgetResponse = Schemas['DiscordWidgetResponse'];

// Whether members can share in the Everise Discord (its webhook is set).
export type DiscordSharingResponse = Schemas['DiscordSharingResponse'];
