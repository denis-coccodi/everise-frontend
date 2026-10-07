---
name: frontend-best-practices
description: How Everise's Angular code is organised and written - which library a piece of code belongs in (feature, widget, data-access, ui, util, testing, enforced by tags), one component per folder with stores and services only in data-access (scripts/check-structure.mjs), imports by library entry point only, NgRx signal store practices, no `any`, typed templates, API types in api-types, serverMessage() for errors, cdt-icon/avatar/message, specs, and the size limits that force a long component to be split. Use before writing or changing any TypeScript, component, template, store, service or library in this repo, when adding a page or feature, when a component or file is getting long, and when reviewing a frontend change.
---

# Frontend best practices

The rules this codebase follows, and the checks that keep it there. Read the `theme` skill for looks (tokens, building blocks, breakpoints) and the `accessibility` skill for WCAG; this one is about code and structure.

## Where code goes

Every project has a type tag in its `project.json`; `@nx/enforce-module-boundaries` (root `eslint.config.mjs`) fails lint when an import breaks these rules.

| Type               | What it holds                                       | Examples                                                                   | May import                    |
| ------------------ | --------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| `type:app`         | Routes, app config, layout (navbar, footer)         | `apps/everise`                                                             | everything below              |
| `type:feature`     | One page or area: its components                    | `libs/roulette/feature-roulette`, `libs/waking-sands/feature-waking-sands` | widget, data-access, ui, util |
| `type:widget`      | Feature pieces several pages reuse                  | `articles-feature-articles-list`, `media`                                  | widget, data-access, ui, util |
| `type:data-access` | Services (HTTP), signal stores, domain rules        | `libs/*/data-access`                                                       | data-access, util             |
| `type:ui`          | Dumb, themed building blocks                        | `libs/ui/components`                                                       | ui, util                      |
| `type:util`        | API types, HTTP client, forms helpers, interceptors | `libs/core/*`                                                              | util                          |
| `type:testing`     | The shared test environment                         | `libs/core/testing`                                                        | nothing                       |

- **A new feature** gets `libs/<area>/feature-<area>` for its components and, as soon as it holds state or calls the API, `libs/<area>/data-access` for the service and store. Copy an existing pair's `project.json`, `tsconfig*.json`, `eslint.config.mjs` and `vite.config.mts`, add the tag, the `@everise/<area>/...` path in `tsconfig.base.json`, a README, and `src/test-setup.ts` (`import '@everise/core/testing';`).
- **A page never imports another page.** What two pages share becomes a widget, a data-access library or a UI building block.
- **Import a library only by its entry point** (`@everise/<area>/<lib>`, its `src/index.ts`), never by a path into its `src/` (`@everise/articles/data-access/src`): the index is the library's public API. `tsconfig.base.json` maps each library by name and has no wildcard (`@everise/*`) that would allow deep imports. Inside a library, use relative imports.
- **Libraries sit side by side**, `libs/<area>/<type>-<name>` or `libs/<area>/data-access`, never one inside another's folder (the media widget is `libs/media/feature-media` so that `libs/media/data-access` can sit next to it).

### Folders inside a library

Angular's style guide and Nx's generators agree; `node scripts/check-structure.mjs` (in CI) fails when this breaks:

