import { ResolveFn } from '@angular/router';

// The title of a page that shows one data centre or all of them, from its
// query string: "?dc=chaos" → "Chaos Venues", none → "Venues".
export function dataCentreTitle(page: string): ResolveFn<string> {
  return (route) => {
    const dataCentre = route.queryParamMap.get('dc');
    return dataCentre ? `${dataCentre.charAt(0).toUpperCase()}${dataCentre.slice(1).toLowerCase()} ${page}` : page;
  };
}
