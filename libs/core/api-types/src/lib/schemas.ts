import { components } from './generated/openapi';

// The API's named schemas, generated from the backend's openapi.json
// (`npm run api-types`). The other files in this folder give them the names
// the app uses; never edit generated/openapi.ts by hand.
export type Schemas = components['schemas'];
