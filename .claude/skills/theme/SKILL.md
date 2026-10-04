---
name: theme
description: The Everise site's Final Fantasy XIV theme and UI library and their rules - the UI library (libs/ui/components, @realworld/ui/components) defines the theme (src/theme: role tokens and shared classes) and the dumb, themed building blocks (cdtButton, cdtInput, cdt-checkbox, cdt-panel, cdt-dialog, cdtTabs/cdtTab, cdtTag, cdt-pager); features and the app reuse those and never style controls or define colours, fonts, radii, shadows or gradients themselves. Use before writing or changing any HTML template, CSS/SCSS, inline style or SVG colour in this repo, when adding a page, component, button, field, checkbox, panel, dialog, tab or tag, when asked about the look, colours, fonts, dark or light mode, the UI library or "theme", and when reviewing a change that touches templates or styles.
---

# The FFXIV theme and the UI library

The whole site looks like Final Fantasy / FFXIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings.

**The UI library (`libs/ui/components`, imported as `@realworld/ui/components`) owns that look:**

1. **It defines the theme**, in `libs/ui/components/src/theme/`:
   - `_tokens.scss`: the palette, the roles, and the light mode;
   - `_base.scss`: reset, typography, layout grid, utilities;
   - `_shared.scss`: the `.xiv-*` building blocks;
   - `_controls.scss`: fields, buttons, tabs, cards, pagination, tags, banners;
   - `index.scss`: loads them in order.
2. **It provides the dumb building blocks** that apply the theme. Features and the app use these instead of writing control markup or styles.
3. **The app propagates it.** `apps/everise/src/styles.scss` loads the theme once (`@use '…/libs/ui/components/src/theme'`), so every library gets the tokens and classes. Below that, `styles.scss` only holds page layouts (footer, home, article, profile…), and those use role tokens only.

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

## The UI building blocks (use these first)

| Need                   | Use                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button / button link   | `<button cdtButton>` (primary), `cdtButton="secondary"`, `"outline-primary"`, `"outline-secondary"`, `"outline-danger"`, `"cta"` (big call to action), `"chip"` (small pill); `size="sm" \| "lg"`. Works on `<a>` too. Switch looks with `[cdtButton]="on ? 'primary' : 'outline-primary'"` instead of `ngClass`. |
| Text field / text area | `<input cdtInput>`, `<textarea cdtInput>`, `<select cdtInput>`; size as the value: `cdtInput="sm" \| "lg"`. Native element, so reactive forms, `formControlName`, `data-testid` and validation work as usual.                                                                                                     |
| Checkbox with label    | `<cdt-checkbox [(checked)]="on">Label</cdt-checkbox>`, or `[checked]` + `(checkedChange)`. Extra projected elements (a count badge) sit in the row. A disabled `<fieldset>` disables it.                                                                                                                          |
| Window                 | `<cdt-panel heading="Title">…</cdt-panel>` (title bar), or `label="…"` for an accessible name without a visible title.                                                                                                                                                                                            |
| Modal window           | `<cdt-dialog heading="Duty Found" (dismissed)="close()">…</cdt-dialog>`: dimmed backdrop, centred window, title bar; backdrop click or Escape emits `dismissed`. Move focus into the content when it opens.                                                                                                       |
| Tab bar                | `<ul cdtTabs><li><a cdtTab [active]="…">…</a></li></ul>`; link tabs can use `routerLinkActive="active"` instead of `[active]`.                                                                                                                                                                                    |
| Tag pill               | `<a cdtTag>`, `<li cdtTag="outline">`.                                                                                                                                                                                                                                                                            |
| Pagination             | `<cdt-pager>`.                                                                                                                                                                                                                                                                                                    |

Typography stays plain classes from the theme: `.xiv-title` (big page title), `.xiv-label` (small uppercase label), `.xiv-heading` (section heading in a window).

**A new kind of control** (a radio group, a select with an icon, a toggle…) goes into the UI library as a dumb, themed building block, with a spec in `libs/ui/components/src/ui-components.spec.ts`. Its look goes into a theme partial, and only then is it used from a feature. Don't build it inside a feature library.

