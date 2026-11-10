---
title: Accounts and sign-in
parent: Features
nav_order: 1
---

# Accounts and sign-in

Backend: [Authentication](/docs/backend/authentication.html).

## Pages (`auth/feature-auth`)

| Address                               | What                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/login`, `/register`                 | Sign in and sign up: email and password, or the Google and Discord buttons (`social-sign-in`)                                |
| `/confirm-email`                      | Opens an email confirmation link and signs in. The page after sign-up says to check your email, with **Send the link again** |
| `/forgot-password`, `/reset-password` | Ask for a reset code, then choose a new password with it                                                                     |
| `/privacy`                            | The privacy policy                                                                                                           |

- **Sign-in state:** the session is the backend's `httpOnly` cookie. The app never sees the token; it loads the user on start (`auth/data-access`).
- **Google and Discord:** the buttons are plain links to `/api/auth/<provider>`. The backend runs the whole OAuth flow, so the site loads none of the providers' scripts. Errors come back as `/login?social=<problem>`, which the page explains.
- **Bot check:** forms that need it show `<cdt-turnstile>` and wait for its pass. The site key is `turnstileSiteKey` in the environment file (Cloudflare's test key locally).
- **Errors:** the backend's own messages are shown (`serverMessage()`), all of them at once.

## Character name and world (`auth/feature-character-fields`)

`<cdt-character-fields>` is shared by sign-up and settings. It asks for both or neither, with the backend's rules (`characterRules()` in `core/forms`). The worlds come from `GET /api/market/regions`, the list the backend accepts.

## Settings (`settings/feature-settings`, `/settings`)

- **Profile picture:** picked in the browser, cropped to a square (`picture-crop-dialog`) and shrunk to the backend's limits before uploading.
- **Profile:** username, character, bio.
- **Appearance:** dark mode, saved with the user so it follows them to every browser. `SettingsStore` applies it, and keeps a `localStorage` copy for the next page load and for guests.
- **Account security:** change email or password (both ask for the current password), the sign-in methods, and **Sign out everywhere**.
- **Admin windows:** see [Admin](admin.md).

## Profiles (`profile/*`, `/profile/<id>`)

A member's picture, bio and posts, with a **Favorites** tab (`/profile/<id>/favorites`). Members follow from it. Waking Sands characters have profiles too (`character:<id>`), which nobody can follow.
