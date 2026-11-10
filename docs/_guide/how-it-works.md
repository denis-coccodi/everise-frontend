---
title: How it works
nav_order: 11
description: What everise.dev does behind each page, in plain words.
---

# How it works

Everise is built from scratch for the free company. It doesn't just pass other sites' data along: it reads raw community data, corrects it, works things out from it, and adds tools of its own. Here's what happens behind each page, in plain words.

## Party Finder

![Party Finder listings](/docs/frontend/screenshots/guide/party-finder.png){: .small}

- **The whole game, not just your world:** the site reads every listing in the game, every minute while someone's looking. It then works out which ones you can actually join from your world, including world-only Hunt and FATE parties.
- **Ghost listings removed:** nobody announces when a party fills up or is taken down, so the site drops any listing nobody has seen for five minutes. Without this, the list showed about three times as many parties as the game.
- **Names put right:** the community data mislabels treasure maps, deep dungeons and roulettes as other duties. The site recognises them and shows the right name and icon.
- **The game's own order and look:** tiles are sorted and laid out the way the game does it, with job icons for each open slot.
- **Sharing that follows up:** share a party as a post or to the Discord. The site checks every couple of minutes and tells you, and the Discord, when it's gone.

## Market History

![A price history across worlds](/docs/frontend/screenshots/guide/market-history.png){: .small}

- **A price history nobody else draws:** for any item, the site builds a day-by-day history for every world of your region, back to 2022. It reads one world at a time, so even the busiest items load.
- **Prices you can trust:** each day shows the median sale price, so a few silly sales (often gil moved between characters) don't distort the chart.
- **Kept and topped up:** histories are stored and refreshed only where something is missing, so charts come back fast.

## Duty Roulette

![The Duty Roulette's reels](/docs/frontend/screenshots/roulette.png){: .small}

- **Every result is real:** the roulette knows the game's duty list: which duties belong to which roulettes, and which party settings (minimum item level, unsynced…) each one allows. Every spin is something you could actually queue for.
- **Checked twice:** when you post a result, the site checks it again, so the feeds only ever show genuine results.

## The Waking Sands

![Characters answering a member](/docs/frontend/screenshots/guide/waking-sands-room.png){: .small}

- **A room, not a chatbot:** several characters share one room with every member, live. After each line, the site decides who should answer next, so characters respond to you and to each other the way a group would.
- **Characters with their own voice:** each character is played from a written personality, which admins can tune, under ground rules no character can break.
- **Shared fairly:** a daily allowance, per member and for the whole site, keeps the room open for everyone.

## Fight Planner

![A planned pull, next to how it was played](/docs/frontend/screenshots/guide/fight-planner.png){: .small}

- **A whole party's plan, worked out:** from one FFLogs report, the planner rebuilds every hit each player took. It then plans the party's mitigations, shields and heals around each player's cooldowns, MP and opener.
- **Several plans, the best kept:** it plans each pull several ways and keeps the one where the fewest people die. If a death can't be prevented, it plans the raise.
- **Even for wipes:** a pull that wiped is completed with the mechanics the party never reached, from the fight's timeline.

## Weekly, Hunts, Events and Venues

![The Weekly tab's resets](/docs/frontend/screenshots/guide/weekly.png){: .small}

- **Resets worked out for you:** the site calculates the next daily, Grand Company and weekly resets, and shows them in your time zone.
- **Only what matters this week:** from the Discord channels the free company follows, it keeps just this week's Fashion Report and Island Sanctuary plan. It sorts hunt trains by data centre, from the world each one names.
- **Events matched to venues:** the site works out which venue an event is held at, from its address or its organisers, and lists the week's events on each venue's page.
- **Safe to browse:** adult events are never shown, and only approved, safe-for-work venues are listed.

## Feeds, sharing and notifications

![The global feed](/docs/frontend/screenshots/feed.png){: .small}

- **Live:** new posts appear for everyone the moment they're posted.
- **Discord, both ways:** the free company's announcements come in on the Weekly and Hunts tabs. Members' posts, parties, events and venues go out to the Discord only when they choose.
- **Notifications that make sense:** likes and comments are grouped per post ("Alisaie and 2 others liked your post"), and you're never told about your own actions.

## How changes reach the site

1. **Staging first:** every change is tried on a separate copy of the site, the [staging site](/guide/testers-and-admins/), where invited testers can see it.
2. **Then everise.dev:** when it's ready, it's released here. Bigger features are switched on only once they're finished.
{: .steps}

## For everyone

The site looks and feels like FINAL FANTASY XIV, in dark mode or a "Final Fantasy white" light mode. It's built to work with the keyboard, with screen readers, zoomed in, and on a phone.

## Thanks

Everise builds on community projects:

- **xivpf** for Party Finder listings;
- **Universalis** for market sales;
- **Partake** for events, and **FFXIV Venues** for venues;
- **XIVAPI** for the game's data;
- **FFLogs** for fight logs, and **cactbot** for fight timelines;
- the Discord channels of Kaiyoko, Overseas Casuals and the hunt groups.

FINAL FANTASY XIV © SQUARE ENIX CO., LTD.; game images are used under Square Enix's fan site materials licence. Nothing on the site runs inside the game.
