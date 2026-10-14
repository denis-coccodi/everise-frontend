---
name: theme
description: Describes the Everise site's Final Fantasy XIV theme, its UI building blocks, and where styles live: only the theme (libs/ui/components/src/theme: tokens, reset, typography, layout grid) is global, and every building block, page and layout component carries its own styles with role tokens only. Use before writing or changing any HTML template, CSS/SCSS, inline style or SVG colour, when adding a page, component, control, window, dialog, tab or tag, when asked about the look, colours, fonts, dark or light mode or global styles, and when reviewing a change that touches templates or styles.
---

# The FFXIV theme, the UI library, and where styles live

The whole site looks like Final Fantasy / FFXIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings.

**Only the theme is global.** Every other style belongs to the component that uses it, in that component's folder, scoped by Angular (the default emulated encapsulation, `:host` for the component's own element).

| Where                                    | What                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/ui/components/src/theme/` (global) | `_tokens.scss`: palette, roles, light mode. `_base.scss`: reset, element typography (body, headings, links, focus), the layout grid (`.container`, `.row`, `.col-*`, `.container.page`) and utilities (`.pull-xs-right`, `.text-xs-center`). `_typography.scss`: `.xiv-title`, `.xiv-label`, `.xiv-heading`, `.logo-font`, `.visually-hidden` (screen readers only), `.xiv-prose`. `index.scss` loads them. |
| `apps/everise/src/styles.scss`           | Only `@use`s the theme. Nothing else.                                                                                                                                                                                                                                                                                                                                                                       |
| `libs/ui/components/src/<block>/`        | Each building block, one per folder: `<block>.component.ts`, `<block>.component.scss`, `<block>.component.spec.ts`.                                                                                                                                                                                                                                                                                         |
| Feature and app components               | Their own `*.component.scss` next to the template (pages, the navbar, the footer, the app shell…), holding layout and page-specific looks with role tokens.                                                                                                                                                                                                                                                 |

Why these are global, as Angular recommends for global styles: design tokens, the reset and element defaults, typography, and a shared layout grid used by most pages. `.xiv-prose` is global on purpose: content set through `[innerHTML]` (the rendered article body) is outside Angular's style scoping.

Two modes, both defined only as role values:

- **Dark (default):** near-black navy backdrop, deep-blue windows, silver-white trim, crystal-teal highlights, white headings.
- **Light (`body.light`):** Final Fantasy white. White and silver windows, royal-blue highlights, ink-navy text.

`SettingsStore` sets the mode: Dark mode is on by default, and off adds `body.light`. Settings → Appearance saves it with the user (`darkMode` on the backend), the app applies a signed-in user's saved mode, and `localStorage.darkMode` keeps a copy for the next page load and for guests (only `"false"` means light).

Colours chosen with the user, as palette entries:

| Colour       | Hex       | Role                                    |
| ------------ | --------- | --------------------------------------- |
| Royal blue   | `#073a8c` | primary in light mode, title bars       |
| Crystal teal | `#00a9b0` | primary in dark mode, the crystal motif |
| Mist grey    | `#dcdcdc` | silver trim                             |
| Amber        | `#c49a0b` | accent, used sparingly                  |
| Violet       | `#644a74` | tertiary                                |
| Magenta      | `#b44ba8` | highlight, for a win                    |
| Ember        | `#c95a28` | danger                                  |

Keep it Final Fantasy, not Gold Saucer: no casino bulbs, no gold metal, no gold glow.

## The UI building blocks (`@everise/ui/components`, use these first)

Buttons and button links (`cdtButton`), fields (`cdtInput`, `<cdt-field>`), `<cdt-checkbox>`, `<cdt-switch>`, `<cdt-tooltip>`, windows (`<cdt-panel>`), `<cdt-card>`, `<cdt-banner>`, `<cdt-dialog>`, `<cdt-menu>`, tabs (`cdtTabs`/`cdtTab`), tags (`cdtTag`), `<cdt-pager>`, `<cdt-icon>`, `<cdt-avatar>`, `<cdt-message>`, `<cdt-byline>`, `<cdt-turnstile>`, `<cdt-image-cropper>`, `<cdt-duty-card>`, `<cdt-community-links>`, and from `@everise/media` `<cdt-rich-text>` and `<cdt-media-grid>`. How each is used (inputs, variants, accessibility notes) is in [building-blocks.md](building-blocks.md): read it before adding a control, window or layout piece.

