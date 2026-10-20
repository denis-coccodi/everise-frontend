// Generates docs/website-structure.svg: the pages (routes) of the Everise site,
// what each shows, where it leads, the navbar, and the site-wide rules.
// Run: node tools/diagrams/website-structure.js docs/website-structure.svg (then render the PNG, see README).
// The navbar's groups are read from nav-groups.ts; every route in
// app.config.ts must be on a card in SECTIONS, or the run fails.
const fs = require('fs');
const out = process.argv[2];
const COLOURS = require('./colours');

// --- What the code says
const config = fs.readFileSync('apps/everise/src/app/app.config.ts', 'utf8');
const ROUTES = [...config.matchAll(/path: '([^']*)'/g)].map((m) => `/${m[1]}`).filter((p) => p !== '/**');
const navSource = fs.readFileSync('apps/everise/src/app/layout/nav-group/nav-groups.ts', 'utf8');
const NAV = [...navSource.matchAll(/label: '([^']+)',\s*pages: \[([\s\S]*?)\n {4}\]/g)].map(([, label, pages]) => ({
  label,
  pages: [...pages.matchAll(/label: '([^']+)'[^}]*path: '([^']+)'/g)].map(([, t, path]) => ({ t, path })),
}));

// --- The pages. `routes`: the app.config.ts paths a card covers. `access`:
// 'guarded' (AuthGuard), 'members' (guests get a pitch), 'discord' (a link
// from the Discord asks guests to sign in first). `to`: where it leads.
const SECTIONS = [
  {
    title: 'Home and posts',
    cards: [
      {
        path: '/',
        title: 'Home',
        domain: 'home',
        routes: ['/', '/home'],
        lines: [
          'Tabs, each at its own address: Weekly (/), Hunts (?view=hunts), Your Feed (?view=yours, members) and Global Feed (?view=global)',
          "Weekly: the next resets, this week's Fashion Report and Island Sanctuary picks; Hunts: the hunt trains per data centre, asked every minute (both relayed from the Discord)",
          'Feeds: posts with favourites and a pager, a tag filter; new posts arrive live over the WebSocket',
          '/home redirects here',
        ],
        to: [
          ['a post', '/article/:id', 'articles'],
          ['its author', '/profile/:id', 'profile'],
          ['New Post (members)', '/editor', 'articles'],
        ],
      },
      {
        path: '/article/:id',
        title: 'Post',
        domain: 'articles',
        access: 'discord',
        routes: ['/article'],
        lines: [
          "Title, author, date; a roulette result's duty card or a listing's card",
          'The body from Markdown, with pictures, GIFs and YouTube',
          'Favourite, follow, comments · its author or an admin: Share to Discord',
        ],
        to: [
          ['its author', '/profile/:id', 'profile'],
          ['yours: Edit', '/editor/:id', 'articles'],
        ],
      },
      {
        path: '/editor  /editor/:id',
        title: 'Editor',
        domain: 'articles',
        access: 'guarded',
        routes: ['/editor'],
        lines: [
          'A new post, or yours to edit: title, Markdown body, tags, pictures and GIFs',
          'Optionally shared in the Everise Discord',
        ],
        to: [['Publish', '/article/:id', 'articles']],
      },
    ],
  },
  {
    title: 'Community',
    cards: [
      {
        path: '/party-finder',
        title: 'Party Finder',
        domain: 'party-finder',
        access: 'discord',
        routes: ['/party-finder'],
        lines: [
          "The game's listings on any data centre, from xivpf; Light from Odin by default",
          'Data centre, world, category, role, words, sort and page in the address',
          'Asked again every 30 seconds while in view',
          'Members: Share as post, or Share to Discord with a picture of the card',
        ],
        to: [
          ['a listing', '/party-finder/listings/:id', 'party-finder'],
          ['a listing shared as a post', '/article/:id', 'articles'],
        ],
      },
      {
        path: '/party-finder/listings/:id',
        title: 'Party Finder listing',
        domain: 'party-finder',
        access: 'discord',
        routes: ['/party-finder/listings/:id'],
        lines: ["One listing, checked every 30 seconds until it's gone", 'Gone: says so'],
        to: [['its data centre', '/party-finder?dc=…', 'party-finder']],
      },
      {
        path: '/venues',
        title: 'Venues',
        domain: 'venues',
        routes: ['/venues'],
        lines: [
          'FFXIV Venues on a data centre (?dc=, Light by default), open now first, then the week',
          'Search (?search=), kept when switching data centre',
        ],
        to: [['a venue', '/venues/:id', 'venues']],
      },
      {
        path: '/venues/:id',
        title: 'Venue',
        domain: 'venues',
        access: 'discord',
        routes: ['/venues/:id'],
        lines: [
          'Its description with links, regular openings in your time, tags and links',
          "The week's Partake events held there",
          'Members: Share to Discord · kept out of search engines',
        ],
        to: [
          ['an event', '/events/:id', 'events'],
          ['its data centre', '/venues?dc=…', 'venues'],
        ],
      },
      {
        path: '/events',
        title: 'Events',
        domain: 'events',
        routes: ['/events'],
        lines: [
          "This week's Partake events, rated at most Mature: on now first, then by day",
          'Data centre (?dc=) and search (?search=) in the address · asked again every 5 minutes',
        ],
        to: [['an event', '/events/:id', 'events']],
      },
      {
        path: '/events/:id',
        title: 'Event',
        domain: 'events',
        access: 'discord',
        routes: ['/events/:id'],
        lines: [
          'The organisers’ description, when and where in your time, the host and their links',
          'Members: Share to Discord until it ends · kept out of search engines',
        ],
        to: [
          ['its venue, when known', '/venues/:id', 'venues'],
          ['its data centre', '/events?dc=…', 'events'],
        ],
      },
      {
        path: '/waking-sands',
        title: 'The Waking Sands',
        domain: 'waking-sands',
        routes: ['/waking-sands'],
        lines: [
          'One room every member shares, live: bring characters in or send them out, and talk',
          'AI-voiced characters answer (Workers AI), within a daily budget · guests watch',
        ],
        to: [['a character', '/profile/character:<id>', 'profile']],
      },
    ],
  },
  {
    title: 'Tools',
    cards: [
      {
        path: '/roulette',
        title: 'Duty Roulette',
        domain: 'roulette',
        routes: ['/roulette'],
        lines: [
          'Three reels: the duty type, the duty, and how you run it, from the real game data',
          'The Duty Finder settings in the address (?types=…&min=50)',
          'Commence posts it to the feeds: members with a comment (and to Discord if ticked), guests by Tataru',
        ],
        to: [['the result', '/article/:id', 'articles']],
      },
      {
        path: '/market-history',
        title: 'Market History',
        domain: 'market',
        access: 'members',
        routes: ['/market-history'],
        lines: [
          "An item's median sale price per world over time, the cheapest listings now",
          'Item, region, quality, days and worlds in the address',
        ],
        to: [['guests: sign up', '/register', 'auth']],
      },
    ],
  },
  {
    title: 'Account',
    cards: [
      {
        path: '/login',
        title: 'Sign in',
        domain: 'auth',
        routes: ['/login'],
        lines: [
          'Email and password, or Google, Facebook or Discord; the bot check (Turnstile)',
          'Back to where you were',
        ],
        to: [
          ['Forgot password?', '/forgot-password', 'auth'],
          ['Sign up', '/register', 'auth'],
        ],
      },
      {
        path: '/register',
        title: 'Sign up',
        domain: 'auth',
        routes: ['/register'],
        lines: [
          'Username, email, password (a leaked one is refused), or a social account',
          'Then "Check your email" for the confirmation link',
        ],
        to: [['the link', '/confirm-email', 'auth']],
      },
      {
        path: '/confirm-email',
        title: 'Confirm your email',
        domain: 'auth',
        routes: ['/confirm-email'],
        lines: ["The confirmation email's link (?token=): confirms the address and signs in"],
        to: [['signed in', '/', 'home']],
      },
      {
        path: '/forgot-password  /reset-password',
        title: 'Password reset',
        domain: 'auth',
        routes: ['/forgot-password', '/reset-password'],
        lines: ['Emails a code, then a new password, typed twice', 'Every device is signed out afterwards'],
        to: [['sign in again', '/login', 'auth']],
      },
      {
        path: '/profile/:id',
        title: 'Profile',
        domain: 'profile',
        access: 'guarded',
        routes: ['/profile'],
        lines: [
          'Picture and bio; Follow (others) or Edit settings (yours)',
          'Tabs: their posts, and favourited (…/favorites)',
          'A Waking Sands character: /profile/character:<id>, no follow',
        ],
        to: [
          ['a post', '/article/:id', 'articles'],
          ['yours: Edit settings', '/settings', 'settings'],
        ],
      },
      {
        path: '/settings',
        title: 'Settings',
        domain: 'settings',
        access: 'guarded',
        routes: ['/settings'],
        lines: [
          'Picture (crop, upload), username, bio, dark mode',
          'Account: email, password, the sign-in methods',
          "Admins: the Waking Sands characters, members' roles",
        ],
        to: [['your profile', '/profile/:id', 'profile']],
      },
      {
        path: '/privacy',
        title: 'Privacy policy',
        domain: 'auth',
        routes: ['/privacy'],
        lines: ['What the site keeps and why; linked from the footer'],
      },
    ],
  },
];
const RULES = [
  [
    { t: 'Routing: ' },
    { t: '/home', mono: 1 },
    { t: ' and unknown paths go to ' },
    { t: '/', mono: 1 },
    { t: '; signed-out visitors of a guarded page go to ' },
    { t: '/login', mono: 1, c: 'auth' },
    { t: ', then back.' },
  ],
  [
    { t: 'Links shared in the Discord carry ' },
    { t: '?from=discord', mono: 1 },
    { t: ': whoever opens one signed out signs in first (discordLinkGuard), then comes back.' },
  ],
  [
    { t: 'API errors (core/error-handler): 401 → ' },
    { t: '/login', mono: 1, c: 'auth' },
    { t: ' · 404 → ' },
    { t: '/', mono: 1 },
    { t: ' · form errors in the backend’s words, on the form.' },
  ],
  [
    { t: 'Session: an httpOnly cookie from the backend, sent with every call to the same-origin ' },
    { t: '/api', mono: 1 },
    { t: '. Members get the notifications bell in the header.' },
  ],
  [
    {
      t: 'Search engines: the Worker writes each public page’s title, description and words; event and venue pages are noindex, staging is never indexed.',
    },
  ],
  [
    { t: 'Accessibility (WCAG 2.2 AA): every page has its own title and one ' },
    { t: '<main>', mono: 1 },
    { t: '; a page change moves the focus to it; dialogs keep the focus inside.' },
  ],
  [{ t: 'Pages are lazy-loaded per route; a deep link is served the app shell by Cloudflare (SPA fallback).' }],
];

// Every route on a card, every card's routes real.
const covered = SECTIONS.flatMap((s) => s.cards.flatMap((c) => c.routes));
const missing = ROUTES.filter((r) => !covered.includes(r));
const stale = covered.filter((r) => !ROUTES.includes(r));
if (missing.length || stale.length) {
  console.error(
    `Routes without a card: ${missing.join(', ') || '-'}; cards without a route: ${stale.join(', ') || '-'}`,
  );
  process.exit(1);
}

// --- Drawing
const W = 1560,
  X0 = 40;
const FONT = 'Segoe UI, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
const MONO = 'Consolas, SFMono-Regular, Menlo, monospace';
const BRAND = '#073a8c'; // royal blue, the site's title colour
const ACCESS = {
  guarded: { t: 'signed in', col: COLOURS.auth },
  members: { t: 'members', col: '#64748b' },
  discord: { t: 'from Discord: sign in', col: '#5865f2' },
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const svg = [];
const add = (s) => svg.push(s);
const text = (x, y, s, o = {}) =>
  add(
    `<text x="${x}" y="${y}" font-size="${o.size || 12.5}" font-weight="${o.weight || 400}" fill="${
      o.fill || '#1e293b'
    }"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.style ? ` font-style="${o.style}"` : ''}${
      o.family ? ` font-family="${o.family}" xml:space="preserve"` : ''
    }>${esc(s)}</text>`,
  );
// Approximate text widths, for wrapping and placing badges.
const widthOf = (s, size = 12.5, mono = false) => s.length * size * (mono ? 0.6 : 0.47);
// A line of mixed segments, one <text> whose <tspan>s the browser lays out.
function rich(x, y, segs, size = 12.5) {
  const spans = segs.map(
    (s) =>
      `<tspan${s.mono ? ` font-family="${MONO}" font-size="${size - 0.5}"` : ''} fill="${
        s.c ? COLOURS[s.c] : s.fill || '#1e293b'
      }">${esc(s.t)}</tspan>`,
  );
  add(`<text x="${x}" y="${y}" font-size="${size}" xml:space="preserve">${spans.join('')}</text>`);
}
function wrap(line, width, size = 12.5) {
  const lines = [];
  let current = '';
  for (const word of line.split(' ')) {
    if (current && widthOf(`${current} ${word}`, size) > width) {
      lines.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines;
}

// A page card's rows, then its height.
const CARD_W = (W - 2 * X0 - 2 * 16) / 3;
function rows(card) {
  const r = [];
  for (const line of card.lines) wrap(line, CARD_W - 44).forEach((l, i) => r.push({ t: l, bullet: i === 0 }));
  if (card.to?.length) {
    r.push({ label: 'GOES TO' });
    for (const [label, path, domain] of card.to)
      r.push({ to: [{ t: `→ ${label} ` }, { t: path, mono: 1, c: domain }] });
  }
  return r;
}
const cardHeight = (card) => 44 + rows(card).length * 19 + 8;
function drawCard(card, x, y, h) {
  const col = COLOURS[card.domain];
  add(
    `<rect x="${x}" y="${y}" width="${CARD_W}" height="${h}" rx="10" fill="${col}0d" stroke="${col}" stroke-width="1.8"/>`,
  );
  text(x + 14, y + 24, card.path, { size: 14, family: MONO, fill: col, weight: 600 });
  text(x + CARD_W - 14, y + 24, card.title, { size: 14, weight: 700, anchor: 'end' });
  if (card.access) {
    const a = ACCESS[card.access];
    const w = widthOf(a.t, 10) + 16;
    add(`<rect x="${x + CARD_W - 14 - w}" y="${y + 32}" width="${w}" height="17" rx="8.5" fill="${a.col}"/>`);
    text(x + CARD_W - 14 - w / 2, y + 44.5, a.t, { size: 10, weight: 600, fill: '#ffffff', anchor: 'middle' });
  }
  let ry = y + 44;
  for (const r of rows(card)) {
    ry += 19;
    if (r.label) text(x + 14, ry, r.label, { size: 10.5, weight: 700, fill: '#64748b' });
    else if (r.to) rich(x + 14, ry, r.to);
    else text(x + (r.bullet ? 14 : 26), ry, `${r.bullet ? '• ' : ''}${r.t}`, { fill: '#334155' });
  }
}

const body = [];
let y = 84;

// The navbar, signed out and signed in.
const NAV_W = (W - 2 * X0 - 30) / 2;
function navbar(x, label, items, note) {
  const top = y;
  body.push(() => {
    text(x, top, label, { size: 11, weight: 700, fill: '#64748b' });
    add(
      `<rect x="${x}" y="${
        top + 10
      }" width="${NAV_W}" height="56" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>`,
    );
    text(x + 18, top + 46, 'everise', { size: 20, weight: 700, fill: BRAND });
    let ix = x + 120;
    for (const item of items) {
      text(ix, top + 32, item.t, { size: 12.5, weight: item.active ? 700 : 400 });
      text(ix, top + 50, item.sub, { size: 10.5, family: MONO, fill: COLOURS[item.c] || '#64748b' });
      ix += Math.max(widthOf(item.t, 12.5), widthOf(item.sub, 10.5, true)) + 22;
    }
    text(x, top + 86, note, { size: 11.5, fill: '#64748b', style: 'italic' });
  });
}
const groups = NAV.map((g) => ({ t: `${g.label} ▾`, sub: `${g.pages.length} pages`, c: 'ext' }));
navbar(
  X0,
  'NAVBAR · SIGNED OUT',
  [
    { t: 'Home', sub: '/', c: 'home', active: true },
    ...groups,
    { t: 'Sign in', sub: '/login', c: 'auth' },
    { t: 'Sign up', sub: '/register', c: 'auth' },
  ],
  'First Tab: "Skip to main content". On a phone the links fold under Menu. Footer on every page: crest → /, privacy policy.',
);
navbar(
  X0 + NAV_W + 30,
  'NAVBAR · SIGNED IN',
  [
    { t: 'Home', sub: '/', c: 'home', active: true },
    ...groups,
    { t: '🔔', sub: 'notifications', c: 'notifications' },
    { t: 'Account ▾', sub: 'profile · settings', c: 'profile' },
  ],
  NAV.map((g) => `${g.label}: ${g.pages.map((p) => p.t).join(', ')}`).join('  ·  '),
);
y += 112;

// A band per section, its cards in three columns, each into the shortest.
for (const section of SECTIONS) {
  const top = y;
  const cols = [top + 40, top + 40, top + 40];
  const placed = section.cards.map((card) => {
    const i = cols.indexOf(Math.min(...cols));
    const h = cardHeight(card);
    const at = { card, x: X0 + 16 + i * (CARD_W + 16) - 16, y: cols[i], h };
    cols[i] += h + 16;
    return at;
  });
  const bottom = Math.max(...cols) + 2;
  body.push(() => {
    add(
      `<rect x="${X0 - 16}" y="${top}" width="${W - 2 * X0 + 32}" height="${
        bottom - top
      }" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>`,
    );
    text(X0, top + 26, section.title.toUpperCase(), { size: 12, weight: 700, fill: '#64748b' });
    placed.forEach((p) => drawCard(p.card, p.x, p.y, p.h));
  });
  y = bottom + 20;
}

// Site-wide rules, and the legend.
const rulesTop = y;
body.push(() => {
  const h = 48 + RULES.length * 24 + 34;
  add(
    `<rect x="${X0 - 16}" y="${rulesTop}" width="${
      W - 2 * X0 + 32
    }" height="${h}" rx="12" fill="#ffffff" stroke="#e2e8f0"/>`,
  );
  text(X0, rulesTop + 28, 'Site-wide rules', { size: 13.5, weight: 700 });
  RULES.forEach((r, i) => rich(X0, rulesTop + 56 + i * 24, r));
  let lx = X0;
  const ly = rulesTop + 56 + RULES.length * 24 + 8;
  for (const a of Object.values(ACCESS)) {
    const w = widthOf(a.t, 10) + 16;
    add(`<rect x="${lx}" y="${ly - 12}" width="${w}" height="17" rx="8.5" fill="${a.col}"/>`);
    text(lx + w / 2, ly + 0.5, a.t, { size: 10, weight: 600, fill: '#ffffff', anchor: 'middle' });
    lx += w + 8;
  }
  text(
    lx,
    ly + 1,
    '= AuthGuard on the route · the page shows guests a pitch instead · a link from the Discord asks guests to sign in. Card colours match the library in frontend-structure.svg.',
    {
      size: 11.5,
      fill: '#64748b',
    },
  );
});
y = rulesTop + 48 + RULES.length * 24 + 34 + 24;

const H = Math.ceil(y);
add(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`,
);
add(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
text(X0, 38, 'Everise website — pages and navigation', { size: 22, weight: 700 });
text(
  X0,
  60,
  `Every route of the Angular app (${ROUTES.length}), what the page shows and where it leads, grouped as the navbar groups them.`,
  {
    size: 13,
    fill: '#475569',
  },
);
body.forEach((f) => f());
add('</svg>');
fs.writeFileSync(out, svg.join('\n') + '\n');
console.log(`wrote ${out} (${W}×${H})`);
