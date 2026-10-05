import { PictureRenderer, encodePicture } from './picture-encoder';

// A stand-in for the canvas: a picture's weight grows with its area, and
// lossy formats get lighter with lower quality.
function fakeRenderer(bytesPerPixel: Record<string, number>, writes = ['image/png', 'image/jpeg', 'image/webp']) {
  const calls: string[] = [];
  const renderer: PictureRenderer = {
    async encode(side, type, quality) {
      calls.push(`${type} ${side} ${quality}`);
      const written = writes.includes(type) ? type : 'image/png';
      const weight = written === 'image/png' ? 1 : quality;
      return new Blob([new Uint8Array(Math.round(side * side * bytesPerPixel[written] * weight))], {
        type: written,
      });
    },
  };
  return { renderer, calls };
}

const limits = { maxBytes: 300 * 1024, maxSide: 500 };

describe('encodePicture', () => {
  it('keeps the format when the cropped picture already fits', async () => {
    const { renderer, calls } = fakeRenderer({ 'image/png': 1 });

    const blob = await encodePicture(renderer, { x: 0, y: 0, size: 400 }, 'image/png', limits);

    expect(blob.type).toBe('image/png');
    expect(calls).toEqual(['image/png 400 0.92']);
  });

  it('scales a large crop down to 500 pixels', async () => {
    const { renderer, calls } = fakeRenderer({ 'image/jpeg': 0.5 });

    await encodePicture(renderer, { x: 0, y: 0, size: 3000 }, 'image/jpeg', limits);

    expect(calls[0]).toBe('image/jpeg 500 0.92');
  });

  it('switches a heavy picture to WebP and lowers the quality until it fits', async () => {
    // 500 × 500 PNG: 1 MB; WebP at quality q: 1.6 × q bytes per pixel.
    const { renderer, calls } = fakeRenderer({ 'image/png': 4, 'image/webp': 1.6 });

    const blob = await encodePicture(renderer, { x: 0, y: 0, size: 500 }, 'image/png', limits);

    expect(blob.type).toBe('image/webp');
    expect(blob.size).toBeLessThanOrEqual(limits.maxBytes);
    expect(calls).toEqual(['image/png 500 0.92', 'image/webp 500 0.85', 'image/webp 500 0.85', 'image/webp 500 0.75']);
  });

  it('shrinks the picture when even the lowest quality is too heavy', async () => {
    const { renderer, calls } = fakeRenderer({ 'image/png': 8, 'image/webp': 4 });

    const blob = await encodePicture(renderer, { x: 0, y: 0, size: 500 }, 'image/png', limits);

    expect(blob.size).toBeLessThanOrEqual(limits.maxBytes);
    // 500 and 425 pixels are too heavy even at the lowest quality.
    expect(calls.at(-1)).toBe('image/webp 361 0.55');
  });

  it("uses JPEG in browsers that can't write WebP, and makes a GIF a PNG", async () => {
    const { renderer, calls } = fakeRenderer({ 'image/png': 4, 'image/jpeg': 1.6 }, ['image/png', 'image/jpeg']);

    const blob = await encodePicture(renderer, { x: 0, y: 0, size: 500 }, 'image/gif', limits);

    expect(calls[0]).toBe('image/png 500 0.92');
    expect(blob.type).toBe('image/jpeg');
  });

  it('gives up with a message when nothing fits', async () => {
    const { renderer } = fakeRenderer({ 'image/png': 100, 'image/webp': 100 });

    await expect(encodePicture(renderer, { x: 0, y: 0, size: 500 }, 'image/png', limits)).rejects.toThrow(
      "The picture can't be made small enough. Choose a simpler one.",
    );
  });
});
