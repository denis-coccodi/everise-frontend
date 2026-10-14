// Looks at pages of a built Everise site the way a person would: a
// screenshot of each page in dark and light mode at each width, whether it
// scrolls sideways (WCAG 1.4.10 reflow), and axe's WCAG 2.2 AA violations
// (desktop width, both modes). Exit code 1 on any overflow or violation.
//
//   node ui-check.mjs <site-url> <path>...
//
// Environment:
//   API      where the site's /api goes, e.g. http://localhost:8788 (a local
//            backend); unset, /api goes to the site itself
//   OUT      folder for the screenshots (default: ./ui-check-shots)
//   WIDTHS   comma-separated widths (default: 320,390,768,1280)
//   MODES    comma-separated modes (default: dark,light)
//   WAIT_MS  how long a page gets to load its data (default: 3500)
//
// Needs Playwright (a dev dependency) and, for axe, `npm i --no-save axe-core`.
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium } from 'playwright';

const [site, ...paths] = process.argv.slice(2);
if (!site || !paths.length) {
  console.error('Usage: node ui-check.mjs <site-url> <path>...');
  process.exit(2);
}
const api = process.env.API;
const out = process.env.OUT ?? 'ui-check-shots';
const widths = (process.env.WIDTHS ?? '320,390,768,1280').split(',').map(Number);
const modes = (process.env.MODES ?? 'dark,light').split(',');
const waitMs = Number(process.env.WAIT_MS ?? 3500);
// axe runs at the widest width only: the rules don't depend on it.
const axeWidth = Math.max(...widths);

let axeSource;
try {
  axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
} catch {
  console.log('axe-core is not installed (npm i --no-save axe-core): no axe check.');
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let problems = 0;

for (const mode of modes) {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    // Only "false" means light; dark is the default.
    await context.addInitScript((dark) => localStorage.setItem('darkMode', String(dark)), mode === 'dark');
    const page = await context.newPage();
    if (api) {
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const request = route.request();
        try {
          const response = await fetch(api + url.pathname + url.search, {
            method: request.method(),
            headers: request.headers(),
            body: request.postDataBuffer() ?? undefined,
          });
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: Buffer.from(await response.arrayBuffer()),
          });
        } catch {
          await route.fulfill({ status: 502, body: '{}' });
        }
      });
    }
    for (const path of paths) {
      await page.goto(site + path);
      await page.waitForTimeout(waitMs);
      const name = `${path.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'home'}-${mode}-${width}.png`;
      await page.screenshot({ path: join(out, name), fullPage: true });
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      if (scroll > client) {
        problems++;
        console.log(`${mode} ${width}px ${path}: scrolls sideways (${scroll} > ${client})`);
      }
      if (axeSource && width === axeWidth) {
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate(() =>
          window.axe.run(document, {
            runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
          }),
        );
        for (const violation of result.violations) {
          problems++;
          console.log(`${mode} ${path}: ${violation.id} (${violation.impact}): ${violation.help}`);
          for (const node of violation.nodes.slice(0, 5)) console.log(`    ${node.target.join(' ')}`);
        }
      }
    }
    await context.close();
  }
}
await browser.close();
console.log(`Screenshots in ${out}. ${problems ? `${problems} problem(s).` : 'No problems.'}`);
process.exit(problems ? 1 : 0);
