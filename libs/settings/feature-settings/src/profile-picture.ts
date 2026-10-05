// The limits on a stored profile picture, the same as the backend's
// (src/users/profile-images-service.ts there). The crop dialog makes every
// picture fit them, so they're never an error for the person choosing one.
export const MAX_PICTURE_KB = 300;
export const MAX_PICTURE_BYTES = MAX_PICTURE_KB * 1024;
export const MAX_PICTURE_SIDE = 500;

// The largest file the browser is asked to open and edit.
export const MAX_CHOSEN_MB = 20;

export const PICTURE_HINT = `Any picture: you choose the square to use, and it's resized to ${MAX_PICTURE_SIDE} × ${MAX_PICTURE_SIDE} pixels and up to ${MAX_PICTURE_KB} KB.`;

// Why a chosen file can't be edited into a profile picture, or null when it
// can. Whether the browser can open it shows when the dialog loads it.
export function checkChosenFile(file: File): string | null {
  // SVG drawings are left out: they aren't photos, and can't be stored.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return 'Choose a picture, such as a PNG, JPEG or WebP file.';
  }
  if (file.size > MAX_CHOSEN_MB * 1024 * 1024) {
    return `The file is too large to edit (${Math.ceil(
      file.size / 1024 / 1024,
    )} MB): choose one under ${MAX_CHOSEN_MB} MB.`;
  }
  return null;
}
