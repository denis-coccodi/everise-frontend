---
name: ui-check
description: Checks how pages of the built Everise site look and behave in a real browser, against a local backend with real data - screenshots in dark and light mode at phone to desktop widths, a spacing pass at every breakpoint (edges, gaps, overflow, nothing past the footer), sideways scrolling at 320 px, axe's WCAG 2.2 AA violations, and keyboard reach - with one script. Use after changing a page, template or style and before opening its pull request, when asked to look at or screenshot a page, or when something looks wrong at some width or in one mode.
---

# Check a page in the browser

Unit tests don't see the page. Before a pull request that changes what a page shows, build the site, give it a local backend, and look at it.

## 1. A backend with data

In the backend repo (`../everise-backend`), start a local Worker. With its `.dev.vars` (the Discord bot token included) it reads real data:

```
npx wrangler dev --test-scheduled --port 8788 --persist-to <scratchpad>/state
```

Wait until `curl -s http://localhost:8788/api/tags` answers. Data that comes from scheduled jobs (the Weekly and Hunts tabs) needs a few runs first: `curl "http://localhost:8788/__scheduled?cron=*/2+*+*+*+*"` (the backend's `smoke-test` skill).

## 2. The built site

```
npx nx run everise:build --configuration=production
npx serve -s dist/apps/everise -l 4300
```

`serve` picks another port when 4300 is taken and says which ("Accepting connections at …"); use that one. A production build calls the relative `/api`, which the script sends to the backend.

## 3. The check

Run [scripts/ui-check.mjs](scripts/ui-check.mjs) from the repo root (`npm i --no-save axe-core` once for axe):

```
MSYS_NO_PATHCONV=1 API=http://localhost:8788 OUT=<scratchpad>/shots node .claude/skills/ui-check/scripts/ui-check.mjs http://localhost:4300 / '/?view=hunts'
```

- `MSYS_NO_PATHCONV=1` stops Git Bash from turning `/` and `/?view=…` into Windows paths.
- It takes a screenshot of each page in each mode (dark, light) at each width (320, 390, 768, 1280), reports any page that scrolls sideways, and runs axe at the widest width in both modes. Exit code 1 on any problem.
- Look at the screenshots (Read the PNGs): the layout at each width, both modes, pictures loaded. Lazy pictures below the fold can still be empty in a full-page screenshot; scroll or wait longer (`WAIT_MS`) before calling one broken.
- Signed-in pages: the `accessibility` skill's axe check signs in (`EVERISE_EMAIL`, `EVERISE_PASSWORD`).

### Spacing at every breakpoint

Before opening a pull request that adds or changes anything on screen, take the screenshots at all five widths (`WIDTHS=320,390,768,1024,1280`), **signed in and signed out** (members see more: buttons, the Discord box, the message form), and look at the spacing in each one, not only whether the page renders:

- **Edges line up.** Stacked boxes share the same left and right edges. A margin meant as the gap between side-by-side columns (`margin-left: 10px` beside a feed) indents the box once the columns stack on phones.
- **Stacked boxes have a gap.** When columns stack below `md` or `lg`, the second column needs the same space above it as between the panels of the first; nothing touches.
- **Nothing spills or is cut off.** Labels fit their buttons in narrow columns (768 px makes a `col-md-3` about 190 px wide), long names wrap, and nothing overflows its box.
- **The page ends at the footer.** No empty space below it on any width. Absolutely positioned content (a visually hidden label) inside a scroll box whose ancestors aren't positioned escapes its clipping and stretches the page.
- **Columns balance** where they sit side by side: no column far taller than its neighbour.

Fix what's off at the breakpoint where it goes wrong (the `mobile-first` skill), and list in the pull request which widths and states were looked at.

## 4. The keyboard

Tab through the changed part with Playwright (`page.keyboard.press('Tab')`, read `document.activeElement`) or by hand: everything reachable in order, visibly focused, working with Enter and Space.

## 5. Clean up

Stop `serve` and `wrangler dev` (background tasks). On Windows, wrangler can outlive its task: the frontend `smoke-test` skill has the PowerShell line that stops it. Delete the screenshots folder if it's in the repo.

Say in the pull request what was checked: pages, modes, widths, axe, keyboard.
