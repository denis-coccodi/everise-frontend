---
title: Home
nav_order: 1
---

# Everise frontend

The Angular app of [everise.dev](https://everise.dev), the Everise FC community site, themed after FINAL FANTASY XIV. It talks to the [backend](https://denis-coccodi.github.io/everise-backend/) through `/api`, which the frontend Worker forwards over a service binding.

This site has two parts:

- **[Site guide](guide/)**: what each part of everise.dev does, in plain language, for players, staging testers and admins.
- **Technical reference** (the pages below): how the frontend is built.

Both live in the repository's `docs/` folder and change in the same pull requests as the code.

| Page                                      | What it covers                                                  |
| ----------------------------------------- | --------------------------------------------------------------- |
| [Architecture](architecture.md)           | Nx layers, libraries, state, API types, code rules              |
| [Website structure](website-structure.md) | Every page, its address and who can use it                      |
| [Theme](theme.md)                         | The FFXIV look, role tokens, building blocks, where styles live |
| [Accessibility](accessibility.md)         | WCAG 2.2 AA rules and how to check a change                     |
| [Development](development.md)             | Running locally, commands, the checks before pushing            |
| [Deployment](deployment.md)               | The Worker, environments, CI/CD, releases, search engines       |
| [Fight planner](fight-planner.md)         | How the planner plans a pull in the browser                     |

![The global feed in dark mode](screenshots/feed.png)
