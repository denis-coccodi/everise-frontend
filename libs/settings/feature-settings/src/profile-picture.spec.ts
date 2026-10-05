import { checkChosenFile } from './profile-picture';

const file = (type: string, bytes = 100) => new File([new Uint8Array(bytes)], 'picture', { type });

describe('checkChosenFile', () => {
  it('accepts any picture, whatever its size in pixels', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']) {
      expect(checkChosenFile(file(type))).toBeNull();
    }
  });

  it('turns away other files, SVG drawings and huge files', () => {
    expect(checkChosenFile(file('text/plain'))).toBe('Choose a picture, such as a PNG, JPEG or WebP file.');
    expect(checkChosenFile(file('image/svg+xml'))).toBe('Choose a picture, such as a PNG, JPEG or WebP file.');
    expect(checkChosenFile(file('image/jpeg', 25 * 1024 * 1024))).toBe(
      'The file is too large to edit (25 MB): choose one under 20 MB.',
    );
  });
});