- **One component, directive or pipe per folder, named after it**: `gif-picker/gif-picker.component.{ts,html,scss,spec.ts}`, `is-error-visible/is-error-visible.directive.ts`, `error-mapper/error-mapper.pipe.ts`. That includes a page's own component (`settings/settings.component.ts`, not at the library root) and building blocks that come in pairs (`menu/` and `menu-item/`, `tabs/` and `tab/`). The library root holds only `index.ts`, `test-setup.ts`, routes and resolvers, and plain helpers several of its components share (`motion.ts`, `youtube.ts`).
- **A helper used by one component sits in that component's folder** (`roulette/reel-items.ts`, `image-dialog/image-fitter.ts`); helpers shared by a few go in a folder named after what they do (`profile-picture/`).
- **Stores and services never sit next to a component**, and never in a feature, widget or ui library: they go in the area's data-access library (the home page's tags are `TagsStore` in `articles/data-access`; uploads are `MediaService` in `media/data-access`). Only core's util libraries keep their own infrastructure stores (`FormErrorsStore`, `ErrorHandlerStore`).
- **No folders by kind of file**: no `components/`, `services/`, `stores/`, `models/`, `resolvers/`, `guards/`, `utils/`. Files are named by kind (`profile.service.ts`, `profile-state.model.ts`, `profile-resolver.ts`) and folders by what they hold.
- **API shapes live in `@everise/core/api-types`**, and they are generated: `npm run api-types` writes `generated/openapi.ts` from the backend's `openapi.json`, and the library's files name its schemas (`export type Article = Schemas['Article']`). Never write an API shape by hand, in a feature or in `core/http-client`, and never cast a request body (`as User`): use the request type (`UserChanges`, `CreateArticle`). Limits come from the API's answers (`SandsRoom['limits']`), never from copied numbers. Only what the document can't describe (live events) is written by hand there. After a backend API change, regenerate and commit; CI's `api-types` job fails while they differ.

## Components

- Standalone, `ChangeDetectionStrategy.OnPush`, `inject()`, signal `input()` / `output()` / `model()`, the `@if` / `@for` / `@switch` control flow, `host: {}` for host bindings. No `@Input`/`@Output`/`@HostBinding` decorators, no `*ngIf`, no `NgModule`s.
- Template members are `protected`; what a parent or spec reads is `readonly` public.
- A component shows state and forwards actions. **State and API calls belong in a store** (below). One-shot reads with a fallback are fine as `toSignal(service.read().pipe(catchError(() => of(fallback))))`.
- Subscriptions in a component are for actions the person starts (an upload, a search) or events (router, live socket). A long-lived one uses `takeUntilDestroyed()`. No hand-written loading flags plus `subscribe` for page data: that is a store's job.
- Side effects of state changes (focus, closing a window) go in an `effect()` whose non-trigger reads are `untracked()`.
- A selector is `cdt-<name>`; one component per folder: `.ts`, `.html`, `.scss`, `.spec.ts` (see "Folders inside a library").

## Stores (NgRx signal store)

