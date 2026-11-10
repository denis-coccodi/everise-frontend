---
name: docs-site
description: How Everise's documentation works - the site guide and the technical pages, all built by GitHub Pages from each repository's docs/ folder and served at everise.dev (/guide/, /docs/frontend/, /docs/backend/) by the frontend Worker, in the site's own FFXIV look. Use before writing or changing anything under docs/ (pages, the guide, layouts, the shared stylesheet), worker/docs.ts, when a change alters something the docs describe, or when asked where documentation goes.
---

# The documentation

All of Everise's documentation is in the two repositories' `docs/` folders, and nowhere else: not Confluence, not the GitHub wiki. The user chose this on 2026-11-10, so the docs change in the same pull requests as the code.

| Address on everise.dev | What                                                                                                                                  | Built from                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `/guide/`              | **Site guide**: what the site offers, how to use it, how it works in general. Plain language, for players, staging testers and admins | this repository's `docs/_guide/` (a Jekyll collection) |
| `/docs/frontend/`      | **Frontend technical docs**                                                                                                           | this repository's `docs/*.md`                          |
| `/docs/backend/`       | **Backend technical docs**                                                                                                            | everise-backend's `docs/`                              |

## Rules

1. **Only what exists.** Describe the site as it is, never as planned. Check claims against the code and the live site, not only the READMEs, which have been wrong (planner auth, Waking Sands spoilers, guests in the Waking Sands). No placeholder pages.
2. **Update with the change.** A pull request that changes what a page describes (an endpoint, a setting, a page, a feature, how something is deployed) updates that page in the same PR:
   - the guide, when players, testers or admins would notice;
   - the technical pages, when developers would.
     A new user-facing feature gets a guide chapter.
3. **Keep the two kinds apart.**
   - **The guide has no code:** no file paths, endpoints, settings or library names. It says what a thing does and how to use it, in the site's own words (labels as the site shows them).
   - **Technical pages** can say anything a developer needs.
4. **Screenshots** for the guide go in `docs/screenshots/guide/`, at 1280 wide, taken with Playwright from the frontend's `node_modules`. They should show what the site can do, so signed-in pages show them in use. **Privacy first:**
   - **Signed out:** take public pages from everise.dev. Show them in use (real parties, events, venues), but blur people's details with a stylesheet added only in the screenshot browser:
     - recruiters' names and party descriptions (`cdt-pf-listing .recruiter, .description`);
     - event and venue banners, hosts, summaries and notices (`.event .cover, .team, .summary`, `.venue .cover, .summary, .notice`).
       Say so under the picture. Prefer ordinary examples (search "cafe") over nightclubs and gambling. Leave out titles that name a character.
   - **No empty pages:** a picture shows the feature in use, never a welcome or sign-in wall. Market History, for example, is a real item's chart from the local copy.
   - **Signed in:** take these from a local copy, never from production with a real account:
     - a throwaway backend (`wrangler dev --persist-to <scratchpad>/state --var ADMIN_EMAILS:<test address>`, on a fresh port);
     - one test account (Avar, "Avar Kriss (Odin)", `@everise.invalid`), signed in by setting its `token` cookie;
     - the dev frontend, with `localhost:8080` routed to that backend.
   - **Waking Sands:** a conversation between the test account and the characters only.
   - **Fight Planner:** a public FFLogs report, with every planner answer rewritten in the route so players' names become "Player 1", "Player 2"…, the title neutral and the report link cleared. Say so under the picture.
   - **Admin windows:** crop out anything that isn't the test account.
   - **Game data first:** a fresh local backend needs the game data refreshed first (`POST /api/duties/refresh` and `/api/planner/catalog/refresh` with `X-Refresh-Key`), or the planner sorts no pulls.

## How it's served

