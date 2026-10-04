---
name: theme
description: The Everise site's Final Fantasy XIV theme and its rules - every colour, font, radius, shadow and gradient comes from apps/everise/src/styles.scss (role tokens and the shared .xiv-* / .btn / .card classes), never from a component. Use before writing or changing any HTML template, CSS/SCSS, inline style or SVG colour in this repo, when adding a page or component, when asked about the look, colours, fonts, dark mode or "theme", and when reviewing a change that touches styles.
---

# The FFXIV theme

The whole site looks like Final Fantasy XIV's interface: night-blue windows with gold trim, aether-blue highlights, Cinzel headings. `apps/everise/src/styles.scss` is the single source of that look. Components consume it; they don't restyle it.

Default look: the game's "Classic" UI. `body.dark` (Settings → Dark Mode, `SettingsStore`) is the game's charcoal "Dark" UI with the same gold trim.

## The three layers in styles.scss

1. **Palette** (`--palette-*`): raw colours. Referenced **only inside styles.scss**, to define roles.
2. **Roles**: what everything else uses.
   - Base, the page behind everything: `--color-base`, `--color-base-deep`, `--color-base-raised`.
   - Surfaces (windows, cards, inputs): `--color-surface`, `--color-surface-strong`, `--color-surface-highlight`, `--color-field`.
   - Contrast (text and icons): `--color-contrast`, `-soft`, `-muted`, `-faint`. Small uppercase labels use `--color-label`.
   - Primary, gold (trim, main actions, headings, the active state): `--color-primary`, `-strong`, `-bright`, `-weak`, `-deep`. Text on gold uses `--color-on-primary`.
   - Secondary, aether blue (highlights, focus, links, results): `--color-secondary`, `-strong`, `-weak`, plus `--color-on-secondary`.
   - Status: `--color-danger`, `--color-danger-strong`, `--color-success`.
   - Lines: `--color-border`, `-soft`, `-faint`, `--color-divider`.
   - States: `--color-hover`, `--color-focus`, `--color-overlay`, `--color-shade`.
   - Fonts: `--font-display` (Cinzel: titles, window headers, big buttons), `--font-body` (Source Sans Pro), `--font-reading` (article text). Letter spacing: `--letter-spacing-display`, `--letter-spacing-label`.
   - Shapes: `--radius-sm/md/lg/xl/pill`, `--border-width`, `--border-width-strong`.
   - Depth: `--shadow-raised`, `--shadow-panel`, `--shadow-inset`, `--glow-primary(-strong)`, `--glow-secondary`, `--glow-text-primary`.
   - Gradients: `--gradient-page`, `-panel`, `-window`, `-title-bar`, `-primary`, `-primary-flat`, `-secondary-button`, `-well`, `-navbar`, `-result-bar`, `-edge-shade`.
3. **Shared components**: use these classes before writing CSS.
   - Windows: `.xiv-panel` (the window), with `.xiv-title-bar` as its first child (the header strip).
   - Text: `.xiv-title` (big gold page title), `.xiv-label` (small uppercase label), `.xiv-heading` (section heading in a window).
   - Controls: `.xiv-chip` (small pill buttons such as All / None), `.xiv-cta` (the big gold call to action), `.xiv-check` (checkbox row).
   - The classic classes are themed too:
     - `.btn-primary` (gold) and `.btn-secondary` (blue window button), plus the `.btn-outline-*`, `.btn-sm` and `.btn-lg` variants;
     - `.card`, `.form-control`, `.nav-pills` / `.outline-active` tabs, `.tag-default`, `.pagination`, `.banner`, `.navbar`.

## Rules

1. **No raw values in components.** Templates, component `.css` / `.scss` files, inline `style` and SVG attributes don't contain colours (hex, `rgb()`, `hsl()`, named colours), font families, `box-shadow` / `text-shadow` values or gradients. Use a role token (`var(--color-…)`, `var(--font-…)`, `var(--shadow-…)`, …) or a shared class. For SVG, set `fill`, `stroke` and `stop-color` from CSS with role tokens; see `libs/roulette/.../wheel`.
2. **Never use a `--palette-*` token outside styles.scss.** If no role fits, add a role to styles.scss (and to `body.dark` if it should differ there), then use it.
3. **Reuse before you style.** Build a page from `.xiv-panel` + `.xiv-title-bar`, `.btn-*`, `.form-control`, `.xiv-label` and so on. A component stylesheet holds layout (grid, flex, spacing, sizes) and component-specific animation only.
4. **A look that more than one component needs goes into styles.scss as a shared class**, not copied between components.
5. **Theme variants only re-point roles.** Dark Mode is `body.dark { --color-…: … }`. Never write `body.dark .some-component { … }`.
6. **Keep it FFXIV.**
   - Dark windows with gold trim; gold for primary actions and headings; aether blue for highlights, focus and results.
   - Cinzel only for titles, window headers and big buttons; body text in Source Sans Pro.
   - Rounded windows (`--radius-lg`), pill buttons. No flat white pages, no green.
7. **Readable and accessible.**
   - Body text on surfaces uses `--color-contrast` or `-soft`; `-muted` is for secondary text and `-faint` for hints only.
   - Keep visible focus (`--color-focus`).
   - Animations respect `prefers-reduced-motion`.
8. **Exceptions are rare and marked.** A value that truly can't be a token, such as `<meta name="theme-color">` or a third-party widget, gets a comment saying why.

## Before finishing a change that touches styles

Run from the repo root. This should print nothing; anything it prints needs a token, a shared class, or a marked exception:

```
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|gradient\(|font-family:\s*'" apps libs --include=*.css --include=*.scss --include=*.html --include=*.ts | grep -v "apps/everise/src/styles.scss" | grep -v node_modules | grep -vE 'href="#|routerLink="#'
grep -rn -- "--palette-" apps libs | grep -v "apps/everise/src/styles.scss"
```

Then check the page in both themes (toggle Dark Mode in Settings) on a desktop and a 390 px wide viewport. Component styles must stay under the 6 kB `anyComponentStyle` budget, which is easy when they hold layout only.
