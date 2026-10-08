import { dataCentreName, dataCentrePath } from './data-centre-path';

describe('data centre paths', () => {
  it('names a data centre from its address, and back', () => {
    expect(dataCentreName('light')).toBe('Light');
    expect(dataCentreName('MATERIA')).toBe('Materia');
    expect(dataCentrePath('Chaos')).toEqual(['/party-finder', 'chaos']);
  });
});
