---
name: mobile-first
description: Everise's styles are mobile first - a rule outside any breakpoint is the phone's, and wider screens add to it or change it from a width up with the theme's bp.up(sm | md | lg | xl), never down (no max-width, no "below a width" query, no down() mixin; scripts/check-mobile-first.mjs fails CI otherwise). How to lay out a component that way, how to hide or show something per width, the widths to check (320, 390, 768, 1024, 1280 px), and the patterns to avoid. Use before writing or changing any CSS/SCSS, inline style, layout, grid, flex, width, media query or breakpoint in this repo, when adding a page or component, when something looks wrong on a phone or on a wide screen, and when reviewing a change that touches styles.
---

# Mobile first

Every style on the site is written for a phone first. The phone's layout is the base: the rules outside any breakpoint. Wider screens then **add to it or change it, from a width up**, with the theme's breakpoints (`libs/ui/components/src/theme/_breakpoints.scss`). Nothing is written for a wide screen and then squeezed back for phones.

```scss
@use '<relative path>/libs/ui/components/src/theme/breakpoints' as bp;

// The phone: one column.
.fields {
  display: grid;
  gap: 0 1rem;
  grid-template-columns: minmax(0, 1fr);
}

// From tablets up: two; from laptops: four.
@include bp.up(sm) {
  .fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@include bp.up(lg) {
  .fields {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
```

The widths: `sm` 576 px (large phones in landscape), `md` 768 px (tablets: the navbar's links show), `lg` 992 px (laptops: side panels), `xl` 1200 px (the widest container). Never a number of a component's own.

## The rules

1. **The base is the phone.** Write the component as it looks at 320 px wide, with no media query at all: one column, full width, stacked, touch targets of at least 44 px.
2. **Wider screens go in `@include bp.up(…)`**, in order (`sm`, `md`, `lg`, `xl`), after the base rules they change. Only what changes goes there.
3. **Never narrow down.** No `@media (max-width: …)`, no `max-device-width`, no range query looking down (`(width < 768px)`), no `not all and (min-width: …)`, and no `down()` mixin. `node scripts/check-mobile-first.mjs` (in CI) fails on any of them.
4. **Something only the phone has** (the Menu button, the panel's dividers) is in the base, and `bp.up(…)` removes it. Reset every part a shorthand set, not only the shorthand's idea of "none": `border-top: 0 none transparent`, `display: none`. A bare `border-top: none` has once left a line on wide screens.
5. **Something only wider screens have** (a side panel, the bell before the account) starts hidden (`display: none`) and `bp.up(…)` shows it, or it lives in the markup twice with the navbar's `wide-only` / `narrow-only` classes (each with its own ids).
6. **No widths that only fit a desktop.** A fixed `width` or `min-width` above about 280 px belongs inside a `bp.up(…)`; at the base use `max-width` with `width: 100%`, `minmax(0, 1fr)`, and `overflow-wrap: anywhere` for long names.
7. **Queries that aren't about width are fine anywhere:** `prefers-reduced-motion`, `prefers-color-scheme` (the theme's tokens already handle colour modes), `hover`, `print`.

## Checking a change

- `node scripts/check-mobile-first.mjs` must print "Mobile first: …" and exit 0 (it's part of CLAUDE.md's pre-push command and the CI `test` job).
- Look at the page at **320 px** and **390 px** (phones), **768 px** (the `md` switch), **1024 px** and **1280 px**. Nothing scrolls sideways at 320 px (WCAG 1.4.10, see the `accessibility` skill), and each width shows what its breakpoint says.
- Headless Chromium through Playwright (a dev dependency) takes these quickly: serve `dist/apps/everise` (`npx serve -s dist/apps/everise`), stub `/api/**` with `page.route`, and screenshot each width.

## Patterns to avoid

| Instead of                                                               | Write                                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `@media (max-width: 767px) { .x { display: none; } }` (hidden on phones) | `.x { display: none; }` at the base, `bp.up(md) { .x { display: block; } }`               |
| `.grid { grid-template-columns: repeat(4, 1fr); }` then fewer for phones | one column at the base, more in `bp.up(sm)` / `bp.up(lg)`                                 |
| `.panel { width: 380px; }`                                               | `.panel { left: 8px; right: 8px; }` at the base, `bp.up(md) { .panel { width: 380px; } }` |
| `@media (min-width: 900px)`                                              | `@include bp.up(lg)` (the theme's widths only)                                            |
| a `down()` mixin, `not all and (min-width: …)`                           | the phone's rule at the base, the change in `up()`                                        |
