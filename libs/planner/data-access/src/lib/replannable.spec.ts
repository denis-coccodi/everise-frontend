import { replannable } from './replannable';

describe('replannable', () => {
  it('lets only tanks and healers be ticked', () => {
    expect(['PLD', 'GNB', 'SCH', 'SGE'].map(replannable)).toEqual([true, true, true, true]);
    expect(['MCH', 'BLM', 'DNC', null, undefined].map(replannable)).toEqual([false, false, false, false, false]);
  });
});
