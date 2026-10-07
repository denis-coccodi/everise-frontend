// Redraws the site's crest from the free company's Lodestone page:
//   node tools/crest/update-crest.mjs
// The Lodestone draws a crest as up to three stacked images (background,
// frame, symbol). This stacks them on a canvas in a headless browser
// (Playwright, already a dev dependency) and writes:
// - apps/everise/src/assets/images/everise-crest.png (128 px): the navbar,
//   footer, home banner, app manifest, link previews and Discord's avatar;
// - apps/everise/src/favicon.ico (16, 32 and 48 px).
// Kept in the repo rather than linked from the Lodestone: a favicon is one
// file, and Discord, link previews and the offline cache need a stable
// address on the site. Run it again whenever the crest changes.
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const LODESTONE = 'https://na.finalfantasyxiv.com/lodestone/freecompany/9232660711086364990/';
const PNG_OUT = 'apps/everise/src/assets/images/everise-crest.png';
const ICO_OUT = 'apps/everise/src/favicon.ico';
const ICO_SIZES = [16, 32, 48];

// The crest's layers, largest size, in drawing order.
async function crestLayers() {
  const page = await fetch(LODESTONE, { headers: { 'User-Agent': 'Mozilla/5.0 (Everise crest updater)' } });
  if (!page.ok) throw new Error(`The Lodestone answered ${page.status}`);
  const html = await page.text();
  const start = html.indexOf('entry__freecompany__crest__image');
  if (start < 0) throw new Error("No crest on the free company's page");
  const block = html.slice(start, html.indexOf('</div>', start));
  const urls = [...block.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1].replace(/_\d+x\d+\.png$/, '_128x128.png'));
  if (urls.length === 0) throw new Error('The crest has no images');
  return Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
    }),
  );
}

// The layers stacked, at each size, as PNG bytes.
async function draw(layers, sizes) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const pngs = await page.evaluate(
      async ({ layers, sizes }) => {
        const images = await Promise.all(
          layers.map(
            (src) =>
              new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = src;
              }),
          ),
        );
        const full = document.createElement('canvas');
        full.width = full.height = 128;
        const context = full.getContext('2d');
        for (const image of images) context.drawImage(image, 0, 0, 128, 128);
        return sizes.map((size) => {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = size;
          const small = canvas.getContext('2d');
          small.imageSmoothingQuality = 'high';
          small.drawImage(full, 0, 0, size, size);
          return canvas.toDataURL('image/png').split(',')[1];
        });
      },
      { layers, sizes },
    );
    return pngs.map((base64) => Buffer.from(base64, 'base64'));
  } finally {
    await browser.close();
  }
}

// An .ico holding PNG images, one per size.
function ico(pngs, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map((png, i) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(sizes[i] % 256, 0);
    entry.writeUInt8(sizes[i] % 256, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

const layers = await crestLayers();
const [crest, ...icons] = await draw(layers, [128, ...ICO_SIZES]);
await writeFile(PNG_OUT, crest);
await writeFile(ICO_OUT, ico(icons, ICO_SIZES));
console.log(`Crest: ${layers.length} layers from the Lodestone -> ${PNG_OUT}, ${ICO_OUT} (${ICO_SIZES.join(', ')} px)`);
