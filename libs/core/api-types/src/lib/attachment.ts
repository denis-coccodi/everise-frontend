import { Schemas } from './schemas';

// An image, GIF or YouTube video attached to a post (up to 4) or a comment
// (one), shown apart from the text.
export type Attachment = Schemas['Attachment'];

// What the site sends: the backend works out a video's id.
export type NewAttachment = Schemas['NewAttachment'];

export const MAX_POST_ATTACHMENTS = 4;
export const MAX_COMMENT_ATTACHMENTS = 1;
