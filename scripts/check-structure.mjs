// Fails when code sits where it doesn't belong (see the frontend-best-practices
// skill, "Where code goes"): node scripts/check-structure.mjs.
//
// - One component, directive or pipe per folder, named after it:
//   <name>/<name>.component.ts.
// - Stores and services never share a folder with a component, and never live
//   in a feature, widget or ui project (they belong in data-access, or in
//   core's util libraries).
// - No folders by kind of file (components/, services/, models/…): folders are
//   named after what they hold, as Angular's style guide asks.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';

const DECLARABLE = /\.(component|directive|pipe)\.ts$/;
const STATE_OR_API = /\.(store|service)\.ts$/;
const TYPE_FOLDERS = new Set([
  'components',
  'directives',
  'pipes',
  'services',
  'stores',
  'state',
  'models',
  'resolvers',
  'guards',
  'interfaces',
  'types',
  'helpers',
  'utils',
]);
const NO_STATE_TAGS = ['type:feature', 'type:widget', 'type:ui'];

const folders = new Map(); // folder -> its .ts files, specs aside
const projects = []; // { root, tags }
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === 'project.json') {
      projects.push({ root: dir + sep, tags: JSON.parse(readFileSync(path, 'utf8')).tags ?? [] });
    } else if (entry.name.endsWith('.ts') && !/\.spec\.ts$|test-setup\.ts$/.test(entry.name)) {
      folders.set(dir, [...(folders.get(dir) ?? []), entry.name]);
    }
  }
};
for (const top of ['apps', 'libs']) if (existsSync(top)) walk(top);

const tagsOf = (dir) =>
  projects.filter((p) => (dir + sep).startsWith(p.root)).sort((a, b) => b.root.length - a.root.length)[0]?.tags ?? [];

const problems = [];
for (const [dir, files] of folders) {
  const shown = relative('.', dir).split(sep).join('/');
  const declarables = files.filter((f) => DECLARABLE.test(f));
  const stateOrApi = files.filter((f) => STATE_OR_API.test(f));
  if (declarables.length > 1) {
    problems.push(`${shown}: ${declarables.join(', ')} (one component, directive or pipe per folder)`);
  }
  for (const file of declarables) {
    if (file.replace(DECLARABLE, '') !== basename(dir)) {
      problems.push(`${shown}/${file}: name the folder after it (${file.replace(DECLARABLE, '')}/${file})`);
    }
  }
  if (declarables.length > 0 && stateOrApi.length > 0) {
    problems.push(`${shown}: ${stateOrApi.join(', ')} next to a component (stores and services go in data-access)`);
  }
  const noState = NO_STATE_TAGS.find((tag) => tagsOf(dir).includes(tag));
  if (noState && stateOrApi.length > 0) {
    problems.push(`${shown}: ${stateOrApi.join(', ')} in a ${noState} project (stores and services go in data-access)`);
  }
}
// Only the folders inside a project's src/ (libs/ui/components is a project's
// name), and not the Playwright tests.
const insideSrc = (dir) => dir.split(sep).slice(0, -1).includes('src');
for (const dir of new Set([...folders.keys()].flatMap((d) => ancestors(d)))) {
  if (insideSrc(dir) && !tagsOf(dir).includes('type:e2e') && TYPE_FOLDERS.has(basename(dir))) {
    problems.push(`${relative('.', dir).split(sep).join('/')}/: a folder by kind of file; name it after what it holds`);
  }
}

function ancestors(dir) {
  const all = [];
  for (let d = dir; d !== '.' && d !== dirname(d); d = dirname(d)) all.push(d);
  return all;
}

if (problems.length > 0) {
  console.error('Code in the wrong place (frontend-best-practices, "Where code goes"):\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Structure: ${folders.size} folders, one component per folder, stores and services in data-access.`);
