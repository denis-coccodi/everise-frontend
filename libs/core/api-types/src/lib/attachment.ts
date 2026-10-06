// An image, GIF or YouTube video attached to a post (up to 4) or a comment
// (one), shown apart from the text.
export type Attachment =
  | {
      kind: 'image' | 'gif';
      // An upload (this site's /api/media/:id), a GIPHY GIF, or any https image.
      url: string;
      // What it shows, for people who can't see it.
      alt?: string;
      // Its size, when known, so the page keeps its space while it loads.
      width?: number;
      height?: number;
    }
  | {
      kind: 'video';
      // A plain YouTube watch link.
      url: string;
      videoId: string;
      start?: number;
      alt?: string;
    };

// What the site sends: the backend works out a video's id.
export type NewAttachment = Pick<Attachment, 'kind' | 'url' | 'alt'> & { width?: number; height?: number };

export const MAX_POST_ATTACHMENTS = 4;
export const MAX_COMMENT_ATTACHMENTS = 1;
