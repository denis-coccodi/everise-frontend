import { Notification } from '@everise/core/api-types';
import { NotificationPart, notificationAge, notificationLink, notificationParts } from './notification-text';

const member = (username: string) => ({ id: `id-${username}`, username, image: `/${username}.png` });

function notification(changes: Partial<Notification> = {}): Notification {
  return {
    id: 'favorite:post-1',
    type: 'favorite',
    at: '2026-10-13T10:00:00.000Z',
    seen: false,
    read: false,
    actors: [member('Alisaie')],
    actorCount: 1,
    article: { id: 'post-1', title: 'Coil tonight' },
    comment: null,
    ...changes,
  };
}

// The sentence as words, members and posts marked: "[Alisaie] liked your post <Coil tonight>".
const sentence = (parts: NotificationPart[]) =>
  parts
    .map((part) =>
      part.kind === 'actor' ? `[${part.actor.username}]` : part.kind === 'post' ? `<${part.title}>` : part.text,
    )
    .join('');

describe('notification text', () => {
  it('names who liked or commented on which post, and who followed', () => {
    expect(sentence(notificationParts(notification()))).toBe('[Alisaie] liked your post <Coil tonight>');
    expect(sentence(notificationParts(notification({ type: 'comment' })))).toBe(
      '[Alisaie] commented on your post <Coil tonight>',
    );
    expect(sentence(notificationParts(notification({ type: 'follow', article: null })))).toBe(
      '[Alisaie] started following you',
    );
  });

  it('names up to three members, then counts the others, as Facebook does', () => {
    const [a, b, c] = ['Alisaie', 'Alphinaud', 'Tataru'].map(member);
    const who = (actors: Notification['actors'], actorCount: number) =>
      sentence(notificationParts(notification({ type: 'follow', article: null, actors, actorCount })));

    expect(who([a, b], 2)).toBe('[Alisaie] and [Alphinaud] started following you');
    expect(who([a, b, c], 3)).toBe('[Alisaie], [Alphinaud] and [Tataru] started following you');
    expect(who([a, b, c], 5)).toBe('[Alisaie], [Alphinaud] and 3 others started following you');
  });

  it('links each member to their profile and the post to itself', () => {
    const parts = notificationParts(notification());
    expect(parts[0]).toEqual({ kind: 'actor', actor: member('Alisaie') });
    expect(parts.at(-1)).toEqual({ kind: 'post', id: 'post-1', title: 'Coil tonight' });
    expect(notificationLink(notification())).toEqual(['/article', 'post-1']);
    expect(notificationLink(notification({ type: 'follow', article: null }))).toEqual(['/profile', 'id-Alisaie']);
  });

  it('says how long ago, shortly', () => {
    const at = Date.parse('2026-10-13T10:00:00.000Z');
    const age = (minutes: number) => notificationAge('2026-10-13T10:00:00.000Z', at + minutes * 60000);
    expect(age(0)).toBe('just now');
    expect(age(5)).toBe('5 min');
    expect(age(180)).toBe('3 h');
    expect(age(2 * 24 * 60)).toBe('2 d');
    expect(age(30 * 24 * 60)).toMatch(/13/);
  });
});
