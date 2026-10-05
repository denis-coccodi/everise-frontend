// The largest upload the backend takes, and the largest side kept: wider
// than any post, so pictures stay sharp.
export const MAX_UPLOAD_BYTES = 1024 * 1024;
export const MAX_SIDE = 2048;

// Draws the picture at width × height pixels and encodes it.
export interface ImageRenderer {
  readonly width: number;
  readonly height: number;
  encode(width: number, height: number, type: string, quality: number): Promise<Blob>;
}

// Formats a picture can keep; GIFs are handled apart, for their animation.
const KEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LIGHT_TYPE = 'image/webp';
const QUALITIES = [0.85, 0.75, 0.65, 0.55];
// Each shrink step keeps 85% of the sides, down to this longest side.
const SHRINK = 0.85;
const MIN_SIDE = 320;

export const GIF_TOO_LARGE =
  'GIFs keep their animation, so they can be at most 1 MB. Try a smaller one, the GIF search, or a link.';

// The file to upload: as it is when it already fits (and isn't huge);
// otherwise at most 2048 pixels on its longest side, in its own format if
// that fits, else as WebP (JPEG where the browser can't write WebP),
// lowering the quality and then the size until it's under 1 MB. A GIF is
// never re-encoded, which would lose its animation.
export async function fitImage(file: Blob, renderer: () => Promise<ImageRenderer>): Promise<Blob> {
  if (file.type === 'image/gif') {
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error(GIF_TOO_LARGE);
  }

  const image = await renderer();
  const longest = Math.max(image.width, image.height);
  if (file.size <= MAX_UPLOAD_BYTES && longest <= MAX_SIDE) return file;

  let scale = Math.min(1, MAX_SIDE / longest);
  const size = () => [Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale))];

  const [width, height] = size();
  const kept = await image.encode(width, height, KEPT_TYPES.includes(file.type) ? file.type : 'image/png', 0.92);
  if (kept.size <= MAX_UPLOAD_BYTES) return kept;

  // Browsers that can't write a format return a PNG instead.
  const probe = await image.encode(width, height, LIGHT_TYPE, QUALITIES[0]);
  const lightType = probe.type === LIGHT_TYPE ? LIGHT_TYPE : 'image/jpeg';

  for (;;) {
    const [w, h] = size();
    for (const quality of QUALITIES) {
      const blob = await image.encode(w, h, lightType, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    if (Math.max(w, h) <= MIN_SIDE) break;
    scale = Math.max(MIN_SIDE / longest, scale * SHRINK);
  }
  throw new Error("This picture can't be made small enough. Choose a simpler one.");
}

// Renders a picture file through a canvas.
export async function canvasRenderer(file: Blob): Promise<ImageRenderer> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This picture can't be opened. Choose another one, such as a PNG or JPEG.");
  }
  return {
    width: bitmap.width,
    height: bitmap.height,
    encode(width, height, type, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return Promise.reject(new Error("This browser can't resize pictures."));
      context.imageSmoothingQuality = 'high';
      if (type === 'image/jpeg') {
        // JPEG has no transparency: transparent areas become white, not black.
        // Picture content, not a page style, so not a theme colour.
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(bitmap, 0, 0, width, height);
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
