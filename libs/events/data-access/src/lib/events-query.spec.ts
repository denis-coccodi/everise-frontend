import { eventDataCentre, eventsQuery } from './events-query';

const query = (dc: string | null) => ({ get: (name: string) => (name === 'dc' ? dc : null) });

describe('eventDataCentre', () => {
  it("reads the data centre's id from the query string", () => {
    expect(eventDataCentre(query('chaos'))).toBe('Chaos');
    expect(eventDataCentre(query(' MATERIA '))).toBe('Materia');
  });

  it('is every data centre without one, or with one that is no id', () => {
    expect(eventDataCentre(query(null))).toBeNull();
    expect(eventDataCentre(query('<script>'))).toBeNull();
  });
});

describe('eventsQuery', () => {
  it('names a data centre by its id, and drops it for every one', () => {
    expect(eventsQuery('Light')).toEqual({ dc: 'light' });
    expect(eventsQuery(null)).toEqual({ dc: null });
  });
});
