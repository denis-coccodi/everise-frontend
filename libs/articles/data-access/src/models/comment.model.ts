import { Attachment } from '@realworld/core/api-types';
import { Profile } from '@realworld/core/api-types';

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
  media: Attachment | null;
}
