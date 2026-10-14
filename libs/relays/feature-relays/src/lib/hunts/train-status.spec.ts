import { trainStatus } from './train-status';

describe('trainStatus', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');

  it('tells trains to come, running and past apart', () => {
    expect(trainStatus('2026-10-14T12:06:00Z', now)).toEqual({ state: 'upcoming', label: 'Starts in 6 minutes' });
    expect(trainStatus('2026-10-14T11:40:00Z', now)).toEqual({
      state: 'running',
      label: 'Running · started 20 minutes ago',
    });
    expect(trainStatus('2026-10-14T09:00:00Z', now)).toEqual({
      state: 'past',
      label: 'Last train · started 3 hours ago',
    });
  });
});
