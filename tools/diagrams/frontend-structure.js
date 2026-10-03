// Generates docs/frontend-structure.svg from a hand-placed layout of the Nx projects.
// Run: node tools/diagrams/frontend-structure.js docs/frontend-structure.svg (then render the PNG, see README).
// Edges between domain libs are drawn as arrows; direct imports of core/ui libs
// are listed on each box ("uses:") to keep the picture readable.
const fs = require('fs');
const out = process.argv[2];

const W = 1560,
  H = 960,
  X0 = 70;
const FONT = 'Segoe UI, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
const C = {
  app: '#0f766e',
  auth: '#7c3aed',
  articles: '#2563eb',
  home: '#059669',
  profile: '#c2410c',
  settings: '#be185d',
  core: '#475569',
  ui: '#475569',
  ext: '#334155',
};
const tint = {
  app: '#f0fdfa',
  auth: '#f5f3ff',
  articles: '#eff6ff',
  home: '#ecfdf5',
  profile: '#fff7ed',
  settings: '#fdf2f8',
  core: '#f8fafc',
  ui: '#f8fafc',
  ext: '#ffffff',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let svg = [];
const add = (s) => svg.push(s);
const text = (x, y, s, o = {}) =>
  add(
    `<text x="${x}" y="${y}" font-size="${o.size || 12}" font-weight="${o.weight || 400}" fill="${
      o.fill || '#1e293b'
    }"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.style ? ` font-style="${o.style}"` : ''}${
      o.family ? ` font-family="${o.family}" xml:space="preserve"` : ''
    }>${esc(s)}</text>`,
  );
const MONO = 'Consolas, SFMono-Regular, Menlo, monospace';

// box: {id, domain, name, x, y, w, h, lines: [{t, kind}], route, guard}
const boxes = {};
function box(b) {
  boxes[b.id] = b;
  const col = C[b.domain];
  add(
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${
      tint[b.domain]
    }" stroke="${col}" stroke-width="${b.strong ? 2.5 : 1.6}"${b.dashed ? ' stroke-dasharray="6 4"' : ''}/>`,
  );
  let y = b.y + 18;
  if (b.domainLabel !== false) {
    text(b.x + 12, y, (b.domainLabel || b.domain).toUpperCase(), { size: 10.5, weight: 700, fill: col });
    y += 18;
  }
  text(b.x + 12, y, b.name, { size: 14, weight: 700 });
  y += 4;
  if (b.guard) {
    const gw = 52,
      gx = b.x + b.w - gw - 8,
      gy = b.y + 7;
    add(`<rect x="${gx}" y="${gy}" width="${gw}" height="17" rx="8.5" fill="${C.auth}"/>`);
    text(gx + gw / 2, gy + 12.5, 'guarded', { size: 10, weight: 600, fill: '#ffffff', anchor: 'middle' });
  }
  for (const l of b.lines || []) {
    y += 17;
    if (l.kind === 'route') text(b.x + 12, y, l.t, { size: 11.5, fill: col, family: MONO, weight: 600 });
    else if (l.kind === 'uses') text(b.x + 12, y, l.t, { size: 11, fill: '#64748b', family: MONO });
    else if (l.kind === 'muted') text(b.x + 12, y, l.t, { size: 11.5, fill: '#64748b', style: 'italic' });
    else text(b.x + 12, y, l.t, { size: 12.5, fill: '#334155' });
  }
}

// cubic arrow from (x1,y1) down to (x2,y2)
function down(x1, y1, x2, y2, col, o = {}) {
  const my = (y1 + y2) / 2;
  add(
    `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2 - 2}" fill="none" stroke="${col}" stroke-width="${
      o.w || 1.8
    }"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''} marker-end="url(#a-${o.m || 'gray'})" opacity="${
      o.op || 0.9
    }"/>`,
  );
}

add(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`,
);
add('<defs>');
for (const [k, v] of Object.entries({ ...C, gray: '#64748b' }))
  add(
    `<marker id="a-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${v}"/></marker>`,
  );
add('</defs>');
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

// Title
text(X0, 38, 'Everise frontend — Nx workspace structure', { size: 22, weight: 700 });
text(
  X0,
  60,
  'Apps and libraries, grouped by layer and coloured by domain. Arrows point from a project to what it depends on (from the Nx project graph).',
  { size: 13, fill: '#475569' },
);

// Layer bands with rotated labels
const bands = [
  { y: 80, h: 140, label: 'APPS' },
  { y: 236, h: 186, label: 'FEATURE LIBS' },
  { y: 438, h: 164, label: 'DATA-ACCESS LIBS' },
  { y: 618, h: 132, label: 'CORE & UI LIBS' },
];
for (const b of bands) {
  add(`<rect x="12" y="${b.y}" width="${W - 24}" height="${b.h}" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>`);
  add(
    `<text x="34" y="${
      b.y + b.h / 2
    }" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="1.5" text-anchor="middle" transform="rotate(-90 34 ${
      b.y + b.h / 2
    })">${esc(b.label)}</text>`,
  );
}
text(X0, 256, 'one per page, lazy-loaded by the router', { size: 11.5, fill: '#94a3b8', style: 'italic' });
text(W - 28, 598, 'NgRx signal stores, API services, guards, resolvers', {
  size: 11.5,
  fill: '#94a3b8',
  anchor: 'end',
  style: 'italic',
});
text(W - 28, 746, 'no dependencies on other libs', { size: 11.5, fill: '#94a3b8', anchor: 'end', style: 'italic' });

