import { GIF_TOO_LARGE, ImageRenderer, MAX_UPLOAD_BYTES, fitImage } from './image-fitter';

const MB = 1024 * 1024;

// A picture whose encoded size depends on its pixels, format and quality,
// like a real one: PNG is heavy, WebP and JPEG lighter as quality drops.
function fakeRenderer(width: number, height: number, canWriteWebp = true) {
  const calls: string[] = [];
  const renderer: ImageRenderer = {
    width,
    height,
    async encode(w, h, type, quality) {
      calls.push(`${w}x${h} ${type} ${quality}`);
      const written = type === 'image/webp' && !canWriteWebp ? 'image/png' : type;
      const bytesPerPixel = written === 'image/png' ? 2 : quality * 0.8;
      return new Blob([new Uint8Array(Math.round(w * h * bytesPerPixel))], { type: written });
    },
  };
  return { calls, renderer: async () => renderer };
}

const file = (bytes: number, type: string) => new Blob([new Uint8Array(bytes)], { type });

describe('fitImage', () => {
  it('keeps a picture that already fits', async () => {
    const small = file(200_000, 'image/png');
    const { calls, renderer } = fakeRenderer(800, 600);

    expect(await fitImage(small, renderer)).toBe(small);
    expect(calls).toEqual([]);
  });

  it('keeps a GIF up to 1 MB, never re-encoding it, and refuses a bigger one', async () => {
    const gif = file(900_000, 'image/gif');
    const { calls, renderer } = fakeRenderer(500, 500);

    expect(await fitImage(gif, renderer)).toBe(gif);
    await expect(fitImage(file(MB + 1, 'image/gif'), renderer)).rejects.toThrow(GIF_TOO_LARGE);
    expect(calls).toEqual([]);
  });

  it('brings a very wide picture down to 2048 pixels, in its own format when that fits', async () => {
    const { calls, renderer } = fakeRenderer(4000, 1000);

    const fitted = await fitImage(file(900_000, 'image/jpeg'), renderer);

    expect(calls).toEqual(['2048x512 image/jpeg 0.92']);
    expect(fitted.type).toBe('image/jpeg');
    expect(fitted.size).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);
  });

  it('turns a heavy photo into WebP, lowering the quality, then the size, until it fits', async () => {
    const { calls, renderer } = fakeRenderer(4032, 3024);

    const fitted = await fitImage(file(6 * MB, 'image/png'), renderer);

    expect(fitted.type).toBe('image/webp');
    expect(fitted.size).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);
    expect(calls[0]).toBe('2048x1536 image/png 0.92');
    // Smaller and smaller until a quality fits.
    expect(calls.at(-1)).toMatch(/^\d+x\d+ image\/webp 0\.\d+$/);
    const [w] = calls.at(-1)!.split('x').map(Number);
    expect(w).toBeLessThan(2048);
  });

  it('uses JPEG where the browser cannot write WebP', async () => {
    const { renderer } = fakeRenderer(3000, 3000, false);

    const fitted = await fitImage(file(5 * MB, 'image/png'), renderer);

    expect(fitted.type).toBe('image/jpeg');
    expect(fitted.size).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);
  });
});
