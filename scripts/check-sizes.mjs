// Fails when a file outgrows its kind's limit, so a component that keeps
// growing gets split instead (see the frontend-best-practices skill):
// node scripts/check-sizes.mjs. Lines are counted as they are on disk.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The largest each kind of file may be, in lines. Specs aren't counted.
const LIMITS = [
  { kind: 'component class', test: (f) => f.endsWith('.component.ts'), max: 200 },
  { kind: 'component template', test: (f) => f.endsWith('.component.html'), max: 150 },
  { kind: 'component styles', test: (f) => f.endsWith('.component.scss'), max: 250 },
  { kind: 'store or service', test: (f) => /\.(store|service)\.ts$/.test(f), max: 250 },
  { kind: 'other TypeScript', test: (f) => f.endsWith('.ts'), max: 350 },
];

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // generated/: code written by a tool (npm run api-types), not by hand.
    if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (!/\.spec\.ts$|test-setup\.ts$/.test(entry.name)) files.push(path);
  }
};
walk('apps');
walk('libs');

const over = [];
for (const file of files) {
  const limit = LIMITS.find((l) => l.test(file));
  if (!limit) continue;
  const lines = readFileSync(file, 'utf8').trimEnd().split('\n').length;
  if (lines > limit.max) over.push(`${file}: ${lines} lines (a ${limit.kind} may have ${limit.max})`);
}

if (over.length > 0) {
  console.error(
    'Too long; split it (child components, a store in data-access, plain functions):\n  ' + over.join('\n  '),
  );
  process.exit(1);
}
console.log(`File sizes: ${files.length} files within their limits.`);
