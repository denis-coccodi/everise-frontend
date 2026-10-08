import { DataCentre } from '@everise/core/api-types';

// A data centre's own Party Finder page: /party-finder/light. The name in
// the address is in lower case; the backend says if it doesn't know it.
export function dataCentrePath(dataCentre: string): string[] {
  return ['/party-finder', dataCentre.toLowerCase()];
}

// "light" (from the address) → "Light".
export function dataCentreName(pathName: string): DataCentre {
  return (pathName.charAt(0).toUpperCase() + pathName.slice(1).toLowerCase()) as DataCentre;
}
