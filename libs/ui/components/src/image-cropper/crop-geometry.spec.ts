import { centeredCrop, clampCrop, cropSizeRange, moveCrop, resizeCrop, resizeFromCorner } from './crop-geometry';

const landscape = { width: 800, height: 600 };

describe('crop geometry', () => {
  it('starts with the largest square in the middle', () => {
    expect(centeredCrop(landscape)).toEqual({ x: 100, y: 0, size: 600 });
    expect(centeredCrop({ width: 300, height: 500 })).toEqual({ x: 0, y: 100, size: 300 });
  });

  it('allows sizes from 32 pixels (or the whole image, if smaller) to the shorter side', () => {
    expect(cropSizeRange(landscape)).toEqual({ min: 32, max: 600 });
    expect(cropSizeRange({ width: 20, height: 40 })).toEqual({ min: 20, max: 20 });
  });

  it('keeps a crop inside the image', () => {
    expect(clampCrop({ x: -50, y: 700, size: 1000 }, landscape)).toEqual({ x: 0, y: 0, size: 600 });
    expect(clampCrop({ x: 790, y: 590, size: 100 }, landscape)).toEqual({ x: 700, y: 500, size: 100 });
  });

  it('moves, stopping at the edges', () => {
    const crop = { x: 100, y: 100, size: 200 };
    expect(moveCrop(crop, 50, -20, landscape)).toEqual({ x: 150, y: 80, size: 200 });
    expect(moveCrop(crop, 900, 900, landscape)).toEqual({ x: 600, y: 400, size: 200 });
  });

  it('resizes around the centre, within the limits', () => {
    const crop = { x: 300, y: 200, size: 200 };
    expect(resizeCrop(crop, 100, landscape)).toEqual({ x: 350, y: 250, size: 100 });
    expect(resizeCrop(crop, 10, landscape)).toEqual({ x: 384, y: 284, size: 32 });
    // Growing past an edge shifts the square back inside.
    expect(resizeCrop(crop, 600, landscape)).toEqual({ x: 100, y: 0, size: 600 });
  });

  it('resizes from the bottom-right corner, keeping the top-left corner', () => {
    const crop = { x: 100, y: 100, size: 200 };
    expect(resizeFromCorner(crop, 100, landscape)).toEqual({ x: 100, y: 100, size: 300 });
    // Only as far as the bottom edge allows.
    expect(resizeFromCorner(crop, 1000, landscape)).toEqual({ x: 100, y: 100, size: 500 });
    expect(resizeFromCorner(crop, -1000, landscape)).toEqual({ x: 100, y: 100, size: 32 });
  });
});
