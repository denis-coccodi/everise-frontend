import { MAX_PICTURE_BYTES, checkPicture } from './profile-picture';

const file = (type: string, bytes = 100) => new File([new Uint8Array(bytes)], 'picture', { type });
const sized = (width: number, height: number) => async () => ({ width, height });

describe('checkPicture', () => {
  it('accepts a PNG, JPEG, WebP or GIF within the limits', async () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(await checkPicture(file(type), sized(500, 500))).toBeNull();
    }
  });

  it('explains each limit', async () => {
    expect(await checkPicture(file('image/svg+xml'), sized(10, 10))).toBe('Choose a PNG, JPEG, WebP or GIF picture.');
    expect(await checkPicture(file('image/png', MAX_PICTURE_BYTES + 1), sized(10, 10))).toBe(
      'The picture is too large (301 KB): it can be at most 300 KB.',
    );
    expect(await checkPicture(file('image/png'), sized(501, 300))).toBe(
      'The picture is 501 × 300 pixels; it can be at most 500 × 500.',
    );
    expect(await checkPicture(file('image/png'), async () => null)).toBe(
      "That picture can't be opened. Choose another file.",
    );
  });
});
