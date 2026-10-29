import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { BehaviorSubject } from 'rxjs';
import { actionCatalog, fightReport, pullTimeline } from './planner-fixtures';
import { PlannerStore } from './planner.store';
import type { ReferencedTimeline } from '@everise/planner/scheduler';

describe('PlannerStore', () => {
  function setup(query: Record<string, string> = {}) {
    const queryParamMap = new BehaviorSubject(convertToParamMap(query));
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        PlannerStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
        { provide: ActivatedRoute, useValue: { queryParamMap } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const store = TestBed.inject(PlannerStore);
    TestBed.tick();
    const settled = () => TestBed.inject(ApplicationRef).whenStable();
    return { store, http: TestBed.inject(HttpTestingController), settled, queryParamMap, navigate };
  }

  it('asks for nothing until a report is named', () => {
    const { store, http } = setup();

    http.expectNone(() => true);
    expect(store.encounters()).toEqual([]);
  });

  it("reads the report, its pulls a group per fight in the order they're first pulled", async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678' });

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(fightReport());
    await settled();

    expect(store.encounters().map((e) => [e.name, e.kind, e.pulls.map((p) => p.id)])).toEqual([
      ['Vamp Fatale', 'savage', [2, 3]],
      ['Doomtrain', 'extreme', [4]],
    ]);
    expect(store.picked()).toBeNull();
  });

  it('numbers the later fights FFLogs names alike', async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678' });
    const report = fightReport();
    const [first] = report.pulls;
    report.pulls = [
      { ...first, id: 1, encounterId: 104, name: 'Lindwurm' },
      { ...first, id: 2, encounterId: 105, name: 'Lindwurm' },
    ];

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(report);
    await settled();

    expect(store.encounters().map((e) => e.name)).toEqual(['Lindwurm', 'Lindwurm II']);
  });

  it('reads the pull picked and the action catalog', async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '3' });

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(fightReport());
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/3').flush(pullTimeline());
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settled();

    expect(store.picked()?.id).toBe(3);
    expect(store.pull.value()?.players.map((p) => p.name)).toEqual(['Tank Main', 'Heal Main']);
    expect(store.catalog.hasValue()).toBe(true);
  });

  it("reads what other groups' kills say of an attack blocked every time, skipping one that won't load", async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '3' });
    // Blackout at 100s, under Hallowed Ground: the log has nothing of it.
    const timeline = pullTimeline();
    timeline.actions.push({ id: 999, name: 'Blackout' });
    timeline.statuses.push({ id: 82, name: 'Hallowed Ground' });
    const blocked = { ...timeline.damage[0], at: 100_000, action: 999, amount: 0, unmitigated: null };
    timeline.damage.push({ ...blocked, mitigated: 0, absorbed: 0, statuses: [82] });
    // Another group's kill, where the tank took 250,000 from it.
    const kill = pullTimeline();
    kill.actions.push({ id: 999, name: 'Blackout' });
    kill.damage.push({ ...kill.damage[0], at: 90_000, action: 999, unmitigated: 250_000 });

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(fightReport());
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/3').flush(timeline);
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settled();
    // Shown at once, before the others' kills are read.
    expect(store.pull.value()?.damage).toHaveLength(5);
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/3/clears').flush({
      clears: [
        { code: 'Other0000000000a', pullId: 7 },
        { code: 'Other0000000000b', pullId: 2 },
        { code: 'Other0000000000c', pullId: 4 },
      ],
    });
    await settled();
    http
      .expectOne('/planner/reports/Other0000000000a/pulls/7')
      .flush({ errors: { body: ['Private.'] } }, { status: 403, statusText: 'Forbidden' });
    await settled();
    http.expectOne('/planner/reports/Other0000000000b/pulls/2').flush(kill);
    await settled();

    expect((store.pull.value() as ReferencedTimeline | undefined)?.references).toEqual({
      Blackout: { byRole: { tank: 250_000 }, any: 250_000 },
    });
    // Found: the third isn't read.
    http.expectNone('/planner/reports/Other0000000000c/pulls/4');
  });

  it("says why a report can't be read, in the backend's words", async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678' });

    http
      .expectOne('/planner/reports/aBcD1234eFgH5678')
      .flush(
        { errors: { body: ['That FFLogs report is private. Make it public or unlisted on FFLogs, then try again.'] } },
        { status: 403, statusText: '' },
      );
    await settled();

    expect(store.reportError()).toBe(
      'That FFLogs report is private. Make it public or unlisted on FFLogs, then try again.',
    );
  });

  it('opens what a pasted link names, and refuses what names no report', () => {
    const { store, navigate } = setup();

    expect(store.open('https://www.fflogs.com/reports/aBcD1234eFgH5678#fight=12')).toBe(true);
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { report: 'aBcD1234eFgH5678', pull: 12 } }),
    );
    expect(store.open('not a link')).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('picks a pull, keeping the report', () => {
    const { store, navigate } = setup({ report: 'aBcD1234eFgH5678' });

    store.pick(4);

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pull: 4 }, queryParamsHandling: 'merge' }),
    );
  });
});
