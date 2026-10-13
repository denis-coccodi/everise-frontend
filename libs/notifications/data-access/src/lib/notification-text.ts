import { Notification, NotificationActor } from '@everise/core/api-types';

// A notification's sentence, in parts the header links: a member (their
// profile), the post (the post), or plain words.
export type NotificationPart =
  | { kind: 'text'; text: string }
  | { kind: 'actor'; actor: NotificationActor }
  | { kind: 'post'; id: string; title: string };

const text = (value: string): NotificationPart => ({ kind: 'text', text: value });
const actor = (value: NotificationActor): NotificationPart => ({ kind: 'actor', actor: value });

// Who did it, as Facebook says it: "Alisaie", "Alisaie and Alphinaud",
// "Alisaie, Alphinaud and Tataru", "Alisaie, Alphinaud and 3 others".
function names(actors: NotificationActor[], count: number): NotificationPart[] {
  const [first, second, third] = actors;
  if (count <= 1 || !second) return [actor(first)];
  if (count === 2 || !third) return [actor(first), text(' and '), actor(second)];
  if (count === 3) return [actor(first), text(', '), actor(second), text(' and '), actor(third)];
  return [actor(first), text(', '), actor(second), text(` and ${count - 2} others`)];
}

export function notificationParts(notification: Notification): NotificationPart[] {
  const who = names(notification.actors, notification.actorCount);
  const post = notification.article;
  const onPost = (verb: string): NotificationPart[] =>
    post ? [text(` ${verb} your post `), { kind: 'post', id: post.id, title: post.title || 'Untitled' }] : [];
  switch (notification.type) {
    case 'favorite':
      return [...who, ...onPost('liked')];
    case 'comment':
      return [...who, ...onPost('commented on')];
    case 'follow':
      return [...who, text(' started following you')];
  }
}

// Where opening the notification leads: the post, or the follower's profile.
export function notificationLink(notification: Notification): string[] {
  return notification.article ? ['/article', notification.article.id] : ['/profile', notification.actors[0]?.id ?? ''];
}

// "just now", "5 min", "3 h", "2 d", then the date: how long ago.
export function notificationAge(at: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(at)) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