Building blocks on native elements (`cdtButton`, `cdtInput`, `cdtTabs`/`cdtTab`, `cdtTag`, `cdtMenuItem`) are **components with attribute selectors**, as Angular Material does (`button[mat-button]`). They keep native semantics, forms and accessibility, and, unlike directives, they can carry their own styles. The UI library's ESLint config allows attribute selectors for exactly those files.

**A new kind of control** (a radio group, a toggle…) goes into the UI library as its own folder with `.ts`, `.scss` and `.spec.ts`, exported from `src/index.ts`, and only then is used from a feature. Don't build it inside a feature library, and don't add its look to the theme. Add it to [building-blocks.md](building-blocks.md) too.

## The role tokens (`theme/_tokens.scss`)

1. **Palette** (`--palette-*`): raw colours. Referenced **only inside the theme folder**, to define roles.
2. **Roles**: what everything else uses.
   - Base, the page behind everything: `--color-base`, `--color-base-deep`, `--color-base-raised`.
   - Surfaces (windows, cards, inputs): `--color-surface`, `--color-surface-strong`, `--color-field`.
   - Contrast (text and icons): `--color-contrast`, `-soft`, `-muted`, `-faint`.
     - Titles and window headers: `--color-heading`.
     - Small uppercase labels: `--color-label`.
   - Primary (main actions, the active state, results): `--color-primary`, `-strong`, `-bright`, `-weak`, `-deep`. Text on it: `--color-on-primary`. "Strong" and "bright" mean _more emphasis on this mode's surfaces_: lighter in dark mode, darker in light mode.
   - Secondary (alternative actions, title bars): `--color-secondary`, `-strong`, `--color-on-secondary`.
   - Tertiary (a third hue for variety): `--color-tertiary`, `--color-on-tertiary`.
   - Accent (amber, sparingly): `--color-accent`, `-strong`, `--color-on-accent`.
   - Highlight (magenta, for the one thing that just happened, such as a win): `--color-highlight`, `-strong`, `--color-on-highlight`.
   - Crystal motif (teal in both modes): `--color-crystal`, `-bright`, `-deep`.
   - Links in text: `--color-link`, `--color-link-hover`. Behind avatars: `--color-avatar`.
   - Status: `--color-danger`, `--color-danger-strong`, `--color-success`.
   - Lines: `--color-border`, `-strong`, `-soft`, `-faint`, `--color-divider`. The outline of a text field or other control: `--color-border-field` (3:1 or more).
   - States: `--color-hover`, `--color-focus`, `--color-overlay`, `--color-shade`.
   - Fonts:
     - `--font-display` (Cinzel: titles, window headers, big buttons);
     - `--font-body` (Source Sans Pro);
     - `--font-reading` (Marcellus: post and comment text, long pages such as the privacy policy);
     - letter spacing: `--letter-spacing-display`, `--letter-spacing-label`.
   - Shapes: `--radius-sm/md/lg/xl/pill`, `--border-width`, `--border-width-strong`.
   - Depth: `--shadow-raised`, `--shadow-panel`, `--shadow-inset`, `--glow-primary(-strong)`, `--glow-crystal`, `--glow-heading`.
   - Gradients: `--gradient-page`, `-panel`, `-window`, `-title-bar`, `-primary`, `-primary-flat`, `-secondary-button`, `-well`, `-navbar`, `-result-bar`, `-edge-shade`.

## Rules

1. **Only the theme is global.**
   - `styles.scss` only loads the theme.
   - Never add a global class for one component or page: put the style in that component's `.scss`.
   - A new global rule is only right for tokens, element defaults, typography or the layout grid. Add it to the matching theme partial, with a comment saying why it's global.
2. **Styles live with their component.** Each component's look is in its own `.scss`, next to its `.ts` (and, in the UI library, its `.spec.ts`), scoped by Angular.
   - Style the component's own element with `:host`.
   - Never use `::ng-deep` or `ViewEncapsulation.None`.
   - A parent styles a child component only through the child's host element (spacing, position), never the child's insides. If a child needs a variant, give it an input.
