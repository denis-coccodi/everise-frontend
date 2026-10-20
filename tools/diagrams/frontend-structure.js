// Generates docs/frontend-structure.svg from the Nx project graph: a lane per
// domain (its pages and widgets, then its data-access library), the app above,
// the core and UI libraries below.
// Run: node tools/diagrams/frontend-structure.js docs/frontend-structure.svg (then render the PNG, see README).
// What each project is for comes from PROJECTS below: a project the graph has
// and PROJECTS doesn't fails the run, so a new library can't be left out.
// Arrows join a domain's pages to its own data-access library; every other
// dependency is listed on the box ("uses:"), except the core and UI libraries,
// which nearly every library uses.
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const out = process.argv[2];

// What the graph can't say: each project's routes and what it is for. The
// stores and services of a data-access library are read from its index.ts.
const PROJECTS = {
  everise: { lines: ['routes, AuthGuard, page titles, HTTP setup', 'layout: navbar, notifications bell, footer'] },
  'home-feature-home': {
    routes: ['/'],
    lines: ['Home: the Weekly, Hunts, Your Feed and', 'Global Feed tabs, popular tags'],
  },
  relays: { lines: ['The Weekly and Hunts tabs: Discord', 'posts the backend relays'] },
  'articles-feature-article': {
    routes: ['/article/:id'],
    lines: ['A post: comments, favourite, follow,', 'Share to Discord'],
  },
  'articles-feature-article-edit': { routes: ['/editor[/:id]'], guard: true, lines: ['Write or edit a post'] },
  'articles-feature-articles-list': { lines: ['A feed: posts and pager, live new', 'posts, duty and listing cards'] },
  'events-feature-events': {
    routes: ['/events  /events/:id'],
    lines: ["This week's Partake events; an", "event's page, Share to Discord"],
  },
  'events-feature-event-card': { lines: ["An event's card, on the Events page", "and a venue's page"] },
  'venues-feature-venues': {
    routes: ['/venues  /venues/:id'],
    lines: ['FFXIV Venues by data centre; a', "venue's page with its week's events"],
  },
  'party-finder-feature-party-finder': {
    routes: ['/party-finder', '/party-finder/listings/:id'],
    lines: ['Listings from xivpf, filters in the', 'address; Share as post or to Discord'],
  },
  'party-finder-feature-pf-listing': { lines: ["A listing's card, in the Party", 'Finder and in posts'] },
  'roulette-feature-roulette': {
    routes: ['/roulette'],
    lines: ['Duty Roulette: three reels, posts', 'the result to the feeds'],
  },
  'waking-sands-feature-waking-sands': {
    routes: ['/waking-sands'],
    lines: ['A live chat with AI-voiced FFXIV', 'characters'],
  },
  'market-feature-market': {
    routes: ['/market-history'],
    lines: ["An item's prices per world over", 'time, the cheapest listings now'],
  },
  'profile-feature-profile': {
    routes: ['/profile/:id'],
    guard: true,
    lines: ["A member's or character's profile", 'and posts'],
  },
  'settings-feature-settings': {
    routes: ['/settings'],
    guard: true,
    lines: ['Picture, account, dark mode; for', 'admins: characters, roles'],
  },
  'auth-feature-auth': {
    routes: ['/login  /register  /privacy', '/confirm-email  /forgot-password', '/reset-password'],
    lines: ['Sign in, sign up, email and password'],
  },
  media: { lines: ['Pictures, GIFs, YouTube and rich', 'text in posts; the attachments editor'] },
  'core-api-types': { lines: ['Generated from the backend’s', 'openapi.json (api-types)'] },
  'core-http-client': { lines: ['ApiService, API_URL,', 'LiveUpdates (WebSocket)'] },
  'core-forms': { lines: ['serverMessage(), form', 'and list error views'] },
  'core-data-access': { lines: ['withCallState, text search,', 'errorMessageOf (resources)'] },
  'core-error-handler': { lines: ['HTTP error interceptor:', '401 → sign in, 404 → home'] },
  'ui-components': { lines: ['The FFXIV theme and the', 'building blocks (cdt-…)'] },
  'core-testing': { lines: ['The shared test setup,', 'imported by every spec'] },
};
// Lanes, top to bottom: roughly the site's navigation.
const DOMAINS = [
  'home',
  'relays',
  'articles',
  'events',
  'venues',
  'party-finder',
  'roulette',
  'waking-sands',
  'market',
  'profile',
  'settings',
  'auth',
  'notifications',
  'media',
];
const CORE = [
  'core-api-types',
  'core-http-client',
  'core-forms',
  'core-data-access',
  'core-error-handler',
  'ui-components',
  'core-testing',
];
const COLOURS = require('./colours');

