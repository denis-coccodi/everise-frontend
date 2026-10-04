---
name: theme
description: The Everise site's Final Fantasy XIV theme and its rules - every colour, font, radius, shadow and gradient comes from apps/everise/src/styles.scss (role tokens and the shared .xiv-* / .btn / .card classes), never from a component. Use before writing or changing any HTML template, CSS/SCSS, inline style or SVG colour in this repo, when adding a page or component, when asked about the look, colours, fonts, dark or light mode or "theme", and when reviewing a change that touches styles.
---

# The FFXIV theme

The whole site looks like Final Fantasy / FFXIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings. `apps/everise/src/styles.scss` is the single source of that look. Components consume it; they don't restyle it.

Two modes, both defined only as role values:

- **Dark (default):** near-black navy backdrop, deep-blue windows, silver-white trim, crystal-teal highlights, white headings.
- **Light (`body.light`):** Final Fantasy white. White and silver windows, royal-blue highlights, ink-navy text.

`SettingsStore` toggles the mode: Settings → Dark Mode is on by default, and off adds `body.light`. The choice is stored in `localStorage.darkMode`, where only `"false"` means light.

Colours chosen with the user, as palette entries:

| Colour       | Hex       | Role                                              |
| ------------ | --------- | ------------------------------------------------- |
| Royal blue   | `#073a8c` | primary in light mode, title bars, wheel segments |
| Crystal teal | `#00a9b0` | primary in dark mode, the crystal motif           |
| Mist grey    | `#dcdcdc` | silver trim                                       |
| Amber        | `#c49a0b` | accent, used sparingly                            |
| Violet       | `#644a74` | tertiary                                          |
| Magenta      | `#b44ba8` | highlight, for a win                              |
| Ember        | `#c95a28` | danger                                            |

Keep it Final Fantasy, not Gold Saucer: no casino bulbs, no gold metal, no gold glow.

## The three layers in styles.scss

1. **Palette** (`--palette-*`): raw colours. Referenced **only inside styles.scss**, to define roles.
2. **Roles**: what everything else uses.
   - Base, the page behind everything: `--color-base`, `--color-base-deep`, `--color-base-raised`.
   - Surfaces (windows, cards, inputs): `--color-surface`, `--color-surface-strong`, `--color-surface-highlight`, `--color-field`.
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
   - Lines: `--color-border`, `-strong`, `-soft`, `-faint`, `--color-divider`.
   - States: `--color-hover`, `--color-focus`, `--color-overlay`, `--color-shade`.
   - Fonts:
     - `--font-display` (Cinzel: titles, window headers, big buttons);
     - `--font-body` (Source Sans Pro);
     - `--font-reading` (article text);
     - letter spacing: `--letter-spacing-display`, `--letter-spacing-label`.
   - Shapes: `--radius-sm/md/lg/xl/pill`, `--border-width`, `--border-width-strong`.
   - Depth: `--shadow-raised`, `--shadow-panel`, `--shadow-inset`, `--glow-primary(-strong)`, `--glow-crystal`, `--glow-heading`.
   - Gradients: `--gradient-page`, `-panel`, `-window`, `-title-bar`, `-primary`, `-primary-flat`, `-secondary-button`, `-well`, `-navbar`, `-result-bar`, `-edge-shade`.
3. **Shared components**: use these classes before writing CSS.
   - Windows: `.xiv-panel` (the window), with `.xiv-title-bar` as its first child (the header strip).
   - Text: `.xiv-title` (big page title), `.xiv-label` (small uppercase label), `.xiv-heading` (section heading in a window).
   - Controls: `.xiv-chip` (small pill buttons such as All / None), `.xiv-cta` (the big call to action), `.xiv-check` (checkbox row).
   - The classic classes are themed too:
     - `.btn-primary` and `.btn-secondary`, plus the `.btn-outline-*`, `.btn-sm` and `.btn-lg` variants;
     - `.card`, `.form-control`, `.nav-pills` / `.outline-active` tabs, `.tag-default`, `.pagination`, `.banner`, `.navbar`.

## Rules

1. **No raw values in components.** Templates, component `.css` / `.scss` files, inline `style` and SVG attributes don't contain colours (hex, `rgb()`, `hsl()`, named colours), font families, `box-shadow` / `text-shadow` values or gradients. Use a role token (`var(--color-…)`, `var(--font-…)`, `var(--shadow-…)`, …) or a shared class. For SVG, set `fill`, `stroke` and `stop-color` from CSS with role tokens; see `libs/roulette/.../wheel`.
2. **Never use a `--palette-*` token outside styles.scss.** If no role fits, add a role to `:root` (the dark default) and to `body.light`, then use it.
3. **Pick roles by meaning, not by colour.** Headings use `--color-heading`, links `--color-link`, the main action primary. Never pick a role because it happens to be the colour you want in one mode: check that it reads right in **both** modes.
4. **Reuse before you style.** Build a page from `.xiv-panel` + `.xiv-title-bar`, `.btn-*`, `.form-control`, `.xiv-label` and so on. A component stylesheet holds layout (grid, flex, spacing, sizes) and component-specific animation only.
5. **A look that more than one component needs goes into styles.scss as a shared class**, not copied between components.
6. **Modes only re-point roles.** The light mode is `body.light { --color-…: … }`. Never write `body.light .some-component { … }`.
7. **Keep it Final Fantasy.**
   - Crystal motifs, silver-white trim, deep blue and white.
   - Primary for main actions and the active state; accent amber only in small doses; magenta only for a highlight.
   - Cinzel only for titles, window headers and big buttons; body text in Source Sans Pro.
   - Rounded windows (`--radius-lg`), pill buttons. No casino or Gold Saucer flourishes (blinking bulbs, gold metal, gold glow), no green UI.
8. **Readable and accessible.**
   - Body text on surfaces uses `--color-contrast` or `-soft`; `-muted` is for secondary text and `-faint` for hints only.
   - Keep visible focus (`--color-focus`).
   - Animations respect `prefers-reduced-motion`.
9. **Exceptions are rare and marked.** A value that truly can't be a token, such as `<meta name="theme-color">` or a third-party widget, gets a comment saying why.

## Before finishing a change that touches styles

Run from the repo root. This should print nothing; anything it prints needs a token, a shared class, or a marked exception:

```
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|gradient\(|font-family:\s*'" apps libs --include=*.css --include=*.scss --include=*.html --include=*.ts | grep -v "apps/everise/src/styles.scss" | grep -v node_modules | grep -vE 'href="#|routerLink="#'
grep -rn -- "--palette-" apps libs | grep -v "apps/everise/src/styles.scss"
```

Then check the page in **both modes** (Settings → Dark Mode on and off; or set `localStorage.darkMode` to `"false"` for light) on a desktop and a 390 px wide viewport. Component styles must stay under the 6 kB `anyComponentStyle` budget, which is easy when they hold layout only.
