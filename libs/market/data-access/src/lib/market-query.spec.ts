import { convertToParamMap } from '@angular/router';
import { MarketSelection, selectionFromQuery, selectionToQuery } from './market-query';

const query = (params: Record<string, string>) => convertToParamMap(params);

// The parameters a selection writes, without the empty ones.
function written(selection: MarketSelection) {
  return Object.fromEntries(
    Object.entries(selectionToQuery(selection)).filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

describe('the market query string', () => {
  it('starts on Odin, with nothing picked and the whole history', () => {
    const home = selectionFromQuery(query({}));

    expect(home).toEqual({ items: [], scope: 'odin', quality: 'all', from: null, to: null, scale: 'linear' });
    expect(written(home)).toEqual({ scope: 'odin' });
  });

  it('names every choice by id, and reads it back', () => {
    const params = {
      items: '5111,5057',
      scope: 'light',
      quality: 'hq',
      from: '2024-01-01',
      to: '2026-10-01',
      scale: 'log',
    };
    const selection = selectionFromQuery(query(params));

    expect(selection).toEqual({
      items: [5111, 5057],
      scope: 'light',
      quality: 'hq',
      from: '2024-01-01',
      to: '2026-10-01',
      scale: 'log',
    });
    expect(written(selection)).toEqual(params);
  });

  it('keeps at most 3 items, each once, and leaves out what it cannot read', () => {
    const read = selectionFromQuery(
      query({ items: '1,x,2,1,3,4', scope: 'Odin!', quality: 'best', from: '2024-13-45', to: 'today', scale: 'big' }),
    );

    expect(read).toEqual({ items: [1, 2, 3], scope: 'odin', quality: 'all', from: null, to: null, scale: 'linear' });
  });
});
