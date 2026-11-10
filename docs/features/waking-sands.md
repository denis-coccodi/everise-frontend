---
title: The Waking Sands
parent: Features
nav_order: 7
---

# The Waking Sands

Backend: [The Waking Sands](/docs/backend/features/waking-sands.html).

`/waking-sands` shows the room to signed-in members only. Guests get a welcome window with the spoiler warning, and the sign-in and sign-up buttons.

## Libraries

- **`waking-sands/feature-waking-sands`:**
  - **`sands-room`:** the page, with the spoiler warning and the fan-work note under the room.
  - **`sands-cast`:** who's in the room, each with **Send out**, then everyone else with **Invite**. A search box finds characters by name or title. The room holds three at most.
  - **`sands-conversation`:** the log (`role="log"`) and the message form. Enter sends, and Shift+Enter starts a new line.
- **`waking-sands/data-access`:**
  - `WakingSandsService` is the room's API.
  - `WakingSandsStore` holds the characters, who's in, the day's lines, who's writing, and the member's draft.

## Live

- **What arrives:** the store subscribes to `LiveUpdates` for `sands-line`, `sands-presence` and `sands-writing` events, so every member sees the same room as it happens.
- **Reconnecting:** whenever the socket connects or reconnects, the store reads the room again, so nothing is missed.
- **Answers:** a member's line is posted with `POST /api/waking-sands/room/lines`. The characters' answers arrive only as live events.

## Profiles

Each character's name links to their profile, `/profile/character:<id>`, with a note that they're an AI-voiced character. Admins edit the characters in [Admin](admin.md).