// --- The graph
const graphFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nx-graph-')), 'graph.json');
execSync(`npx nx graph --file="${graphFile}"`, { stdio: 'ignore' });
const { nodes, dependencies } = JSON.parse(fs.readFileSync(graphFile, 'utf8')).graph;
const projects = Object.entries(nodes)
  .map(([name, node]) => ({
    name,
    root: node.data.root,
    type: (node.data.tags || []).find((tag) => tag.startsWith('type:'))?.slice(5),
    // Projects only; the test setup every spec imports isn't drawn.
    deps: [...new Set((dependencies[name] || []).map((d) => d.target))].filter(
      (t) => nodes[t] && t !== 'core-testing' && t !== name,
    ),
  }))
  .filter((p) => p.type !== 'e2e');
const byName = Object.fromEntries(projects.map((p) => [p.name, p]));
const domainOf = (p) => p.root.split('/')[1];
const unknown = projects.filter((p) => !PROJECTS[p.name] && p.type !== 'data-access').map((p) => p.name);
const unplaced = projects.filter((p) => p.type !== 'app' && !CORE.includes(p.name) && !DOMAINS.includes(domainOf(p)));
if (unknown.length || unplaced.length) {
  console.error('Describe these in PROJECTS / DOMAINS first:', [...unknown, ...unplaced.map((p) => p.name)].join(', '));
  process.exit(1);
}
// A library by its folder: "articles/data-access", "media/feature-media".
const short = (name) => {
  const p = byName[name];
  return p.type === 'app' ? name : p.root.replace(/^libs\//, '');
};
// A data-access library's stores, services, guards and resolvers, from what
// its entry point exports.
const EXPORTED = /export (?:const|class|function) (\w*(?:Store|Service|Guard|Resolver))\b/g;
function exportsOf(p) {
  const names = [];
  const index = fs.readFileSync(path.join(p.root, 'src/index.ts'), 'utf8');
  for (const [, file] of index.matchAll(/from '(\.\/[^']+)'/g)) {
    const source = fs.readFileSync(path.join(p.root, 'src', `${file}.ts`), 'utf8');
    names.push(...[...source.matchAll(EXPORTED)].map((m) => m[1]));
  }
  return [...new Set(names)];
}

// --- Drawing
const W = 1560,
  X0 = 170;
const FONT = 'Segoe UI, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
const MONO = 'Consolas, SFMono-Regular, Menlo, monospace';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = [];
const add = (s) => svg.push(s);
const text = (x, y, s, o = {}) =>
  add(
    `<text x="${x}" y="${y}" font-size="${o.size || 12}" font-weight="${o.weight || 400}" fill="${
      o.fill || '#1e293b'
    }"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.style ? ` font-style="${o.style}"` : ''}${
      o.family ? ` font-family="${o.family}" xml:space="preserve"` : ''
    }>${esc(s)}</text>`,
  );