// --- Apps
box({
  id: 'e2e',
  domain: 'app',
  domainLabel: 'apps',
  name: 'conduit-e2e',
  x: X0,
  y: 96,
  w: 230,
  h: 108,
  lines: [
    { t: 'Playwright end-to-end tests' },
    { t: 'login, register, articles' },
    { t: 'implicit dependency →', kind: 'muted' },
  ],
});
box({
  id: 'app',
  domain: 'app',
  domainLabel: 'apps',
  name: 'conduit  —  Angular app shell',
  x: X0 + 300,
  y: 96,
  w: 760,
  h: 108,
  strong: true,
  lines: [
    { t: 'app.config.ts: routes + AuthGuard, HTTP client + error interceptor, offline service worker (offline-sw.js)' },
    { t: 'layout: navbar, footer  ·  environments/*.ts: api_url /api when deployed, a backend URL locally' },
    {
      t: 'uses: auth/data-access, settings/data-access, core/api-types, core/error-handler, core/http-client',
      kind: 'uses',
    },
  ],
});
box({
  id: 'cf',
  domain: 'ext',
  domainLabel: 'hosting',
  name: 'Cloudflare Workers',
  x: X0 + 1130,
  y: 96,
  w: 290,
  h: 108,
  dashed: true,
  lines: [
    { t: 'dist/apps/conduit + worker/index.ts (/api)' },
    { t: 'staging, prod', kind: 'route' },
    { t: 'wrangler.jsonc · GitHub Actions', kind: 'muted' },
  ],
});
add(
  `<path d="M${X0 + 230},150 L${X0 + 298},150" stroke="${
    C.app
  }" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#a-app)"/>`,
);
add(
  `<path d="M${X0 + 1060},150 L${X0 + 1128},150" stroke="${
    C.ext
  }" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#a-ext)"/>`,
);
text(X0 + 1094, 142, 'build', { size: 11, fill: '#64748b', anchor: 'middle' });

// --- Feature libs (7)
const FW = 190,
  FG = 16,
  FY = 268,
  FH = 136;
const fx = (i) => X0 + i * (FW + FG);
const feats = [
  {
    id: 'f-auth',
    domain: 'auth',
    name: 'feature-auth',
    lines: [
      { t: '/login  /register', kind: 'route' },
      { t: 'Sign in, sign up forms' },
      { t: 'uses: core/forms', kind: 'uses' },
    ],
  },
  {
    id: 'f-settings',
    domain: 'settings',
    name: 'feature-settings',
    guard: true,
    lines: [
      { t: '/settings', kind: 'route' },
      { t: 'Edit user, dark mode,' },
      { t: 'logout' },
      { t: 'uses: core/forms', kind: 'uses' },
    ],
  },
  {
    id: 'f-edit',
    domain: 'articles',
    name: 'feature-article-edit',
    guard: true,
    lines: [
      { t: '/editor[/:slug]', kind: 'route' },
      { t: 'Create & edit article' },
      { t: 'uses: core/forms', kind: 'uses' },
    ],
  },
  {
    id: 'f-article',
    domain: 'articles',
    name: 'feature-article',
    lines: [
      { t: '/article/:slug', kind: 'route' },
      { t: 'Article, comments,' },
      { t: 'follow, favorite' },
      { t: 'uses: core/api-types,forms', kind: 'uses' },
    ],
  },
  {
    id: 'f-home',
    domain: 'home',
    name: 'feature-home',
    guard: true,
    lines: [
      { t: '/home', kind: 'route' },
      { t: 'Global / your feed,' },
      { t: 'popular tags' },
      { t: 'uses: core/http-client', kind: 'uses' },
    ],
  },
  {
    id: 'f-list',
    domain: 'articles',
    name: 'feature-articles-list',
    lines: [
      { t: 'no route (shared)', kind: 'muted' },
      { t: 'Article list + pager' },
      { t: 'uses: core/api-types,', kind: 'uses' },
      { t: '      ui/components', kind: 'uses' },
    ],
  },
  {
    id: 'f-profile',
    domain: 'profile',
    name: 'feature-profile',
    guard: true,
    lines: [{ t: '/profile/:username', kind: 'route' }, { t: 'Profile, my and' }, { t: 'favorited articles' }],
  },
];
feats.forEach((f, i) => box({ ...f, x: fx(i), y: FY, w: FW, h: FH }));
const fcx = (id) => {
  const b = boxes[id];
  return b.x + b.w / 2;
};
// router lazy-loads the routed feature libs
add(
  `<path d="M${X0 + 680},204 L${X0 + 680},236" stroke="${
    C.app
  }" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#a-app)"/>`,
);
text(X0 + 690, 226, 'router: loadComponent / loadChildren', { size: 11, fill: C.app, weight: 600 });

