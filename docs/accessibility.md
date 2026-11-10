---
title: Accessibility
nav_order: 5
---

# Accessibility

The site aims at **WCAG 2.2 level AA**, in both colour modes. The full rules and checks are in the repository's `accessibility` skill.

- **Structure:**
  - a "Skip to main content" link first;
  - one `<main>` per page and a named navigation landmark;
  - one `<h1>` per page, with headings in order;
  - every page has its own title ("Sign in · Everise").
- **Keyboard:**
  - everything works without a mouse;
  - links are real links and actions are real buttons;
  - after a page change, focus moves to the new content;
  - dialogs keep focus inside and return it when they close;
  - the account menu and the picture cropper have their own keys.
- **Forms:** visible labels on every field, required fields marked, `autocomplete` on the sign-in and sign-up fields, `aria-invalid` on invalid fields, and error messages that screen readers announce.
- **Screen readers:**
  - icons are hidden from them;
  - icon-only buttons have names ("Favorite, 7 favorites", with `aria-pressed`);
  - the current tab or page is marked `aria-current`;
  - status messages (loading, the roulette's result, form errors, a new post in the live feed) are live regions.
- **Colour and contrast:** text at least 4.5:1; field outlines and the focus ring at least 3:1. Checked for every role token in both modes.
- **Motion:** animations respect `prefers-reduced-motion`. The roulette also has an **Idle animations** switch.
- **Zoom and small screens:** pages reflow down to 320 px wide without sideways scrolling, and dialogs scroll inside when the screen is short.

## Checking a change

1. Run [axe](https://github.com/dequelabs/axe-core) on the pages you touched, signed in and out, in both modes. Use the browser extension or the `accessibility` skill's `scripts/axe-check.mjs`.
2. Tab through those pages with the keyboard.
3. Look at them at 320 px wide.

The `ui-check` skill (its `scripts/ui-check.mjs`) does all three against a local backend: screenshots, reflow and axe.