const tint = (hex) => `${hex}12`;
// Words joined into lines of at most `max` characters.
function wrap(words, max, first = '') {
  const lines = [];
  let line = first;
  for (const word of words) {
    if (line.length && (line + word).length > max) {
      lines.push(line.trimEnd());
      line = ' '.repeat(first.length);
    }
    line += word;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
// The lines a box shows: routes, what it's for, what else it uses.
function contents(p, width, ownDataAccess) {
  const info = PROJECTS[p.name] || {};
  const lines = [];
  for (const route of info.routes || []) lines.push({ t: route, kind: 'route' });
  if (p.type === 'data-access') {
    for (const l of wrap(
      exportsOf(p).map((n, i, all) => n + (i < all.length - 1 ? ', ' : '')),
      Math.floor((width - 24) / 6.6),
    ))
      lines.push({ t: l });
  }
  for (const l of info.lines || []) lines.push({ t: l });
  const others = p.deps
    .filter((d) => d !== ownDataAccess && !CORE.includes(d) && byName[d].type !== 'app')
    .map(short)
    .sort();
  if (others.length && p.type !== 'app') {
    for (const l of wrap(
      others.map((n, i) => n + (i < others.length - 1 ? ', ' : '')),
      Math.floor((width - 24) / 6.6),
      'uses: ',
    ))
      lines.push({ t: l, kind: 'uses' });
  }
  return lines;
}
const LABEL = {
  feature: 'page',
  widget: 'widget',
  'data-access': 'data-access',
  app: 'app',
  util: 'core',
  ui: 'ui',
  testing: 'testing',
};
const heightOf = (lines) => 46 + lines.length * 17;
function box(b) {
  const col = b.colour;
  add(
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${
      b.fill || tint(col)
    }" stroke="${col}" stroke-width="${b.strong ? 2.4 : 1.5}"${b.dashed ? ' stroke-dasharray="6 4"' : ''}/>`,
  );
  text(b.x + 12, b.y + 18, b.label.toUpperCase(), { size: 10, weight: 700, fill: col });
  text(b.x + 12, b.y + 36, b.name, { size: 13.5, weight: 700 });
  if (b.guard) {
    const gx = b.x + b.w - 60;
    add(`<rect x="${gx}" y="${b.y + 7}" width="52" height="17" rx="8.5" fill="${COLOURS.auth}"/>`);
    text(gx + 26, b.y + 19.5, 'guarded', { size: 10, weight: 600, fill: '#ffffff', anchor: 'middle' });
  }
  let y = b.y + 40;
  for (const l of b.lines) {
    y += 17;
    if (l.kind === 'route') text(b.x + 12, y, l.t, { size: 11.5, fill: col, family: MONO, weight: 600 });
    else if (l.kind === 'uses') text(b.x + 12, y, l.t, { size: 11, fill: '#64748b', family: MONO });
    else text(b.x + 12, y, l.t, { size: 12.5, fill: '#334155' });
  }
}
const arrow = (x1, y1, x2, y2, col, dash) =>
  add(
    `<path d="M${x1},${y1} L${x2 - 2},${y2}" stroke="${col}" stroke-width="1.8"${
      dash ? ' stroke-dasharray="5 4"' : ''
    } marker-end="url(#a-${col.slice(1)})"/>`,
  );

// Columns: pages and widgets, then the domain's data-access library.
const PW = 300,
  PG = 14,
  DX = X0 + 3 * PW + 2 * PG + 52,
  DW = W - 30 - DX;
let y = 84;
const body = [];
const draw = (f) => body.push(f);

// The app, and where it runs.
const app = byName.everise;
const appLines = contents(app, 3 * PW + 2 * PG);
const appH = heightOf(appLines);
const appY = y;
draw(() =>
  box({
    x: X0,
    y: appY,
    w: 3 * PW + 2 * PG,
    h: appH,
    colour: COLOURS.app,
    label: 'app · apps/everise',
    name: 'everise — the Angular app shell',
    lines: appLines,
    strong: true,
  }),
);
draw(() => {
  box({
    x: DX,
    y: appY,
    w: DW,
    h: appH,
    colour: COLOURS.ext,
    fill: '#ffffff',
    dashed: true,
    label: 'hosting',
    name: 'Cloudflare Workers',
    lines: [
      { t: 'dist/apps/everise + worker/index.ts (/api, SEO)' },
      { t: 'staging.everise.dev · everise.dev', kind: 'route' },
    ],
  });
  arrow(X0 + 3 * PW + 2 * PG, appY + appH / 2, DX, appY + appH / 2, COLOURS.ext, true);
  text((X0 + 3 * PW + 2 * PG + DX) / 2, appY + appH / 2 - 8, 'build', { size: 11, fill: '#64748b', anchor: 'middle' });
});
y += appH + 36;
draw(() => {
  arrow(X0 + 40, appY + appH, X0 + 40, appY + appH + 26, COLOURS.app, true);
  text(X0 + 50, appY + appH + 17, 'the router lazy-loads every page', { size: 11, fill: COLOURS.app, weight: 600 });
});

// A lane per domain.
const lanesTop = y;
for (const domain of DOMAINS) {
  const col = COLOURS[domain];
  const inDomain = projects.filter((p) => p.type !== 'app' && !CORE.includes(p.name) && domainOf(p) === domain);
  const da = inDomain.find((p) => p.type === 'data-access');
  const pages = inDomain
    .filter((p) => p !== da)
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'feature' ? -1 : 1));
  const pageBoxes = pages.map((p) => ({ p, lines: contents(p, PW, da?.name) }));
  const daLines = da ? contents(da, DW) : [];
  const h = Math.max(...pageBoxes.map((b) => heightOf(b.lines)), da ? heightOf(daLines) : 0);
  const laneY = y;
  draw(() => {
    add(`<rect x="12" y="${laneY - 8}" width="${W - 24}" height="${h + 16}" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>`);
    text(28, laneY + 22, domain, { size: 13, weight: 700, fill: col });
    text(28, laneY + 40, `libs/${domain}`, { size: 10.5, fill: '#94a3b8', family: MONO });
    pageBoxes.forEach(({ p, lines }, i) =>
      box({
        x: X0 + i * (PW + PG),
        y: laneY,
        w: PW,
        h,
        colour: col,
        label: LABEL[p.type],
        name: short(p.name),
        guard: PROJECTS[p.name]?.guard,
        lines,
      }),
    );
    if (da) {
      box({ x: DX, y: laneY, w: DW, h, colour: col, label: 'data-access', name: short(da.name), lines: daLines });
      // Every page or widget of the domain that uses its data-access library.
      const users = pages.filter((p) => p.deps.includes(da.name));
      if (users.length) {
        const last = X0 + (pages.length - 1) * (PW + PG) + PW;
        arrow(last, laneY + h / 2, DX, laneY + h / 2, col);
        if (users.length < pages.length) console.warn(`${domain}: not every page uses ${da.name}`);
      }
    }
  });
  y += h + 26;
}

