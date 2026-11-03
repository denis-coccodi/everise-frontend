import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { API_URL } from '@everise/core/http-client';
import { BehaviorSubject } from 'rxjs';
import { actionCatalog, fightReport, pullTimeline } from './planner-fixtures';
import { PlannerStore } from './planner.store';
import type { ReferencedTimeline } from '@everise/planner/scheduler';
import type { FightScript } from '@everise/core/api-types';

// A fight's script, one mechanic a cast of `ids`.
const fightScript = (...ids: number[]): FightScript => ({
  zone: 1257,
  title: 'AAC Light-heavyweight M1',
  mechanics: ids.map((id, i) => ({
    at: i * 10_000,
    name: `Mechanic ${id}`,
    ids: [id],
    phase: null,
    block: null,
    enrage: false,
  })),
  enrageIds: [],
  ignoredIds: [],
  source: { commit: 'abc', path: 'ui/raidboss/data/07-dt/raid/r9s.txt' },
});

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

  it("reads every other group's kill that loads for a wipe, archived ones skipped", async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '2' });
    const kill = (durationMs: number) => ({ ...pullTimeline(), durationMs });

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(fightReport());
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2').flush(pullTimeline());
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settled();
    expect((store.pull.value() as ReferencedTimeline | undefined)?.clears).toBeUndefined();
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/clears').flush({
      clears: [
        { code: 'Other0000000000a', pullId: 7 },
        { code: 'Other0000000000b', pullId: 2 },
        { code: 'Other0000000000c', pullId: 4 },
      ],
    });
    await settled();
    http.expectOne('/planner/reports/Other0000000000a/pulls/7').flush(kill(540_000));
    await settled();
    http
      .expectOne('/planner/reports/Other0000000000b/pulls/2')
      .flush({ errors: { body: ['Archived.'] } }, { status: 404, statusText: 'Not Found' });
    await settled();
    http.expectOne('/planner/reports/Other0000000000c/pulls/4').flush(kill(570_000));
    await settled();
    // The fight's script knows the boss's Killer Voice: it's this fight's.
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/script').flush({ script: fightScript(45956) });
    await settled();

    const clears = (store.pull.value() as ReferencedTimeline | undefined)?.clears;
    expect(clears?.map((c) => c.durationMs)).toEqual([540_000, 570_000]);
    expect((store.pull.value() as ReferencedTimeline | undefined)?.script?.title).toBe('AAC Light-heavyweight M1');
    // Nothing was blocked every time: nothing to look up.
    expect((store.pull.value() as ReferencedTimeline | undefined)?.references).toBeUndefined();
  });

  it("keeps a wipe's timeline, with no kills, when FFLogs ranks none and the report got no further", async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '2' });
    // The report's only pull of the fight.
    const report = fightReport();
    report.pulls = report.pulls.filter((p) => p.id !== 3);

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(report);
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2').flush(pullTimeline());
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settled();
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/clears').flush({ clears: [] });
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/script').flush({ script: null });
    await settled();

    expect(store.pull.value()?.players).toHaveLength(2);
    expect((store.pull.value() as ReferencedTimeline | undefined)?.clears).toEqual([]);
    expect((store.pull.value() as ReferencedTimeline | undefined)?.script).toBeNull();
  });

  it("completes a wipe from the report's own pulls of the fight that got further, without kills", async () => {
    const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '2' });

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(fightReport());
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2').flush(pullTimeline());
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settled();
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/clears').flush({ clears: [] });
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/script').flush({ script: null });
    await settled();
    // Pull 3: the report's kill of it.
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/3').flush({ ...pullTimeline(), pullId: 3 });
    await settled();

    const timeline = store.pull.value() as ReferencedTimeline | undefined;
    expect(timeline?.clearsFrom).toBe('report');
    expect(timeline?.clears?.map((c) => c.pullId)).toEqual([3]);
  });

  it("drops a wipe's script that isn't the fight its log shows, or can't be read", async () => {
    for (const flush of [
      (r: TestRequest) => r.flush({ script: fightScript(1, 2, 3) }),
      (r: TestRequest) => r.flush({ errors: { body: ['Down.'] } }, { status: 500, statusText: 'Server Error' }),
    ]) {
      TestBed.resetTestingModule();
      const { store, http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '2' });
      const report = fightReport();
      report.pulls = report.pulls.filter((p) => p.id !== 3);

      http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(report);
      http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2').flush(pullTimeline());
      http.expectOne('/planner/catalog').flush(actionCatalog());
      await settled();
      http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/clears').flush({ clears: [] });
      flush(http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/2/script'));
      await settled();

      expect((store.pull.value() as ReferencedTimeline | undefined)?.script).toBeNull();
    }
  });

  it("reads no other group's kill for a kill with nothing blocked", async () => {
    const { http, settled } = setup({ report: 'aBcD1234eFgH5678', pull: '3' });

    http.expectOne('/planner/reports/aBcD1234eFgH5678').flush(fightReport());
    http.expectOne('/planner/reports/aBcD1234eFgH5678/pulls/3').flush(pullTimeline());
    http.expectOne('/planner/catalog').flush(actionCatalog());
    await settled();

    http.expectNone('/planner/reports/aBcD1234eFgH5678/pulls/3/clears');
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