- **GitHub Pages** builds each repository's `docs/` on every push to `main` (Pages source: `main`, `/docs`). It uses plain Jekyll with the `jekyll-relative-links` plugin; there's no theme gem.
- **The Worker** (`worker/docs.ts`, in front of everise.dev and staging) passes the pages through from `denis-coccodi.github.io`:
  - `/guide/x` → `everise-frontend/guide/x`;
  - `/docs/frontend/x` → `everise-frontend/x`;
  - `/docs/backend/x` → `everise-backend/x`.
    It caches each page for 5 minutes and maps GitHub's redirects back to everise.dev. `/guide`, `/docs` and `/docs/*` are in `run_worker_first` in `wrangler.jsonc`.
- **Base URLs:** the frontend site's `baseurl` is `/docs/frontend`, and the backend's is `/docs/backend`. So `relative_url` links already point at the everise.dev address. Guide pages use the raw `page.url` (`/guide/...`), which has no base URL in front.
- **github.io addresses** redirect to everise.dev (a script in `_includes/head.html`). The pages only look right at everise.dev, where the shared stylesheet and the crest are on the same origin.
- **The docs aren't tied to deploys:** a merge to `main` changes them in production and on staging at once, about a minute later. The Worker change that serves them, though, needs a production deploy.

## The look

The docs look like the site, in its dark mode:

- **Stylesheet:** `docs/everise-docs.css` (served at `/docs/frontend/everise-docs.css`; the backend links it too). It copies the site's palette and role values from `libs/ui/components/src/theme/_tokens.scss`, so keep them in step when the theme changes.
- **Fonts:** Cinzel headings, Source Sans Pro text, from Google Fonts.
- **Crest:** `/assets/images/everise-crest.png`, from the site itself.
- **Layouts:**
  - `_layouts/docs.html`: technical pages, with a contents column built from `nav_order`, `parent` and `has_children` front matter;
  - `_layouts/guide.html`: guide pages, with an optional `hero`/`tagline` welcome and previous/next links.
  - Both use `_includes/head.html` and `_includes/topbar.html`.
  - The backend repository has copies of `docs.html`, `head.html` and `topbar.html`: change both repositories together.
- **Guide building blocks** (in Markdown):
  - `{: .steps}` after an ordered list gives numbered crystal steps;
  - `{: .note}` after a `>` quote gives a side note;
  - `<ul class="cards">` with `<a class="card">` items (an image, then a `card-body`) gives picture cards.
- **Written phone first:** the contents column folds into a `<details>` on narrow screens.

## Checking a change

- **Before pushing:** run Prettier on `docs/`. `.prettierignore` leaves out `docs/_layouts`, `docs/_includes` and `docs/_guide`, because Prettier breaks Liquid tags and moves `{: .steps}`/`{: .note}` markers into the wrong block: format those by hand.
- **After the merge:**
  1. wait for the Pages build (`gh api repos/denis-coccodi/<repo>/pages/builds/latest`);
  2. open the changed pages at everise.dev, or staging, at phone and desktop widths;
  3. check the contents column and the links.
- **Local builds:** Ruby isn't installed here. With Docker Desktop running, `docker run --rm -v "$PWD/docs:/srv/jekyll" jekyll/jekyll jekyll build` builds the site locally.

## The wiki

The repository's GitHub wiki is a **read-only copy** of the technical pages (`docs/*.md`, `docs/features/*.md`). The site guide stays out of it: it lives at everise.dev/guide/, and each wiki holds only its own repository's docs.
- **How it's written:** `.github/workflows/wiki.yaml` runs `scripts/wiki-sync.mjs` on every merge to `main` that touches `docs/`, and pushes to `<repo>.wiki.git`.
- **Conversion:** the script strips front matter and `{: .…}` markers, turns links between pages into wiki page names (from each page's `title`) and other everise.dev links into full addresses, points pictures at `raw.githubusercontent.com/.../main/docs/`, and writes `Home`, `_Sidebar` and `_Footer`.
- **Never edit the wiki:** the next sync overwrites it. Change `docs/`.
- **Both repositories:** the script and the workflow are the same in both; change them together.
- **No wiki yet:** a wiki's git repository only exists after its first page is saved on github.com. Until then the workflow skips with a warning.
