import { Schemas } from './schemas';

// A member's notifications (GET /api/notifications): likes (favorites) and
// comments on their posts, grouped per post, and new followers.
export type NotificationsResponse = Schemas['NotificationsResponse'];
export type Notification = NotificationsResponse['notifications'][number];
export type NotificationType = Notification['type'];
export type NotificationActor = Notification['actors'][number];
export type UnseenNotificationsResponse = Schemas['UnseenNotificationsResponse'];
