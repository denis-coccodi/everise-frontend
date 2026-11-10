---
title: Theme
nav_order: 4
---

# Theme

The whole site looks like FINAL FANTASY XIV: crystal motifs, deep-blue windows, silver-white trim and Cinzel headings. Keep it Final Fantasy, not Gold Saucer: no casino bulbs, no gold metal, no gold glow.

The full rules are in the repository's `theme` skill, and the building blocks in its `building-blocks.md`.

## Only the theme is global

| Where                             | What                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `libs/ui/components/src/theme/`   | `_tokens.scss` (palette, roles, light mode), `_base.scss` (reset, element typography, layout grid), `_typography.scss` (`.xiv-title`, `.xiv-label`, `.visually-hidden`…) |
| `apps/everise/src/styles.scss`    | Only `@use`s the theme                                                                                                                                                   |
| `libs/ui/components/src/<block>/` | Each building block in its own folder, with its own styles                                                                                                               |
| Feature and app components        | Their own `*.component.scss`, using role tokens only                                                                                                                     |

`.xiv-prose` is global on purpose: a post's rendered body is set through `[innerHTML]`, outside Angular's style scoping.

## Two modes

- **Dark (default):** near-black navy backdrop, deep-blue windows, silver-white trim, crystal-teal highlights.
- **Light (`body.light`):** "Final Fantasy white": white and silver windows, royal-blue highlights, ink-navy text.

`SettingsStore` sets the mode.

- A signed-in member's choice is saved with their account (`darkMode`), so it follows them to every browser.
- `localStorage.darkMode` keeps a copy for the next page load, and for guests.

## Palette

| Colour       | Hex       | Role                                    |
| ------------ | --------- | --------------------------------------- |
| Royal blue   | `#073a8c` | Primary in light mode, title bars       |
| Crystal teal | `#00a9b0` | Primary in dark mode, the crystal motif |
| Mist grey    | `#dcdcdc` | Silver trim                             |
| Amber        | `#c49a0b` | Accent, sparingly                       |
| Violet       | `#644a74` | Tertiary                                |
| Magenta      | `#b44ba8` | Highlight, for a win                    |
| Ember        | `#c95a28` | Danger                                  |

## Role tokens

Palette entries (`--palette-*`) are used **only inside the theme folder**, to define roles. Everything else uses roles:

| Group                                  | Tokens                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Base                                   | `--color-base`, `-deep`, `-raised`                                                                                     |
| Surfaces                               | `--color-surface`, `--color-surface-strong`, `--color-field`                                                           |
| Text                                   | `--color-contrast` (`-soft`, `-muted`, `-faint`), `--color-heading`, `--color-label`                                   |
| Primary                                | `--color-primary` (`-strong`, `-bright`, `-weak`, `-deep`), `--color-on-primary`                                       |
| Secondary, tertiary, accent, highlight | `--color-secondary`, `--color-tertiary`, `--color-accent`, `--color-highlight`, each with `--color-on-…`               |
| Crystal motif                          | `--color-crystal` (`-bright`, `-deep`)                                                                                 |
| Links                                  | `--color-link`, `--color-link-hover`                                                                                   |
| Status                                 | `--color-danger` (`-strong`), `--color-success`                                                                        |
| Lines                                  | `--color-border` (`-strong`, `-soft`, `-faint`), `--color-divider`, `--color-border-field` (3:1 or more)               |
| States                                 | `--color-hover`, `--color-focus`, `--color-overlay`, `--color-shade`                                                   |
| Fonts                                  | `--font-display` (Cinzel), `--font-body` (Source Sans Pro), `--font-reading` (Marcellus, for post text and long pages) |
| Shapes and depth                       | `--radius-*`, `--border-width`, `--shadow-*`, `--glow-*`, `--gradient-*`                                               |

"Strong" and "bright" mean more emphasis on that mode's surfaces: lighter in dark mode, darker in light mode. Every role's contrast is checked in both modes, so a style that keeps to role tokens stays accessible.

## Building blocks (`@everise/ui/components`)

Use these first:

- **Controls:** buttons and button links (`cdtButton`), fields (`cdtInput`, `<cdt-field>`), `<cdt-checkbox>`, `<cdt-switch>`, `<cdt-tooltip>`.
- **Containers:** windows (`<cdt-panel>`), `<cdt-card>`, `<cdt-banner>`, `<cdt-dialog>`, `<cdt-menu>`.
- **Navigation:** tabs (`cdtTabs`/`cdtTab`), tags (`cdtTag`), `<cdt-pager>`.
- **Content:** `<cdt-icon>`, `<cdt-avatar>`, `<cdt-message>`, `<cdt-byline>`, `<cdt-duty-card>`.
- **Special-purpose:** `<cdt-turnstile>`, `<cdt-image-cropper>`, and others listed in `building-blocks.md`.

Building blocks on native elements (`cdtButton`, `cdtInput`, `cdtTabs`, `cdtTag`, `cdtMenuItem`) are components with attribute selectors, as Angular Material does. They keep native semantics, forms and accessibility, and can still carry their own styles.

**A new kind of control** goes into the UI library as its own folder (`.ts`, `.scss`, `.spec.ts`), exported from `src/index.ts` and listed in `building-blocks.md`, before any feature uses it.

## Mobile first

Styles are written for phones first, and wider screens are added from a width up. `scripts/check-mobile-first.mjs` fails a style that narrows below a width. Before a UI pull request, check the spacing at every breakpoint, both signed in and signed out.
