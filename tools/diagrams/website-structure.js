// Generates docs/website-structure.svg: the pages (routes) of the Conduit site,
// what each shows, where it leads, and the global routing rules.
// Run: node tools/diagrams/website-structure.js docs/website-structure.svg (then render the PNG, see README).
const fs = require('fs');
const out = process.argv[2];

const W = 1560,
  H = 1056,
  X0 = 40;
const FONT = 'Segoe UI, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
const MONO = 'Consolas, SFMono-Regular, Menlo, monospace';
// Page colours match the owning feature library in frontend-structure.svg.
const C = {
  auth: '#7c3aed',
  articles: '#2563eb',
  home: '#059669',
  profile: '#c2410c',
  settings: '#be185d',
  app: '#0f766e',
  ink: '#1e293b',
  muted: '#64748b',
  line: '#94a3b8',
};
const T = {
  auth: '#f5f3ff',
  articles: '#eff6ff',
  home: '#ecfdf5',
  profile: '#fff7ed',
  settings: '#fdf2f8',
  app: '#f0fdfa',
};
const BRAND = '#5cb85c'; // Conduit green
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = [];
const add = (s) => svg.push(s);
function text(x, y, s, o = {}) {
  const mono = o.mono ? ` font-family="${MONO}" xml:space="preserve"` : '';
  add(
    `<text x="${x}" y="${y}" font-size="${o.size || 12.5}" font-weight="${o.weight || 400}" fill="${o.fill || C.ink}"${
      o.anchor ? ` text-anchor="${o.anchor}"` : ''
    }${o.italic ? ' font-style="italic"' : ''}${mono}>${esc(s)}</text>`,
  );
}
// Rich line: segments [{t, mono, fill, weight}] laid out left to right (approximate widths).
function rich(x, y, segs, size = 12.5) {
  const spans = segs
    .map(
      (s) =>
        `<tspan fill="${s.fill || C.ink}" font-weight="${s.weight || 400}"${
          s.mono ? ` font-family="${MONO}"` : ''
        }>${esc(s.t)}</tspan>`,
    )
    .join('');
  add(`<text x="${x}" y="${y}" font-size="${size}" xml:space="preserve">${spans}</text>`);
}
const arrowDefs = () => {
  add('<defs>');
  for (const [k, v] of Object.entries(C))
    add(
      `<marker id="a-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${v}"/></marker>`,
    );
  add('</defs>');
};

add(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`,
);
arrowDefs();
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
text(X0, 38, 'Conduit website — pages and navigation', { size: 22, weight: 700 });
text(
  X0,
  60,
  'Every route of the Angular app, what the page shows and where it leads. Page colours match the feature library that implements it.',
  { size: 13, fill: '#475569' },
);

// --- Navbar states
function navbar(x, y, w, label, links) {
  text(x, y - 8, label, { size: 11, weight: 700, fill: C.muted });
  add(`<rect x="${x}" y="${y}" width="${w}" height="48" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>`);
  text(x + 18, y + 31, 'conduit', { size: 20, weight: 700, fill: BRAND });
  let cx = x + w - 18;
  for (const l of links.slice().reverse()) {
    const lw = Math.max(l.t.length * 7.4, l.path ? l.path.length * 6.4 : 0);
    cx -= lw;
    text(cx, y + 22, l.t, { size: 13, fill: l.active ? C.ink : '#475569', weight: l.active ? 600 : 400 });
    if (l.path) text(cx, y + 38, l.path, { size: 10.5, mono: true, fill: C[l.c] || C.muted });
    cx -= 34;
  }
}
navbar(X0 + 30, 98, 640, 'NAVBAR · SIGNED OUT', [
  { t: 'Home', path: '/home', c: 'home', active: true },
  { t: 'Sign in', path: '/login', c: 'auth' },
  { t: 'Sign up', path: '/register', c: 'auth' },
]);
navbar(X0 + 720, 98, 760, 'NAVBAR · SIGNED IN', [
  { t: 'Home', path: '/home', c: 'home', active: true },
  { t: 'New Article', path: '/editor', c: 'articles' },
  { t: 'Settings', path: '/settings', c: 'settings' },
  { t: '◉ username', path: '/profile/:username', c: 'profile' },
]);
text(X0 + 30, 172, 'Footer on every page: conduit logo → /', { size: 11.5, fill: C.muted, italic: true });

// --- Root
const RX = 630,
  RY = 192,
  RW = 300,
  RH = 62;
add(
  `<rect x="${RX}" y="${RY}" width="${RW}" height="${RH}" rx="10" fill="${T.app}" stroke="${C.app}" stroke-width="2"/>`,
);
text(RX + RW / 2, RY + 25, '/  → redirects to /home', {
  size: 14,
  weight: 700,
  anchor: 'middle',
  mono: true,
  fill: C.app,
});
text(RX + RW / 2, RY + 46, 'unknown paths (**) → /home', { size: 12, anchor: 'middle', mono: true, fill: C.muted });

// --- Groups
const GY = 300;
const groups = {
  pub: { x: X0, y: GY, w: 470, h: 528, title: 'PUBLIC — anyone can open', col: C.muted },
  auth: {
    x: X0 + 500,
    y: GY,
    w: W - X0 * 2 - 500,
    h: 528,
    title: 'SIGNED IN ONLY — AuthGuard sends signed-out visitors to /login',
    col: C.auth,
  },
};
for (const g of Object.values(groups)) {
  add(
    `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="14" fill="#f8fafc" stroke="${g.col}" stroke-width="1.4" stroke-dasharray="7 5"/>`,
  );
  text(g.x + 16, g.y + 24, g.title, { size: 11.5, weight: 700, fill: g.col });
}
// root -> groups
const rootB = RY + RH;
add(
  `<path d="M${RX + 80},${rootB} C${RX + 80},${rootB + 30} ${groups.pub.x + groups.pub.w / 2},${GY - 30} ${
    groups.pub.x + groups.pub.w / 2
  },${GY - 2}" fill="none" stroke="${C.line}" stroke-width="1.8" marker-end="url(#a-muted)"/>`,
);
add(
  `<path d="M${RX + RW - 80},${rootB} C${RX + RW - 80},${rootB + 30} ${groups.auth.x + groups.auth.w / 2},${GY - 30} ${
    groups.auth.x + groups.auth.w / 2
  },${GY - 2}" fill="none" stroke="${C.auth}" stroke-width="1.8" marker-end="url(#a-auth)"/>`,
);

