// A square crop of an image, in the image's own pixels.
export interface SquareCrop {
  x: number;
  y: number;
  size: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

// The smallest square the crop can shrink to, unless the image is smaller.
export const MIN_CROP_SIDE = 32;

// The largest square in the middle of the image: the starting crop.
export function centeredCrop(image: ImageSize): SquareCrop {
  const size = Math.min(image.width, image.height);
  return { x: (image.width - size) / 2, y: (image.height - size) / 2, size };
}

// The size limits of a crop within this image.
export function cropSizeRange(image: ImageSize) {
  const max = Math.min(image.width, image.height);
  return { min: Math.min(MIN_CROP_SIDE, max), max };
}

// Keeps a crop inside the image and within the size limits.
export function clampCrop(crop: SquareCrop, image: ImageSize): SquareCrop {
  const { min, max } = cropSizeRange(image);
  const size = Math.min(max, Math.max(min, crop.size));
  return {
    x: Math.min(image.width - size, Math.max(0, crop.x)),
    y: Math.min(image.height - size, Math.max(0, crop.y)),
    size,
  };
}

// Moves the crop by (dx, dy) image pixels, stopping at the edges.
export function moveCrop(crop: SquareCrop, dx: number, dy: number, image: ImageSize): SquareCrop {
  return clampCrop({ ...crop, x: crop.x + dx, y: crop.y + dy }, image);
}

// Resizes the crop around its centre, as far as the image allows.
export function resizeCrop(crop: SquareCrop, size: number, image: ImageSize): SquareCrop {
  const { min, max } = cropSizeRange(image);
  const next = Math.min(max, Math.max(min, size));
  const centre = { x: crop.x + crop.size / 2, y: crop.y + crop.size / 2 };
  return clampCrop({ x: centre.x - next / 2, y: centre.y - next / 2, size: next }, image);
}

// Resizes the crop from its bottom-right corner by `delta` image pixels,
// keeping its top-left corner where it is when there's room.
export function resizeFromCorner(crop: SquareCrop, delta: number, image: ImageSize): SquareCrop {
  const { min } = cropSizeRange(image);
  const room = Math.min(image.width - crop.x, image.height - crop.y);
  const size = Math.min(room, Math.max(min, crop.size + delta));
  return clampCrop({ ...crop, size }, image);
}
