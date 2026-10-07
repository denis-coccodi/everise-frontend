# core-api-types

The API's request and response types, generated from the backend's OpenAPI document so the two can't drift apart.

- `src/lib/generated/openapi.ts` is written by `npm run api-types` from the backend's `openapi.json` (its `main` branch). Never edit it by hand.
- The other files give the generated schemas the names the app uses (`Article`, `User`, `SandsRoom`...), plus the few things the document doesn't describe: the live events (`ArticleCreatedEvent`, `SandsEvent`) and attachment counts.
- Limits the forms enforce (`SandsRoom['limits']`, `CharactersResponse['limits']`) come from the API's answers, not from constants here.

When the backend's API changes: merge the backend first, then run `npm run api-types` here and commit the result with the code that uses it. CI's `api-types` job fails while the committed types differ from the backend's `main`.

Browse the API at `/api/docs` on the backend (Swagger UI).
