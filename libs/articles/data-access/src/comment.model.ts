import type { NewAttachment } from '@everise/core/api-types';

import { Attachment } from '@everise/core/api-types';
import { Profile } from '@everise/core/api-types';

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

// A comment as written: text, and at most one attachment.
export interface NewComment {
  body: string;
  media: NewAttachment[];
}