// --- Page cards
// lines: strings, or {to: [[label, path, colourKey], ...]} for "→" navigation rows
function page(p) {
  const col = C[p.c];
  add(
    `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="10" fill="${
      T[p.c]
    }" stroke="${col}" stroke-width="1.8"/>`,
  );
  text(p.x + 14, p.y + 24, p.path, { size: 14, weight: 700, mono: true, fill: col });
  text(p.x + p.w - 14, p.y + 24, p.title, { size: 14, weight: 700, anchor: 'end' });
  let y = p.y + 30;
  for (const l of p.lines) {
    if (typeof l === 'string') {
      y += 19;
      text(p.x + 14, y, '•  ' + l, { size: 12.5, fill: '#334155' });
    } else if (l.to) {
      for (const [label, path, ck] of l.to) {
        y += 19;
        rich(
          p.x + 14,
          y,
          [
            { t: '→ ', fill: C.muted },
            { t: label + ' ', fill: '#334155' },
            { t: path, mono: true, fill: C[ck] || C.muted, weight: 600 },
          ],
          12.5,
        );
      }
    } else if (l.gap) {
      y += l.gap;
    } else if (l.head) {
      y += 21;
      text(p.x + 14, y, l.head, { size: 11, weight: 700, fill: C.muted });
    }
  }
  if (p.children) p.children(p, y);
}

const pub = groups.pub,
  PW = pub.w - 32;
page({
  x: pub.x + 16,
  y: pub.y + 40,
  w: PW,
  h: 108,
  c: 'auth',
  path: '/login',
  title: 'Sign in',
  lines: [
    'Email + password form, server errors listed',
    {
      to: [
        ['signed in:', '/home', 'home'],
        ['"Need an account?"', '/register', 'auth'],
      ],
    },
  ],
});
page({
  x: pub.x + 16,
  y: pub.y + 160,
  w: PW,
  h: 108,
  c: 'auth',
  path: '/register',
  title: 'Sign up',
  lines: [
    'Username, email, password form',
    {
      to: [
        ['registered and signed in:', '/home', 'home'],
        ['"Have an account?"', '/login', 'auth'],
      ],
    },
  ],
});
page({
  x: pub.x + 16,
  y: pub.y + 280,
  w: PW,
  h: 230,
  c: 'articles',
  path: '/article/:slug',
  title: 'Article',
  lines: [
    'Banner: title, author, date',
    'Body rendered from Markdown, tag list',
    'Follow author, favorite ♥ (queued offline)',
    'Comments: add, delete your own',
    { head: 'GOES TO' },
    {
      to: [
        ['author', '/profile/:username', 'profile'],
        ['your article: Edit', '/editor/:slug', 'articles'],
        ['your article: Delete', '/home', 'home'],
        ['signed out: Sign in / up', '/login  /register', 'auth'],
      ],
    },
  ],
});

const ag = groups.auth,
  AW = (ag.w - 48) / 2,
  AX1 = ag.x + 16,
  AX2 = ag.x + 32 + AW;
