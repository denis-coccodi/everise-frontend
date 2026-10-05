// Runs axe-core (WCAG 2.0/2.1/2.2 A and AA, plus best practices) on pages of a
// running Everise site, in dark and light mode, and prints the violations.
// Usage: node .claude/skills/accessibility/axe-check.mjs <base-url> <path>...
// Needs axe-core (`npm i --no-save axe-core`). Signs in first when
// EVERISE_EMAIL and EVERISE_PASSWORD are set. Exit code 1 on any violation.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [base = 'http://localhost:4200', ...paths] = process.argv.slice(2);
const pages = paths.length ? paths : ['/home', '/roulette', '/login', '/register'];
const { EVERISE_EMAIL: email, EVERISE_PASSWORD: password } = process.env;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let violations = 0;
for (const mode of ['dark', 'light']) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto(base + '/home');
  await page.evaluate((dark) => localStorage.setItem('darkMode', String(dark)), mode === 'dark');
  if (email && password) {
    await page.goto(base + '/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type=submit]');
    await page.waitForURL('**/home');
    // A signed-in user's saved mode wins; set this browser's mode again.
    await page.evaluate((dark) => localStorage.setItem('darkMode', String(dark)), mode === 'dark');
  }
  for (const path of pages) {
    await page.goto(base + path);
    await page.waitForLoadState('networkidle');
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() =>
      window.axe.run(document, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      }),
    );
    for (const v of result.violations) {
      violations++;
      console.log(`${mode} ${path}  ${v.id} (${v.impact}): ${v.help}`);
      for (const node of v.nodes.slice(0, 5)) console.log(`    ${node.target.join(' ')}`);
    }
  }
}
await browser.close();
console.log(violations ? `${violations} violation(s).` : 'No violations.');
process.exit(violations ? 1 : 0);
