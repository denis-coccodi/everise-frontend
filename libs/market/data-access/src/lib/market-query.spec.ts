import { convertToParamMap } from '@angular/router';
import { selectionFromQuery, selectionToQuery } from './market-query';
import type { MarketSelection } from './market-selection.model';

const query = (params: Record<string, string>) => convertToParamMap(params);

// The parameters a selection writes, without the empty ones.
function written(selection: MarketSelection) {
  return Object.fromEntries(
    Object.entries(selectionToQuery(selection)).filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

describe('the market history query string', () => {
  it('starts on Europe, with no item, the default worlds and the last month', () => {
    const home = selectionFromQuery(query({}));

    expect(home).toEqual({
      item: null,
      region: 'europe',
      oceania: false,
      worlds: [],
      quality: 'all',
      from: null,
      to: null,
      scale: 'linear',
    });
    expect(written(home)).toEqual({ region: 'europe' });
  });

  it('names every choice by id, and reads it back', () => {
    const params = {
      item: '5111',
      region: 'north-america',
      oceania: 'show',
      worlds: 'gilgamesh,bismarck',
      quality: 'hq',
      from: '2024-01-01',
      to: '2026-10-01',
      scale: 'log',
    };
    const selection = selectionFromQuery(query(params));

    expect(selection).toEqual({
      item: 5111,
      region: 'north-america',
      oceania: true,
      worlds: ['gilgamesh', 'bismarck'],
      quality: 'hq',
      from: '2024-01-01',
      to: '2026-10-01',
      scale: 'log',
    });
    expect(written(selection)).toEqual(params);
  });

  it('keeps at most 8 worlds, each once, and leaves out what it cannot read', () => {
    const read = selectionFromQuery(
      query({
        item: 'x',
        region: 'Europe!',
        worlds: 'odin,ODIN,a,b,c,d,e,f,g,h,9',
        quality: 'best',
        from: '2024-13-45',
        scale: 'big',
      }),
    );

    expect(read).toMatchObject({ item: null, region: 'europe', quality: 'all', from: null, scale: 'linear' });
    expect(read.worlds).toEqual(['odin', 'a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });
});