// feature -> feature (shared list), drawn as arcs above the boxes
function arc(fromId, toId, col) {
  const a = boxes[fromId],
    b = boxes[toId];
  const x1 = a.x + a.w / 2 + (a.x < b.x ? -10 : -40),
    x2 = b.x + b.w / 2 + (a.x < b.x ? -30 : 30);
  add(
    `<path d="M${x1},${FY} C${x1},${FY - 26} ${x2},${FY - 26} ${x2},${
      FY - 2
    }" fill="none" stroke="${col}" stroke-width="1.8" marker-end="url(#a-articles)"/>`,
  );
}
arc('f-home', 'f-list', C.articles);
arc('f-profile', 'f-list', C.articles);

// --- Data-access libs (4)
const DY = 470,
  DH = 118,
  DW = 262;
const das = [
  {
    id: 'd-settings',
    domain: 'settings',
    name: 'data-access',
    x: X0 + 120,
    lines: [{ t: 'SettingsStore (dark mode)' }, { t: 'uses: —', kind: 'uses' }],
  },
  {
    id: 'd-auth',
    domain: 'auth',
    name: 'data-access',
    x: X0 + 455,
    lines: [
      { t: 'AuthStore, AuthGuard' },
      { t: 'uses: core/api-types,', kind: 'uses' },
      { t: '      data-access, forms, http-client', kind: 'uses' },
    ],
  },
  {
    id: 'd-articles',
    domain: 'articles',
    name: 'data-access',
    x: X0 + 800,
    lines: [
      { t: 'ArticleStore, ArticlesListStore,' },
      { t: 'ActionsService' },
      { t: 'uses: core/api-types,', kind: 'uses' },
      { t: '      data-access, forms, http-client', kind: 'uses' },
    ],
  },
  {
    id: 'd-profile',
    domain: 'profile',
    name: 'data-access',
    x: X0 + 1150,
    lines: [
      { t: 'ProfileStore, route resolvers' },
      { t: 'uses: core/api-types,', kind: 'uses' },
      { t: '      data-access, http-client', kind: 'uses' },
    ],
  },
];
das.forEach((d) => box({ ...d, y: DY, w: DW, h: DH }));

// feature -> data-access edges, coloured by the target's domain, spread at the target
const FB = FY + FH;
function fanIn(target, sources, m) {
  const t = boxes[target],
    n = sources.length,
    span = Math.min(t.w - 60, 36 * (n - 1));
  sources
    .slice()
    .sort((p, q) => fcx(p) - fcx(q))
    .forEach((s, i) =>
      down(
        fcx(s) + (fcx(s) < t.x + t.w / 2 ? 18 : -18) * (s === 'f-auth' || s === 'f-profile' ? 0 : 1),
        FB,
        t.x + t.w / 2 - span / 2 + (n > 1 ? (span * i) / (n - 1) : span / 2),
        DY,
        C[m],
        { m },
      ),
    );
}
fanIn('d-settings', ['f-settings'], 'settings');
fanIn('d-auth', ['f-auth', 'f-settings', 'f-edit', 'f-article', 'f-home', 'f-profile'], 'auth');
fanIn('d-articles', ['f-edit', 'f-article', 'f-home', 'f-list'], 'articles');
fanIn('d-profile', ['f-profile'], 'profile');
// profile/data-access -> articles/data-access (sideways)
add(
  `<path d="M${boxes['d-profile'].x},${DY + 60} L${boxes['d-articles'].x + DW + 2},${DY + 60}" stroke="${
    C.articles
  }" stroke-width="1.8" marker-end="url(#a-articles)"/>`,
);

// --- Core & UI libs (6)
const CY = 650,
  CH = 84,
  CW = 222,
  CG = 18;
