import { Notification } from '@everise/core/api-types';
import { notificationAge, notificationLink, notificationParts } from './notification-text';
import type { NotificationPart } from './notification-text.model';

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
    partyFinder: null,
    role: null,
    ...changes,
  };
}

// The sentence as words, its links in brackets: "[Alisaie] liked your post [Coil tonight]".
const sentence = (parts: NotificationPart[]) =>
  parts.map((part) => (part.kind === 'link' ? `[${part.text}]` : part.text)).join('');

const links = (parts: NotificationPart[]) =>
  parts.flatMap((part) => (part.kind === 'link' ? [{ path: part.path, query: part.query }] : []));

const ended = (changes: Partial<Notification> = {}) =>
  notification({
    id: 'pf-ended:share-1',
    type: 'pf-ended',
    actors: [],
    actorCount: 0,
    article: null,
    partyFinder: { listingId: 'light-1-1', dataCentre: 'Light', title: 'The Omega Protocol (Ultimate)' },
    ...changes,
  });

describe('notification text', () => {
  it('names who liked or commented on which post, and who followed', () => {
    expect(sentence(notificationParts(notification()))).toBe('[Alisaie] liked your post [Coil tonight]');
    expect(sentence(notificationParts(notification({ type: 'comment' })))).toBe(
      '[Alisaie] commented on your post [Coil tonight]',
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
    expect(links(notificationParts(notification()))).toEqual([
      { path: ['/profile', 'id-Alisaie'], query: undefined },
      { path: ['/article', 'post-1'], query: undefined },
    ]);
    expect(notificationLink(notification())).toEqual({ path: ['/article', 'post-1'] });
    expect(notificationLink(notification({ type: 'follow', article: null }))).toEqual({
      path: ['/profile', 'id-Alisaie'],
    });
  });

  it('says a shared listing ended, linked to its data centre, or to the post it was shared as', () => {
    expect(sentence(notificationParts(ended()))).toBe(
      'Your shared listing [The Omega Protocol (Ultimate)] on Light is no longer up: it filled up, ended or was taken down',
    );
    expect(notificationLink(ended())).toEqual({ path: ['/party-finder'], query: { dc: 'light' } });
    const asPost = ended({ article: { id: 'post-9', title: 'Party Finder: The Omega Protocol (Ultimate)' } });
    expect(links(notificationParts(asPost))).toEqual([{ path: ['/article', 'post-9'] }]);
  });

  it('says what an admin made the member, linked to their settings', () => {
    const role = (name: string) => notification({ type: 'role', role: name, actors: [], actorCount: 0, article: null });
    expect(sentence(notificationParts(role('staging-tester')))).toBe('An admin made you a staging tester');
    expect(sentence(notificationParts(role('user')))).toBe('An admin made you a member');
    expect(notificationLink(role('user'))).toEqual({ path: ['/settings'] });
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