- `signalStore(withState, withComputed, withMethods, withHooks)` in the data-access library. A page's store is provided by the page (`providers: [XStore]`), so it starts and ends with it; app-wide state (`AuthStore`, `SettingsStore`) is `providedIn: 'root'`.
- API calls are `rxMethod` with `tapResponse` (`switchMap` to load, `exhaustMap` to submit, `mergeMap` for independent actions). Errors become `serverMessage(error)` in state.
- Live updates, timers and listeners start in `withHooks.onInit` (`rxMethod(...)(observable)` subscribes for the store's lifetime) and stop in `onDestroy`.
- **State and method names never collide** (`searchTerm` state, `search()` method): a method replaces a state signal of the same name.
- Derived values are `computed` in `withComputed`; pure helpers (reel items, prompts, formatting) are plain exported functions in their own file.
- **Provided in one place only**: by the page (`providers: [TagsStore]`) or `providedIn: 'root'`, never both (that makes two copies).
- **State stays protected** (the default): only the store's own methods call `patchState`; components call those methods. Never `{ protectedState: false }`.
- **State is an object of named slices** (`{ tags: string[] }`), never an array itself.
- Behaviour several stores share is a custom feature, `withX()` built with `signalStoreFeature` (`withCallState` in `@everise/core/data-access`); what it needs from the store is declared with `type<T>()` / its generic, not assumed.
- A failed call ends in state (an error message, or an empty fallback the page can show), never only in `console`.
- Names: `XStore` in `x.store.ts`, its `XState` and initial state in the store file or `x.model.ts`; the API calls in `XService` (`x.service.ts`), typed with `@everise/core/api-types`.
- NgRx's lint rules are on (root `eslint.config.mjs`: `ngrx.configs.signals`, `ngrx.configs.operators`); its type-checked rules aren't, as lint here isn't type-aware.

## TypeScript

- **No `any`** outside specs (lint: `@typescript-eslint/no-explicit-any`). Use the real type, or `unknown` and narrow it (`instanceof`, `in`, type guards like `isAssignableRole`).
- **No `$any()` in templates** (lint: `@angular-eslint/template/no-any`). Read a typed template reference instead: `<input #name (input)="set(name.value)">`, and on a `cdtInput` element `#name="cdtInput"` (a reference there points at the component, which exposes `value`). Event handlers take `Event` and narrow (`event instanceof KeyboardEvent`): strict templates type `(keydown.enter)` as `Event`.
- Server errors: `serverMessage(error)` from `@everise/core/forms`, never `error.error.errors.body[0]` by hand.

## UI pieces

- Icons: `<cdt-icon name="…" />` only (inline SVG); no icon fonts, no `<i class="ion-…">`. Every page link in the navbar has one; account links don't.
- Profile pictures: `<cdt-avatar [src] [size] [frame]>`; status, warning and error lines: `<cdt-message [tone]>` (it stays on the page while empty). Never a hand-styled round `<img>` or `<p class="status">`.
- Layout changes at the theme's breakpoints only (`@include bp.up(md)`).

## Size limits

`node scripts/check-sizes.mjs` (run in CI, before lint and tests) fails when a file outgrows its kind:

| Kind                                    | Max lines                                     |
| --------------------------------------- | --------------------------------------------- |
| Component class (`*.component.ts`)      | 200                                           |
| Component template (`*.component.html`) | 150                                           |
| Component styles (`*.component.scss`)   | 250 (and the 6 kB `anyComponentStyle` budget) |
| Store or service                        | 250                                           |
| Other TypeScript                        | 350                                           |

Don't wait for the limit: **past about 150 lines, or when a component does two things, split it.** In order of preference:

1. **State and API calls into a store** in the data-access library (the roulette's `RouletteStore`, the Waking Sands' `WakingSandsStore`).
2. **One child component per panel or window**, each reading the same page-provided store (`cdt-roulette-settings`, `cdt-roulette-picks`, `cdt-sands-cast`, `cdt-sands-conversation`, `cdt-gif-picker`).
3. **Pure functions** into their own file (`reel-items.ts`).

Never raise a limit to make a file pass.

## Tests

- Every component, store and helper has a spec next to it. Specs test what a person sees (`textContent`, roles, names) and what the backend is asked (`HttpTestingController`), not private members; a page's store is read through `fixture.debugElement.injector.get(XStore)`.
- The test environment (`@everise/core/testing`) fails a test on an unknown element or property: a component missing from `imports` breaks its spec.
- Specs don't type-check templates; **the production build does**, so it's part of the check before pushing.
- Fixtures are realistic: lists have unique ids (duplicate `track` keys are a bug Angular warns about).
- Before a PR: the size check, lint, tests and both builds (CLAUDE.md), plus the `theme` and `accessibility` skills' checks for template or style changes.

## Before finishing

```
node scripts/check-sizes.mjs
node scripts/check-structure.mjs
npx nx run-many -t lint test
npx nx run everise:build --configuration=production
npx nx run everise:build --configuration=staging
git grep -nE ': any\b|<any>|as any[;,)>\]]|\$any\(' -- 'apps/**/*.ts' 'apps/**/*.html' 'libs/**/*.ts' 'libs/**/*.html' ':!*.spec.ts' ':!*test-setup.ts'
git grep -nE 'errors\?\.body\?\.\[0\]|class="ion-' -- 'apps' 'libs' ':!*.spec.ts' ':!libs/core/forms/src/lib/server-message.ts'
```

The last two should print nothing.
