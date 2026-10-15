import { venueDataCentre, venuesQuery } from './venues-query';

const query = (dc: string | null) => ({ get: (name: string) => (name === 'dc' ? dc : null) });

describe('venueDataCentre', () => {
  it("reads the data centre's id from the query string", () => {
    expect(venueDataCentre(query('chaos'))).toBe('Chaos');
    expect(venueDataCentre(query(' DYNAMIS '))).toBe('Dynamis');
  });

  it('is Light without one, or with one that is no id', () => {
    expect(venueDataCentre(query(null))).toBe('Light');
    expect(venueDataCentre(query('<script>'))).toBe('Light');
  });
});

describe('venuesQuery', () => {
  it('names a data centre by its id', () => {
    expect(venuesQuery('Materia')).toEqual({ dc: 'materia' });
  });
});
