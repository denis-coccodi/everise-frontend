---
title: Admin
parent: Features
nav_order: 10
---

# Admin

Backend: [Admin](/docs/backend/features/admin.html).

Admins are whoever the backend's `ADMIN_EMAILS` names. The user's `role` is `admin` for them, and Settings (`settings/feature-settings`) then shows two more windows.

## Waking Sands characters (`admin-characters`)

- **Tabs:** one per character.
- **Fields:** the picture (with the same crop dialog as a profile picture), title, profile bio and personality.
- **Limits:** the backend sends each field's length limit with the list, so the form never copies them.
- **Reset:** an empty field goes back to the shipped one, and **Restore the original personality** does the same for the personality.

## Members and roles (`admin-members`)

- **Finding members:** search by username or email, paged. Each member shows how they sign in and whether their email is confirmed.
- **Roles:** make a member a **staging tester** or a normal member again. The backend syncs staging access.
- **When staging access isn't connected:** on a backend without the Cloudflare settings (staging, local), the window says so. Manage roles from production.
- **Sync staging access:** writes the testers to Cloudflare Access again.
- **Deleting a member:** removes them for good, with everything they posted.
