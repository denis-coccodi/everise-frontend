// Where a link in the header goes: a route, and its query when it has one.
export interface NotificationTarget {
  path: string[];
  query?: Record<string, string>;
}

// A notification's sentence, in parts: plain words, or a link (a member to
// their profile, the post, the Party Finder).
export type NotificationPart = { kind: 'text'; text: string } | ({ kind: 'link'; text: string } & NotificationTarget);