page({
  x: AX1,
  y: ag.y + 40,
  w: AW,
  h: 170,
  c: 'home',
  path: '/home',
  title: 'Home',
  lines: [
    'Tabs: Your Feed (followed authors) · Global Feed',
    'Popular tags sidebar: click a tag to filter (#tag tab)',
    'Article previews with favorite ♥, pager',
    'Offline: cached feed, favorites synced when back online',
    { head: 'GOES TO' },
    { to: [['article preview', '/article/:slug', 'articles']] },
  ],
});
page({
  x: AX2,
  y: ag.y + 40,
  w: AW,
  h: 170,
  c: 'articles',
  path: '/editor   /editor/:slug',
  title: 'Editor',
  lines: [
    'New article at /editor',
    'Edit yours at /editor/:slug (a resolver loads it first)',
    'Title, description, Markdown body, tags',
    { head: 'GOES TO' },
    { to: [['Publish', '/article/:slug', 'articles']] },
  ],
});
page({
  x: AX1,
  y: ag.y + 222,
  w: AW,
  h: 290,
  c: 'settings',
  path: '/settings',
  title: 'Settings',
  lines: [
    'Picture URL, username, bio, email, new password',
    'Dark mode toggle (saved in this browser)',
    { head: 'GOES TO' },
    {
      to: [
        ['Update settings', '/profile/:username', 'profile'],
        ['Logout', '/login', 'auth'],
      ],
    },
  ],
});
page({
  x: AX2,
  y: ag.y + 222,
  w: AW,
  h: 290,
  c: 'profile',
  path: '/profile/:username',
  title: 'Profile',
  lines: ['Avatar, bio; Follow (others) or Edit settings (you)', { gap: 6 }],
  children: (p, y) => {
    // two child routes as tabs
    const tw = (p.w - 42) / 2,
      ty = y + 12;
    const tabs = [
      ['My Articles', '/profile/:username', 'their articles'],
      ['Favorited Articles', '/profile/:username/favorites', 'articles they ♥'],
    ];
    tabs.forEach(([t, path, d], i) => {
      const tx = p.x + 14 + i * (tw + 14);
      add(
        `<rect x="${tx}" y="${ty}" width="${tw}" height="70" rx="8" fill="#ffffff" stroke="${C.profile}" stroke-width="1.3"/>`,
      );
      text(tx + 10, ty + 20, i === 0 ? 'TAB · default' : 'TAB', { size: 10, weight: 700, fill: C.profile });
      text(tx + 10, ty + 38, t, { size: 13, weight: 700 });
      text(tx + 10, ty + 56, path, { size: 11.5, mono: true, fill: C.profile });
    });
    let yy = ty + 70;
    for (const [label, path, ck] of [
      ['Edit settings (you)', '/settings', 'settings'],
      ['article preview', '/article/:slug', 'articles'],
    ]) {
      yy += 21;
      rich(
        p.x + 14,
        yy,
        [
          { t: '→ ', fill: C.muted },
          { t: label + ' ', fill: '#334155' },
          { t: path, mono: true, fill: C[ck], weight: 600 },
        ],
        12.5,
      );
    }
    text(p.x + 14, yy + 22, 'Article lists come from feature-articles-list (shared with Home)', {
      size: 11.5,
      fill: C.muted,
      italic: true,
    });
  },
});

// --- Global rules
const RY2 = 852;
add(
  `<rect x="${X0}" y="${RY2}" width="${
    W - X0 * 2
  }" height="178" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.4"/>`,
);
text(X0 + 16, RY2 + 26, 'Site-wide rules', { size: 14, weight: 700 });
const rules = [
  [
    ['Routing: ', null],
    ['/', 'app'],
    [' and unknown paths go to ', null],
    ['/home', 'home'],
    ['; signed-out visitors of a guarded page go to ', null],
    ['/login', 'auth'],
    ['.', null],
  ],
  [
    ['API errors (core/error-handler): ', null],
    ['401 Unauthorized', null],
    [' → ', null],
    ['/login', 'auth'],
    ['  ·  ', null],
    ['404 Not Found', null],
    [' → ', null],
    ['/', 'app'],
    ['  ·  form errors shown on the form', null],
  ],
  [
    ['Session: ', null],
    ['httpOnly ', null],
    ['token', 'app'],
    [' cookie set by the backend on sign in / sign up, sent with every API call (withCredentials).', null],
  ],
  [
    ['Offline (offline-sw.js, staging/production): ', null],
    ['API GETs are cached and replayed offline; favorites made offline are queued and synced later.', null],
  ],
  [
    ['Pages are lazy-loaded per route; the URL of a deep link (e.g. ', null],
    ['/article/:slug', 'articles'],
    [') is served the app shell by Cloudflare (SPA fallback).', null],
  ],
];
rules.forEach((r, i) => {
  rich(
    X0 + 16,
    RY2 + 54 + i * 24,
    r.map(([t, ck]) => (ck ? { t, mono: true, fill: C[ck], weight: 600 } : { t, fill: '#334155' })),
    12.5,
  );
});

add('</svg>');
fs.writeFileSync(out, svg.join('\n') + '\n');
console.log('wrote', out);