const cores = [
  { id: 'c-types', name: 'api-types', lines: [{ t: 'API DTOs: Article, User,' }, { t: 'Profile, Comment, Auth' }] },
  { id: 'c-data', name: 'data-access', lines: [{ t: 'withCallState() store' }, { t: 'feature (loading, errors)' }] },
  { id: 'c-forms', name: 'forms', lines: [{ t: 'Form errors store,' }, { t: 'input & list error views' }] },
  {
    id: 'c-http',
    name: 'http-client',
    lines: [{ t: 'ApiService + API_URL token,' }, { t: 'withCredentials (auth cookie)' }],
  },
  { id: 'c-err', name: 'error-handler', lines: [{ t: 'HTTP error interceptor:' }, { t: '401 → /login, 404 → /' }] },
  { id: 'c-ui', domain: 'ui', name: 'components', lines: [{ t: 'Pager' }, { t: 'shared presentational UI' }] },
];
cores.forEach((c, i) => box({ domain: 'core', ...c, x: X0 + i * (CW + CG), y: CY, w: CW, h: CH }));

// --- Backend
const http = boxes['c-http'];
const BX = http.x - 40,
  BY = 790,
  BW = 560,
  BH = 92;
add(
  `<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="10" fill="#ffffff" stroke="${C.ext}" stroke-width="1.6" stroke-dasharray="6 4"/>`,
);
text(BX + 12, BY + 18, 'BACKEND API  ·  typescript-cloudflare-backend', { size: 10.5, weight: 700, fill: C.ext });
text(BX + 12, BY + 38, 'deployed   /api → worker/index.ts → service binding', {
  size: 12,
  family: MONO,
  fill: '#334155',
});
text(BX + 12, BY + 56, '           staging: be-staging · production: be-prod', {
  size: 12,
  family: MONO,
  fill: '#334155',
});
text(BX + 12, BY + 74, 'local      http://localhost:8080/api (direct)', {
  size: 12,
  family: MONO,
  fill: '#334155',
});
add(
  `<path d="M${http.x + http.w / 2},${CY + CH} L${http.x + http.w / 2},${BY - 2}" stroke="${
    C.ext
  }" stroke-width="1.8" marker-end="url(#a-ext)"/>`,
);
text(http.x + http.w / 2 + 8, CY + CH + 32, 'same-origin /api, cookie auth', { size: 11, fill: '#64748b' });

// --- Legend
const LX = X0,
  LY = 790;
add(`<rect x="${LX}" y="${LY}" width="560" height="148" rx="10" fill="#ffffff" stroke="#e2e8f0"/>`);
text(LX + 14, LY + 22, 'Legend', { size: 13, weight: 700 });
const swatch = (i, k, label) => {
  const x = LX + 14 + (i % 3) * 180,
    y = LY + 44 + Math.floor(i / 3) * 22;
  add(
    `<rect x="${x}" y="${y - 10}" width="14" height="14" rx="3" fill="${tint[k]}" stroke="${
      C[k]
    }" stroke-width="1.6"/>`,
  );
  text(x + 22, y + 1, label, { size: 12 });
};
[
  ['app', 'apps'],
  ['auth', 'auth'],
  ['articles', 'articles'],
  ['home', 'home'],
  ['profile', 'profile'],
  ['settings', 'settings'],
].forEach(([k, l], i) => swatch(i, k, l));
add(
  `<path d="M${LX + 14},${LY + 98} L${LX + 54},${
    LY + 98
  }" stroke="#64748b" stroke-width="1.8" marker-end="url(#a-gray)"/>`,
);
text(LX + 62, LY + 102, 'depends on (colour of the library it points to)', { size: 12 });
add(
  `<path d="M${LX + 14},${LY + 120} L${LX + 54},${
    LY + 120
  }" stroke="#64748b" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#a-gray)"/>`,
);
text(LX + 62, LY + 124, 'implicit / build / lazy route load', { size: 12 });
text(LX + 310, LY + 124, 'uses: …', { size: 11, family: MONO, fill: '#64748b' });
text(LX + 360, LY + 124, '= direct core/ui imports', { size: 12 });
add(`<rect x="${LX + 310}" y="${LY + 88}" width="52" height="17" rx="8.5" fill="${C.auth}"/>`);
text(LX + 336, LY + 100.5, 'guarded', { size: 10, weight: 600, fill: '#ffffff', anchor: 'middle' });
text(LX + 370, LY + 102, '= AuthGuard on the route', { size: 12 });

add('</svg>');
fs.writeFileSync(out, svg.join('\n') + '\n');
console.log('wrote', out);
