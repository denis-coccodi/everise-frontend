---
title: Posts, comments and media
parent: Features
nav_order: 2
---

# Posts, comments and media

Backend: [Posts, comments and media](/docs/backend/features/posts-and-media.html).

## The home page (`home/feature-home`)

- **Tabs:** **Weekly** and **Hunts** come first ([Discord, Weekly and Hunts](discord.md)), then **Global Feed** and, for members, **Your Feed**. Each tab has its own address (`/`, `/?view=hunts`, `/?view=global`, `/?view=yours`), and posts load only once a feed is opened.
- **Live posts:** a new post is pushed over `LiveUpdates` ([live updates](notifications-and-live.md)) and inserted at the top of the global feed, or of a tag's list. It gets a brief highlight and an announcement for screen readers.
- **Sidebar:** popular tags, and the Discord widget for members.

## Lists and posts

- **`articles/feature-articles-list`** (a widget): the feed list, on Home and on profiles. It holds the post cards, paging, favourite buttons and **Share to Discord** (`share-post-discord`).
- **`articles/feature-article`** (`/article/<id>`): a post's page, with its comments, and edit and delete for its author.
- **`articles/feature-article-edit`** (`/editor`, `/editor/<id>`): writing and editing posts, with **Also share in the Everise Discord** where the backend has the webhook.
- **`articles/data-access`:** the stores and the API service. Posts carrying a `roulette` or `partyFinder` card are drawn with the roulette's "Duty Found" card or the Party Finder listing card (`party-finder/feature-pf-listing`).

## Media (`media/*`)

- **Attachments:** up to 4 per post, one per comment, shown in a grid (`media/feature-media`, a widget). GIFs pause on request.
- **Uploads:** pictures are shrunk in the browser to the backend's limits before uploading. A GIF must already fit, since shrinking would lose its animation.
- **GIF search:** a picker over `GET /api/gifs`, shown only when `GET /api/gifs/available` says yes. It carries GIPHY's "Powered by GIPHY" mark.
- **YouTube:** videos are attachments too, shown with a YouTube embed (`youtube-embed`).
