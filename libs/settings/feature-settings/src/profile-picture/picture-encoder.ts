import { SquareCrop } from '@everise/ui/components';
import { MAX_PICTURE_BYTES, MAX_PICTURE_SIDE } from './profile-picture';

// Draws the chosen square at side × side pixels and encodes it.
export interface PictureRenderer {
  encode(side: number, type: string, quality: number): Promise<Blob>;
}

// Formats the cropped picture can keep; anything else (a GIF) becomes PNG.
const KEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// The lighter format, and the quality steps tried before shrinking further.
const LIGHT_TYPE = 'image/webp';
const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];
// Each shrink step keeps 85% of the side, down to this.
const SHRINK = 0.85;
const MIN_SIDE = 96;

// The cropped picture, at most 500 × 500 and 300 KB:
// 1. in its own format, if that fits;
// 2. otherwise as WebP (JPEG in browsers that can't write WebP), lowering the
//    quality and then the size until it fits.
export async function encodePicture(
  renderer: PictureRenderer,
  crop: SquareCrop,
  sourceType: string,
  limits = { maxBytes: MAX_PICTURE_BYTES, maxSide: MAX_PICTURE_SIDE },
): Promise<Blob> {
  let side = Math.min(Math.round(crop.size), limits.maxSide);

  const kept = await renderer.encode(side, KEPT_TYPES.includes(sourceType) ? sourceType : 'image/png', 0.92);
  if (kept.size <= limits.maxBytes) return kept;

  // Browsers that can't write a format return a PNG instead.
  const probe = await renderer.encode(side, LIGHT_TYPE, QUALITIES[0]);
  const lightType = probe.type === LIGHT_TYPE ? LIGHT_TYPE : 'image/jpeg';

  for (;;) {
    for (const quality of QUALITIES) {
      const blob = await renderer.encode(side, lightType, quality);
      if (blob.size <= limits.maxBytes) return blob;
    }
    if (side <= MIN_SIDE) break;
    side = Math.max(MIN_SIDE, Math.round(side * SHRINK));
  }
  throw new Error("The picture can't be made small enough. Choose a simpler one.");
}

// Renders from the picture shown in the cropper.
export function canvasRenderer(source: CanvasImageSource, crop: SquareCrop): PictureRenderer {
  return {
    encode(side, type, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const context = canvas.getContext('2d');
      if (!context) return Promise.reject(new Error("This browser can't edit pictures."));
      context.imageSmoothingQuality = 'high';
      if (type === 'image/jpeg') {
        // JPEG has no transparency: transparent areas become white, not black.
        // Picture content, not a page style, so not a theme colour.
        context.fillStyle = 'white';
        context.fillRect(0, 0, side, side);
      }
      context.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, side, side);
      return new Promise((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("The picture couldn't be saved."))),
          type,
          quality,
        ),
      );
    },
  };
}
