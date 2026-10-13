# notifications-data-access

The signed-in member's notifications, for the header's bell: `NotificationsService` (`GET /api/notifications/unseen`, `POST /api/notifications/seen`, `/read`, `/:id/read`) and `NotificationsStore` (app-wide): the badge's count, asked for every minute while the tab is shown and when it's shown again, and the list, read when the member opens it (which makes them all seen). `notification-text.ts` words a notification as Facebook does ("Alisaie, Alphinaud and 3 others liked your post …"), in parts the header links to the members' profiles and the post.
