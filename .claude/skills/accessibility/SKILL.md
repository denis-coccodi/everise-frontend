---
name: accessibility
description: The Everise frontend must stay WCAG 2.2 AA compliant - the rules every template, style and component follows (landmarks, headings, page titles, keyboard, focus, labels, names, live regions, contrast, motion, reflow) and how to check a change with axe, the keyboard and a 320 px viewport. Use before writing or changing any template, component, style, route or UI library building block, when adding a page, form, dialog, control or animation, and when reviewing a frontend change. Also use when asked about accessibility, WCAG, a11y, screen readers or keyboard support.
---

# Accessibility: WCAG 2.2 AA, always

Every frontend change keeps the site **WCAG 2.2 level AA** compliant, in **both colour modes**, signed in and out. Accessibility is part of "done", like the tests: a change that breaks one of the rules below isn't finished. Read the `theme` skill too; it has the visual rules (role tokens, building blocks) these build on.

## Rules

**Structure**

- One `<h1>` per page; headings go down one level at a time (no `h2` → `h4`). A heading that would only repeat what the layout shows can be `.visually-hidden`, but it's still there.
- Page content lives in the app shell's `<main id="main">`; the "Skip to main content" link and the focus move after navigation (`app.component.ts`) depend on it. Don't add another `<main>`.
- Every route has a `title` (`PageTitleStrategy` adds " · Everise"); a page whose title comes from data (an article) sets it with `Title` once loaded.
- Navigation groups are `<nav aria-label="…">`; complementary content is `<aside aria-labelledby="…">`.

**Keyboard and focus**

- A link (`<a>` with `href` or `routerLink`) goes somewhere; a `<button type="button">` does something. Never `(click)` on an `<a>` without `href`, a `<div>`, `<span>`, `<li>` or `<i>`: the keyboard can't reach them.
- Everything works with Tab, Shift+Tab, Enter and Space alone, in a logical order. Custom widgets follow the ARIA practices pattern for their role (see `<cdt-menu>`, `<cdt-image-cropper>`).
- Focus is always visible (`--color-focus`; never `outline: none` without a replacement) and never hidden behind sticky content.
- Dialogs use `<cdt-dialog>`: Tab stays inside, Escape closes, focus returns to the opener (or move it yourself when the opener is gone or disabled, as the roulette does).
- When content replaces what had the focus, put the focus somewhere sensible.

**Names, labels and state**

- Every form field has a label: `<cdt-field label="…" for="id">` (`hideLabel` only when the context already says it). Placeholders are hints, not labels. Required fields use `required`; sign-in and profile fields have `autocomplete`.
- Invalid fields get `aria-invalid` (`cdtInput` does it inside a form), and errors are announced (`<cdt-input-errors>`, `<cdt-list-errors>`).
- Icon fonts and decorative images are `aria-hidden="true"` / `alt=""`; an icon-only button has an `aria-label` that also says its value ("Favorite, 7 favorites"). Toggle buttons use `aria-pressed`; the current tab, page or link uses `aria-current`.
- Images that carry meaning have an `alt` saying what they show; an avatar next to the person's name is decorative.
- Don't repeat the same link twice in a row (the byline's avatar link is hidden because the name links to the same place).
- Changes that happen without the person moving (a status, a result, a new post) go to a live region: `aria-live="polite"`, or `role="alert"` for errors. The region exists before the message appears.

**Colour, motion and layout**

- Text is at least 4.5:1 against its background (3:1 at 24 px, or 18.66 px bold); control outlines, focus rings and meaningful icons at least 3:1. Use role tokens (already checked in both modes); a new token or palette value must be measured in both modes before use.
- Colour is never the only way something is shown (add text, an icon or a shape).
- Animations respect `prefers-reduced-motion`. Anything that moves, blinks or scrolls on its own for more than 5 seconds has a pause control (the roulette's "Pause animations").
- Pages reflow at 320 CSS px wide (400% zoom) without horizontal scrolling; dialogs scroll inside on short screens. Text can be resized and spaced without clipping: no fixed heights on text containers.
- Pointer targets are at least 24 × 24 px, or spaced so a 24 px circle around them touches no other target.

**Timing and input**

- No time limits; an animation like the "Duty Found" timer is decorative only.
- Drag interactions have a non-drag alternative (the cropper has keys and a slider).

## Building blocks first

The UI library already does most of this; use it rather than rebuilding: `cdtButton`, `cdtInput`, `<cdt-field>`, `<cdt-checkbox>`, `<cdt-dialog>`, `<cdt-menu>`, `cdtTabs`/`cdtTab` (links for pages, buttons for views), `cdtTag` (a button to pick), `<cdt-pager>`, `<cdt-byline>`, `.visually-hidden`. A new kind of control goes into the UI library with its keyboard support and a spec that checks its roles, names and keys.

## Checking a change

All four, before pushing a change that touches the UI:

1. **Specs**: building blocks and pages assert their roles, names, `aria-*` states and keyboard behaviour (see the dialog, tabs, pager and field specs).
2. **axe** on every page you touched, guest and signed in, dark and light. With the app running (`npm start` and a local backend):
   ```
   npm i --no-save axe-core
   node .claude/skills/accessibility/axe-check.mjs http://localhost:4200 /home /roulette /login
   ```
   It signs in when `EVERISE_EMAIL` and `EVERISE_PASSWORD` are set, checks each page in both modes and prints the violations (exit code 1 if any). It must report none. axe can't measure text on gradients ("incomplete"); check those by eye against the token contrast, or sample the pixels.
3. **Keyboard**: tab through the page; everything is reachable, in order, visibly focused, and works with Enter/Space; dialogs and menus behave as above.
4. **Small screen**: at 320 px wide nothing scrolls sideways; at 390 px the page still reads well.

Say in the PR what was checked and how.
