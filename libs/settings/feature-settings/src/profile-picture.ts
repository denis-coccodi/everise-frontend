// The limits on a profile picture, the same as the backend's
// (src/users/profile-images-service.ts there): checked here first, so a file
// that can't be used is explained before it's uploaded.
export const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_PICTURE_BYTES = 1024 * 1024;
export const MAX_PICTURE_SIDE = 1024;

export const PICTURE_HINT = `PNG, JPEG, WebP or GIF, up to 1 MB and ${MAX_PICTURE_SIDE} × ${MAX_PICTURE_SIDE} pixels.`;

// The picture's size in pixels; null when the browser can't decode it.
export type MeasurePicture = (file: Blob) => Promise<{ width: number; height: number } | null>;

export const measurePicture: MeasurePicture = async (file) => {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
};

// Why a file can't be a profile picture, or null when it can.
export async function checkPicture(file: File, measure: MeasurePicture = measurePicture): Promise<string | null> {
  if (!PICTURE_TYPES.includes(file.type)) {
    return 'Choose a PNG, JPEG, WebP or GIF picture.';
  }
  if (file.size > MAX_PICTURE_BYTES) {
    return `The picture is too large (${(file.size / 1024 / 1024).toFixed(1)} MB): it can be at most 1 MB.`;
  }
  const size = await measure(file);
  if (!size) {
    return "That picture can't be opened. Choose another file.";
  }
  if (size.width > MAX_PICTURE_SIDE || size.height > MAX_PICTURE_SIDE) {
    return `The picture is ${size.width} × ${size.height} pixels; it can be at most ${MAX_PICTURE_SIDE} × ${MAX_PICTURE_SIDE}.`;
  }
  return null;
}
