---
name: theme
description: The Everise site's Final Fantasy XIV theme, the UI library, and where styles live - only the theme (libs/ui/components/src/theme - tokens, reset, element typography, layout grid, text helpers) is global; every UI building block (cdtButton, cdtInput, cdt-checkbox, cdt-switch, cdt-tooltip, cdt-field, cdt-panel, cdt-card, cdt-banner, cdt-dialog, cdt-byline, cdtTabs/cdtTab, cdtTag, cdt-pager) and every page or layout component carries its own styles (and the UI blocks their specs) in its own folder, using role tokens only. Use before writing or changing any HTML template, CSS/SCSS, inline style or SVG colour in this repo, when adding a page, component, button, field, checkbox, panel, card, dialog, tab or tag, when asked about the look, colours, fonts, dark or light mode, global styles, the UI library or "theme", and when reviewing a change that touches templates or styles.
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

| Need                     | Use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button / button link     | `<button cdtButton>` (primary), `cdtButton="secondary"`, `"outline-primary"`, `"outline-secondary"`, `"outline-danger"`, `"cta"` (big call to action), `"chip"` (small pill); `size="sm" \| "lg"`. Works on `<a>` too. Switch looks with `[cdtButton]="on ? 'primary' : 'outline-primary'"` instead of `ngClass`.                                                                                                                                                                                                             |
| Text field / text area   | `<input cdtInput>`, `<textarea cdtInput>`, `<select cdtInput>`; size as the value: `cdtInput="sm" \| "lg"`. Native element, so reactive forms, `formControlName`, `data-testid` and validation work as usual.                                                                                                                                                                                                                                                                                                                 |
| Form field wrapper       | `<cdt-field label="Email" for="email" required>` around a field (with that `id`) and its `<cdt-input-errors>`: a visible label, an asterisk and "(required)" for screen readers. `hideLabel` keeps the label for screen readers only, where the context already says what the field is.                                                                                                                                                                                                                                       |
| Checkbox with label      | `<cdt-checkbox [(checked)]="on">Label</cdt-checkbox>`, or `[checked]` + `(checkedChange)`. Extra projected elements (a count badge) sit in the row. A disabled `<fieldset>` disables it.                                                                                                                                                                                                                                                                                                                                      |
| On/off setting           | `<cdt-switch [(checked)]="dark" onIcon="moon" offIcon="sun">Dark mode</cdt-switch>`: a full-width row, label on the left, a pill track on the right whose knob slides over and glows primary when on. For a setting that applies at once (Settings → Appearance); a choice submitted with a form or picked from a list stays a `<cdt-checkbox>`. The icons are optional and show the state by shape too.                                                                                                                      |
| Tooltip                  | `<cdt-tooltip text="Tank: PLD, WAR" [focusable]="true">…</cdt-tooltip>`: a short note in a small window above its content, on hover or keyboard focus (WCAG 1.4.13: it stays while hovered, Escape hides it), given to screen readers as the content's description. `focusable` makes non-interactive content a tab stop; `[tabIndex]` lets a parent keep one tab stop for a row of them (the Party Finder's open slots move with the arrow keys). Only for extra detail: what the content means must be readable without it. |
| Window                   | `<cdt-panel heading="Title">…</cdt-panel>` (title bar), or `label="…"` for an accessible name without a visible title.                                                                                                                                                                                                                                                                                                                                                                                                        |
| Card                     | `<cdt-card>…<div cdtCardFooter>…</div></cdt-card>`; `[flush]="true"` drops the body padding; `[stretch]="true"` makes it as tall as its grid cell, its content in a column (cards side by side end level; `margin-top: auto` keeps content to the bottom).                                                                                                                                                                                                                                                                    |
| Page banner              | `<cdt-banner>…</cdt-banner>` (the full-width title strip); `narrow` for the reading width. The page styles its own headings inside.                                                                                                                                                                                                                                                                                                                                                                                           |
| Modal window             | `<cdt-dialog heading="Duty Found" (dismissed)="close()">…</cdt-dialog>`: dimmed backdrop, centred window, title bar; backdrop click or Escape emits `dismissed`. Move focus into the content when it opens (otherwise the window takes it); Tab stays inside, and closing gives the focus back to where it was, unless the parent moves it first. `[wide]="true"` for pictures.                                                                                                                                               |
| Square crop of a picture | `<cdt-image-cropper [src]="url" [(crop)]="crop" (loaded)="image = $event" (failed)="…" />`: drag the square or its corner, a size slider, arrow keys and + / − on the square; a circle shows a round avatar. `crop` is in the picture's own pixels; `focus()` puts the keyboard on the square.                                                                                                                                                                                                                                |
| Menu                     | `<cdt-menu label="Account"><span cdtMenuTrigger>…</span><a cdtMenuItem routerLink="…">…</a><button cdtMenuItem [divided]="true">…</button></cdt-menu>`: a button opening a list of links and actions, with the keyboard handled (arrows, Home/End, Escape) and closing on a choice, an outside click or tabbing away. `divided` sets an item apart.                                                                                                                                                                           |
| Roulette result          | `<cdt-duty-card [type] [name] [detail] [mode] [image] [unknown] [jobName] [jobIcon] compact>`: the "Duty Found" look (banner, type, name, details, party settings). Content with `cdtDutyCardLinks` goes under the details, other content in the party settings box; `compact` for lists such as the feeds.                                                                                                                                                                                                                   |
| Author and date          | `<cdt-byline [image] [name] [date] [link]>` (avatar, name, date; `avatarTestId` for a test id on the avatar link).                                                                                                                                                                                                                                                                                                                                                                                                            |
| Discord and Lodestone    | `<cdt-community-links>` (plain links) or `look="buttons"`: the free company's Discord server and Lodestone page, opening in a new tab. The addresses are constants in its `.ts`.                                                                                                                                                                                                                                                                                                                                              |
| Post or comment text     | `<cdt-rich-text [text]>` from `@everise/media` (`[compact]="true"` for comments): Markdown, and YouTube links alone on a line as click-to-play videos.                                                                                                                                                                                                                                                                                                                                                                        |
| Post or comment media    | `<cdt-media-grid [items]>` from `@everise/media` (`[compact]="true"` for comments): images and GIFs in an X-style grid opening in a full-screen viewer, GIFs playing with a pause button, videos click-to-play. To pick them, `<cdt-attachments-editor [(items)] [max]>` (4 for posts, 1 for comments): images, GIFs (upload, link, GIPHY) and videos.                                                                                                                                                                        |
| Tab bar                  | `<ul cdtTabs><li>…</li></ul>`: `<a cdtTab routerLink routerLinkActive="active">` for a tab that changes the page, `<button type="button" cdtTab [active]="…">` for one that changes the view, `<span cdtTab [active]="true">` for a current filter. Never an `<a>` without `href`: it can't be reached by the keyboard.                                                                                                                                                                                                       |
| Tag pill                 | `<button type="button" cdtTag>` to pick a tag, `<a cdtTag routerLink>` to go somewhere, `<li cdtTag="outline">` to show one.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Icon                     | `<cdt-icon name="trash" />`: the only icons on the site, line drawings (heart, play, pause filled) as inline SVG in the text colour, 1em square, `aria-hidden`. The names are `ICON_NAMES` in its `.ts`; a new icon is drawn there in the same 24 × 24 line style. **No icon font** (some phones don't load them) and no icons as images. In the navbar every page link has an icon, account links none.                                                                                                                      |
| Profile picture          | `<cdt-avatar [src]="user.image" [size]="36" />`: round, on the avatar disc, the default picture when `src` is empty; `alt` only when it is the only thing saying who it is; `frame` = `none`, `soft`, `line`, `strong` or `highlight` (primary ring and glow). Never style a round `<img>` yourself.                                                                                                                                                                                                                          |
| Status / warning / error | `<cdt-message>{{ status() }}</cdt-message>`, `tone="warning"`, `tone="error"`: a live region that stays on the page while empty (`role="status"`, or `role="alert"` for an error). Never a hand-styled `<p class="status">`.                                                                                                                                                                                                                                                                                                  |
| Pagination               | `<cdt-pager>`: a named navigation of page buttons, the current one `aria-current`.                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Building blocks on native elements (`cdtButton`, `cdtInput`, `cdtTabs`/`cdtTab`, `cdtTag`, `cdtMenuItem`) are **components with attribute selectors**, as Angular Material does (`button[mat-button]`). They keep native semantics, forms and accessibility, and, unlike directives, they can carry their own styles. The UI library's ESLint config allows attribute selectors for exactly those files.

**A new kind of control** (a radio group, a toggle…) goes into the UI library as its own folder with `.ts`, `.scss` and `.spec.ts`, exported from `src/index.ts`, and only then is used from a feature. Don't build it inside a feature library, and don't add its look to the theme.

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
     - `--font-reading` (article text);
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
4. **Breakpoints by name.** A layout changes only at the theme's widths: `@use '<relative path>/libs/ui/components/src/theme/breakpoints' as bp;` then `@include bp.up(sm | md | lg | xl) { … }` (576, 768, 992, 1200 px). Never `@media (min-width: 900px)`.
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

Run from the repo root. All seven should print nothing (the first one prints the `theme-color` meta, a marked exception); anything printed needs a token, a building block, a component stylesheet, or a marked exception:

```
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|gradient\(|font-family:\s*'" apps libs --include=*.css --include=*.scss --include=*.html --include=*.ts | grep -v "libs/ui/components/src/theme/" | grep -v node_modules | grep -vE 'href="#|routerLink="#'
grep -rn -- "--palette-" apps libs | grep -v "libs/ui/components/src/theme/"
grep -rnE 'type="checkbox"|class="([^"]* )?(btn|form-control|xiv-(panel|title-bar|chip|cta|check|dialog|backdrop)|nav-pills|tag-default|tag-pill|card|card-footer|banner|form-group|error-messages)( [^"]*)?"' libs apps --include=*.html | grep -vE "libs/ui/components/|libs/core/forms/"
grep -vE '^\s*(//.*)?$' apps/everise/src/styles.scss | grep -v "@use '../../../libs/ui/components/src/theme'"
grep -rn "ng-deep\|ViewEncapsulation.None" apps libs --include=*.ts --include=*.scss | grep -v node_modules
grep -rnE "@media \((min|max)-width" apps libs --include=*.scss | grep -v "theme/_breakpoints.scss"
grep -rnE "<img [^>]*class=\"(avatar|portrait|user-img)" apps libs --include=*.html
```

Then check the page in **both modes** (Settings → Dark Mode on and off; or set `localStorage.darkMode` to `"false"` for light) on a desktop and a 390 px wide viewport, with the keyboard alone, and with [axe](https://github.com/dequelabs/axe-core) (README → Accessibility). Component styles must stay under the 6 kB `anyComponentStyle` budget.