// Core and UI.
const coreTop = y + 6;
const CW = (W - 30 - X0 - (CORE.length - 1) * 12) / CORE.length;
const coreBoxes = CORE.map((name) => ({ p: byName[name], lines: contents(byName[name], CW) }));
const CH = Math.max(...coreBoxes.map((b) => heightOf(b.lines)));
draw(() => {
  add(
    `<rect x="12" y="${coreTop - 8}" width="${W - 24}" height="${CH + 40}" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>`,
  );
  text(28, coreTop + 22, 'core & ui', { size: 13, weight: 700, fill: COLOURS.core });
  text(28, coreTop + 40, 'libs/core, libs/ui', { size: 10.5, fill: '#94a3b8', family: MONO });
  coreBoxes.forEach(({ p, lines }, i) =>
    box({
      x: X0 + i * (CW + 12),
      y: coreTop,
      w: CW,
      h: CH,
      colour: COLOURS.core,
      label: LABEL[p.type],
      name: short(p.name),
      lines,
    }),
  );
  text(W - 30, coreTop + CH + 24, 'used by nearly every library above; they depend on nothing but each other', {
    size: 11.5,
    fill: '#94a3b8',
    anchor: 'end',
    style: 'italic',
  });
});
y = coreTop + CH + 52;

// The backend, and the legend.
const backendY = y;
const http = CORE.indexOf('core-http-client');
const hx = X0 + http * (CW + 12);
draw(() => {
  const bx = hx - 60,
    bw = 520;
  add(
    `<rect x="${bx}" y="${backendY}" width="${bw}" height="92" rx="10" fill="#ffffff" stroke="${COLOURS.ext}" stroke-width="1.6" stroke-dasharray="6 4"/>`,
  );
  text(bx + 12, backendY + 18, 'BACKEND API  ·  everise-backend', { size: 10.5, weight: 700, fill: COLOURS.ext });
  text(bx + 12, backendY + 38, 'deployed   /api → worker/index.ts → service binding', {
    size: 12,
    family: MONO,
    fill: '#334155',
  });
  text(bx + 12, backendY + 56, '           staging: be-staging · production: be-prod', {
    size: 12,
    family: MONO,
    fill: '#334155',
  });
  text(bx + 12, backendY + 74, 'local      http://localhost:8080/api (direct)', {
    size: 12,
    family: MONO,
    fill: '#334155',
  });
  arrow(hx + CW / 2, coreTop + CH, hx + CW / 2, backendY, COLOURS.ext);
  const lx = W - 30 - 560;
  add(`<rect x="${lx}" y="${backendY}" width="560" height="92" rx="10" fill="#ffffff" stroke="#e2e8f0"/>`);
  text(lx + 14, backendY + 22, 'Legend', { size: 13, weight: 700 });
  arrow(lx + 14, backendY + 44, lx + 54, backendY + 44, '#64748b');
  text(lx + 62, backendY + 48, "uses the domain's data-access library", { size: 12 });
  arrow(lx + 14, backendY + 66, lx + 54, backendY + 66, '#64748b', true);
  text(lx + 62, backendY + 70, 'lazy route load / build', { size: 12 });
  text(lx + 300, backendY + 48, 'uses: …', { size: 11, family: MONO, fill: '#64748b' });
  text(lx + 352, backendY + 48, '= its other library imports', { size: 12 });
  add(`<rect x="${lx + 300}" y="${backendY + 56}" width="52" height="17" rx="8.5" fill="${COLOURS.auth}"/>`);
  text(lx + 326, backendY + 68.5, 'guarded', { size: 10, weight: 600, fill: '#ffffff', anchor: 'middle' });
  text(lx + 360, backendY + 70, '= AuthGuard on the route', { size: 12 });
});
const H = backendY + 92 + 24;

add(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`,
);
add('<defs>');
for (const col of new Set([...Object.values(COLOURS), '#64748b']))
  add(
    `<marker id="a-${col.slice(
      1,
    )}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${col}"/></marker>`,
  );
add('</defs>');
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
text(X0, 38, 'Everise frontend — Nx workspace structure', { size: 22, weight: 700 });
text(
  X0,
  60,
  `${projects.length} projects from the Nx project graph: the app, a lane per domain (its pages and widgets, then its data-access library), and the core and UI libraries.`,
  { size: 13, fill: '#475569' },
);
body.forEach((f) => f());
add('</svg>');
fs.writeFileSync(out, svg.join('\n') + '\n');
console.log(`wrote ${out} (${W}×${H})`);
