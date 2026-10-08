import { toBlob } from 'html-to-image';

// The largest picture the backend takes (POST /api/media: 1 MB).
const MAX_BYTES = 1_000_000;
// The card is drawn this wide, whatever the screen, so every picture in
// Discord looks the same.
const WIDTH = 520;

// The listing's card as the share window shows it, as a PNG for the
// Discord message: sharp (twice the pixels) when that fits the upload limit,
// else at its size. Undefined when the browser can't draw it (the message
// then goes without a picture).
export async function cardPicture(card: HTMLElement): Promise<Blob | undefined> {
  // A copy laid out at the picture's width, out of sight: the drawing keeps
  // each element's laid-out size, so the window's own (narrower) card won't
  // do. Angular's component styles go by attribute, so the copy keeps them.
  const holder = document.createElement('div');
  holder.style.cssText = `position: fixed; left: -10000px; top: 0; width: ${WIDTH}px;`;
  const copy = card.cloneNode(true) as HTMLElement;
  copy.style.margin = '0';
  holder.appendChild(copy);
  document.body.appendChild(holder);
  try {
    const backgroundColor = getComputedStyle(document.body).backgroundColor;
    for (const pixelRatio of [2, 1]) {
      const blob = await toBlob(copy, { pixelRatio, backgroundColor });
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    holder.remove();
  }
}