3. **Reuse the UI library.** Buttons, fields, checkboxes, windows, cards, banners, dialogs, bylines, tabs, tags and pagination come from `@everise/ui/components`. A look that more than one component needs becomes a building block, not a copied stylesheet. One exception: two components of the same library showing the same thing may share one `.scss` file (`libs/core/forms/src/lib/error-messages.scss`).
4. **Breakpoints by name.** A layout changes only at the theme's widths: `@use '<relative path>/libs/ui/components/src/theme/breakpoints' as bp;` then `@include bp.up(sm | md | lg | xl) { … }` (576, 768, 992, 1200 px), from that width up only. Styles are **mobile first** (the `mobile-first` skill): the base is the phone, and wider screens change it in `bp.up(…)`, never with `max-width`. Never `@media (min-width: 900px)`.
5. **No raw values.** No colours (hex, `rgb()`, `hsl()`, named colours), font families, `box-shadow` / `text-shadow` values or gradients outside the theme. That covers templates, component stylesheets, inline `style` and SVG attributes. Use a role token (`var(--color-…)`, `var(--font-…)`, `var(--shadow-…)`, …). For SVG, set `fill`, `stroke` and `stop-color` from CSS with role tokens (as the roulette page's crystal icon does).
6. **Never use a `--palette-*` token outside the theme folder.** If no role fits, add a role to `_tokens.scss`, in `:root` (the dark default) and in `body.light`, then use it.
7. **Pick roles by meaning, not by colour.** Headings use `--color-heading`, links `--color-link`, the main action primary. Never pick a role because it happens to be the colour you want in one mode: check that it reads right in **both** modes.
8. **Modes only re-point roles.** The light mode is `body.light { --color-…: … }`. Never write `body.light .some-component { … }`.
9. **Keep it Final Fantasy.**
   - Crystal motifs, silver-white trim, deep blue and white.
   - Primary for main actions and the active state; accent amber only in small doses; magenta only for a highlight.
   - Cinzel only for titles, window headers and big buttons; body text in Source Sans Pro.
   - Rounded windows (`--radius-lg`), pill buttons. No casino or Gold Saucer flourishes (blinking bulbs, gold metal, gold glow), no green UI.
10. **Readable and accessible.**

- Body text on surfaces uses `--color-contrast` or `-soft`; `-muted` is for secondary text and `-faint` for hints only.
- The site targets WCAG 2.2 AA. Text on its background is at least 4.5:1 (3:1 for large text), control outlines and the focus ring at least 3:1, in **both** modes; a new role or palette value must be checked for that. `-faint` is the lowest that still passes.
- Keep visible focus (`--color-focus`). Keep native elements under the building blocks, for keyboard and screen-reader support: links (with `href`) go somewhere, buttons do something. Decorative icons get `aria-hidden="true"`; an icon-only button gets an `aria-label`.
- Every field has a label (`<cdt-field label>`), every page one `<h1>` and a `title` on its route.
- When a style sets `display` on an element that can be `[hidden]`, add `[hidden] { display: none; }` for it, or the element shows anyway.
- Animations respect `prefers-reduced-motion`, and anything that keeps moving on its own (the roulette's idle reels) has a way to pause it.

11. **Exceptions are rare and marked.** A value that truly can't be a token, such as `<meta name="theme-color">` or a third-party widget, gets a comment saying why.

## Before finishing a change that touches templates or styles

1. Run [scripts/check-theme.sh](scripts/check-theme.sh) from the repo root. It greps for what the rules forbid (raw colours, palette tokens, hand-made controls, global styles, `ng-deep`, raw media queries, hand-styled avatars) and must print `Theme: ok`. Anything it prints needs a token, a building block, a component stylesheet, or a marked exception.
2. Check the page in **both modes** (Settings → Dark Mode on and off; or set `localStorage.darkMode` to `"false"` for light) on a desktop and a 390 px wide viewport, with the keyboard alone, and with axe: the `ui-check` skill does all of it against a local backend.
3. Component styles must stay under the 6 kB `anyComponentStyle` budget (the production build fails otherwise).
