import { Notification, NotificationActor } from '@everise/core/api-types';

// Where a link in the header goes: a route, and its query when it has one.
export interface NotificationTarget {
  path: string[];
  query?: Record<string, string>;
}

// A notification's sentence, in parts: plain words, or a link (a member to
// their profile, the post, the Party Finder).
export type NotificationPart = { kind: 'text'; text: string } | ({ kind: 'link'; text: string } & NotificationTarget);

const text = (value: string): NotificationPart => ({ kind: 'text', text: value });
const link = (value: string, target: NotificationTarget): NotificationPart => ({
  kind: 'link',
  text: value,
  ...target,
});
const actor = (value: NotificationActor) => link(value.username, { path: ['/profile', value.id] });

// What an admin made the member, in words.
const ROLE_NAMES: Record<string, string> = { 'staging-tester': 'a staging tester', user: 'a member' };

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
  const post = notification.article;
  const onPost = (verb: string): NotificationPart[] =>
    post ? [text(` ${verb} your post `), link(post.title || 'Untitled', { path: ['/article', post.id] })] : [];
  switch (notification.type) {
    case 'favorite':
      return [...names(notification.actors, notification.actorCount), ...onPost('liked')];
    case 'comment':
      return [...names(notification.actors, notification.actorCount), ...onPost('commented on')];
    case 'follow':
      return [...names(notification.actors, notification.actorCount), text(' started following you')];
    case 'pf-ended': {
      const listing = notification.partyFinder;
      if (!listing) return [text('A Party Finder listing you shared is no longer up')];
      return [
        text('Your shared listing '),
        link(listing.title, notificationLink(notification)),
        text(` on ${listing.dataCentre} is no longer up: it filled up, ended or was taken down`),
      ];
    }
    case 'role':
      return [text(`An admin made you ${ROLE_NAMES[notification.role ?? ''] ?? notification.role}`)];
  }
}

// Where opening the notification leads: the post; a follower's profile; an
// ended listing's data centre on the Party Finder (or the post it was shared
// as); for a new role, the settings.
export function notificationLink(notification: Notification): NotificationTarget {
  if (notification.article) return { path: ['/article', notification.article.id] };
  if (notification.partyFinder) {
    return { path: ['/party-finder'], query: { dc: notification.partyFinder.dataCentre.toLowerCase() } };
  }
  if (notification.type === 'role') return { path: ['/settings'] };
  return { path: ['/profile', notification.actors[0]?.id ?? ''] };
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
