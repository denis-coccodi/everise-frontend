// Fails when a style isn't mobile first (see the mobile-first skill):
// node scripts/check-mobile-first.mjs.
//
// A rule outside any breakpoint is the phone's; wider screens add to it from
// a width up (`@include bp.up(md)`, a `min-width` query). So no media query
// may narrow styles to "below a width": no `max-width` (nor `max-device-width`),
// no range syntax looking down (`width <`, `width <=`), no `not … (min-width…)`,
// and no mixin named down(). Queries that aren't about width
// (`prefers-reduced-motion`, `hover`, `print`) are fine.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['apps', 'libs'];
const SKIP = new Set(['node_modules', 'dist', '.angular', 'coverage']);
const STYLE_FILE = /\.(scss|css)$/;
// A component's inline styles count too.
const COMPONENT_FILE = /\.component\.ts$/;

const RULES = [
  { pattern: /@media[^{]*\bmax-(device-)?width\b/, why: 'a max-width query' },
  { pattern: /@media[^{]*\bwidth\s*<=?/, why: 'a range query looking down (width <)' },
  { pattern: /@media[^{]*\bnot\b[^{]*\bmin-width\b/, why: 'a "not … min-width" query (below a width)' },
  { pattern: /\b(bp\.)?down\s*\(/, why: 'a down() breakpoint mixin', styleOnly: true },
  { pattern: /@mixin\s+down\b/, why: 'a down() breakpoint mixin' },
];

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (STYLE_FILE.test(entry.name) || COMPONENT_FILE.test(entry.name)) yield path;
  }
}

const problems = [];
for (const root of ROOTS) {
  for (const path of files(root)) {
    const isStyle = STYLE_FILE.test(path);
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        const code = line.replace(/\/\/.*$/, '');
        for (const rule of RULES) {
          if (rule.styleOnly && !isStyle) continue;
          if (rule.pattern.test(code)) {
            problems.push(`  ${relative('.', path).split(sep).join('/')}:${index + 1}: ${rule.why}`);
          }
        }
      });
  }
}

if (problems.length) {
  console.error('Not mobile first: phone styles go outside any breakpoint, wider ones in bp.up(...):');
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Mobile first: no style narrows to below a width.');