## The theme's three layers (`libs/ui/components/src/theme`)

1. **Palette** (`--palette-*`): raw colours. Referenced **only inside the theme folder**, to define roles.
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
3. **Classes** the building blocks apply:

   - the `.xiv-*` blocks (`.xiv-panel`, `.xiv-title-bar`, `.xiv-dialog`, `.xiv-backdrop`, `.xiv-cta`, `.xiv-chip`, `.xiv-check`, …);
   - the classic `.btn-*`, `.form-control`, `.nav-pills`, `.tag-default`, `.pagination`, `.card`, `.banner`, `.navbar`.

   Features don't write these control classes in templates. They use the building blocks above.

## Rules

1. **Reuse the UI library.** Buttons, fields, checkboxes, windows, dialogs, tabs, tags and pagination come from `@realworld/ui/components`. Never write `class="btn …"`, `class="form-control"`, a bare `<input type="checkbox">`, or a hand-made panel in a feature.
2. **No raw values outside the theme.** Templates, component `.css` / `.scss` files, the app's page styles, inline `style` and SVG attributes don't contain colours (hex, `rgb()`, `hsl()`, named colours), font families, `box-shadow` / `text-shadow` values or gradients. Use a role token (`var(--color-…)`, `var(--font-…)`, `var(--shadow-…)`, …). For SVG, set `fill`, `stroke` and `stop-color` from CSS with role tokens; see `libs/roulette/.../wheel`.
3. **Never use a `--palette-*` token outside the theme folder.** If no role fits, add a role to `_tokens.scss`, in `:root` (the dark default) and in `body.light`, then use it.
4. **Pick roles by meaning, not by colour.** Headings use `--color-heading`, links `--color-link`, the main action primary. Never pick a role because it happens to be the colour you want in one mode: check that it reads right in **both** modes.
5. **Feature styles hold layout only**: grid, flex, spacing, sizes, and component-specific animation. A look that more than one place needs becomes a UI building block or a theme class, never a copy.
6. **Modes only re-point roles.** The light mode is `body.light { --color-…: … }`. Never write `body.light .some-component { … }`.
7. **Keep it Final Fantasy.**
   - Crystal motifs, silver-white trim, deep blue and white.
   - Primary for main actions and the active state; accent amber only in small doses; magenta only for a highlight.
   - Cinzel only for titles, window headers and big buttons; body text in Source Sans Pro.
   - Rounded windows (`--radius-lg`), pill buttons. No casino or Gold Saucer flourishes (blinking bulbs, gold metal, gold glow), no green UI.
8. **Readable and accessible.**
   - Body text on surfaces uses `--color-contrast` or `-soft`; `-muted` is for secondary text and `-faint` for hints only.
   - Keep visible focus (`--color-focus`). Keep native elements under the building blocks, for keyboard and screen-reader support.
   - Animations respect `prefers-reduced-motion`.
9. **Exceptions are rare and marked.** A value that truly can't be a token, such as `<meta name="theme-color">` or a third-party widget, gets a comment saying why. The site navbar (`apps/everise/.../navbar`) is app layout and keeps its `.nav-link` classes.

## Before finishing a change that touches templates or styles

Run from the repo root. All three should print nothing; anything printed needs a token, a building block, or a marked exception:

```
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|gradient\(|font-family:\s*'" apps libs --include=*.css --include=*.scss --include=*.html --include=*.ts | grep -v "libs/ui/components/src/theme/" | grep -v node_modules | grep -vE 'href="#|routerLink="#'
grep -rn -- "--palette-" apps libs | grep -v "libs/ui/components/src/theme/"
grep -rnE 'class="([^"]* )?(btn|btn-[a-z-]+|form-control[a-z-]*|xiv-(panel|title-bar|chip|cta|check)|nav-pills|tag-default|tag-pill)( [^"]*)?"|type="checkbox"' libs --include=*.html | grep -v "libs/ui/components/"
```

Then check the page in **both modes** (Settings → Dark Mode on and off; or set `localStorage.darkMode` to `"false"` for light) on a desktop and a 390 px wide viewport. Component styles must stay under the 6 kB `anyComponentStyle` budget, which is easy when they hold layout only.
