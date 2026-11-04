import type { PlanSheet } from './plan-sheet.model';
import { sheetIcons } from './sheet-icons';

const sheet: PlanSheet = {
  players: [
    {
      id: 1,
      name: 'Tank Main',
      job: 'PLD',
      jobIcon: 62119,
      role: 'tank',
      slots: 1,
      choices: [
        { name: 'Rampart', icon: 2573 },
        { name: 'Reprisal', icon: 806 },
        { name: 'Sprint', icon: null },
      ],
    },
    {
      id: 2,
      name: 'Heal Main',
      job: 'SCH',
      jobIcon: 62128,
      role: 'healer',
      slots: 1,
      choices: [{ name: 'Rampart', icon: 2573 }],
    },
  ],
  rows: [],
  completedFrom: null,
};

describe('sheetIcons', () => {
  it('fetches each job’s and skill’s icon once from the API, leaving out the ones that fail', async () => {
    const asked: string[] = [];
    const get = (async (url: string) => {
      asked.push(url);
      return url.endsWith('/806') ? new Response(null, { status: 404 }) : new Response(new Uint8Array([1, 2]));
    }) as typeof fetch;

    const icons = await sheetIcons('/api', sheet, get);

    expect(asked).toEqual([
      '/api/market/icons/62119',
      '/api/market/icons/2573',
      '/api/market/icons/806',
      '/api/market/icons/62128',
    ]);
    expect([...icons.keys()]).toEqual([62119, 2573, 62128]);
    expect(icons.get(2573)).toEqual(new Uint8Array([1, 2]));
  });

  it('leaves out an icon it can’t reach at all', async () => {
    const get = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;

    expect((await sheetIcons('/api', sheet, get)).size).toBe(0);
  });
});
