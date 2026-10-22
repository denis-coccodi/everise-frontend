import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { dataCentreTitle } from './data-centre-title';

describe('dataCentreTitle', () => {
  const titleAt = (query: Record<string, string>) =>
    dataCentreTitle('Venues')(
      { queryParamMap: convertToParamMap(query) } as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    );

  it("names the data centre in the query string, capitalised, or only the page's name", () => {
    expect(titleAt({ dc: 'CHAOS' })).toBe('Chaos Venues');
    expect(titleAt({})).toBe('Venues');
  });
});
