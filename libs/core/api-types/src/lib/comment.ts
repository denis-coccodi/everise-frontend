import { Attachment } from './attachment';
import { Profile } from './profile';

export interface SingleCommentResponse {
  comment: Comment;
}

export interface MultipleCommentsResponse {
  comments: Comment[];
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Profile;
  // One image, GIF or video, or null.
  media: Attachment | null;
}
