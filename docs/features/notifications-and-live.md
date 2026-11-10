---
title: Notifications and live updates
parent: Features
nav_order: 8
---

# Notifications and live updates

Backend: [Notifications and live updates](/docs/backend/features/notifications-and-live.html).

## Notifications

- **`notifications/data-access`:** `NotificationsService` and `NotificationsStore`, which is app-wide.
  - The badge's count (`GET /api/notifications/unseen`) is asked for every minute while the tab is shown, and again when it's shown again.
  - The list is read when the member opens the bell, which marks them all seen.
- **`notification-text.ts`:** words a notification as Facebook does ("Alisaie, Alphinaud and 3 others liked your post …"), in parts the header links to the members' profiles and the post.
- **The bell** is in the header (`apps/everise/src/app/layout/notifications`).
  - The site's own notifications (an ended Party Finder listing, a new role) show the free company's crest.
  - Opening a notification marks it read; **Mark all as read** marks them all.

## Live updates (`core/http-client`)

`LiveUpdates` is one WebSocket shared by every subscriber:

- **Address:** derived from the API's. Deployed, `/api` gives `wss://<site>/api/live` (same origin through the Worker). Locally, `http://localhost:8080/api` gives `ws://localhost:8080/api/live`.
- **Open and close:** it opens with the first subscriber and closes after the last.
- **Keep-alive:** it sends `ping` now and then, because Cloudflare closes sockets silent for about 100 seconds. The backend answers `pong` without waking up, and messages that aren't events are skipped.
- **Reconnecting:** after 1 second, then doubling, at most 30 seconds apart.
- **Subscribers:**
  - the home page, for `article-created`;
  - the Waking Sands store, for the room's events.
