import 'rxjs';

// What the member wrote, whether a post goes to Discord too, and the
// picture of the listing's card for Discord, when the browser made one.
export interface ShareChoice {
  comment: string;
  shareToDiscord: boolean;
  picture?: Blob;
}

// How a member shares a listing: as a post in the feeds, or in the Everise
// Discord only.
export type ShareWay = 'post' | 'discord';
