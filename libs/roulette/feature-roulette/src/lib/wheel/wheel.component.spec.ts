import { ComponentFixture, TestBed } from '@angular/core/testing';
import { segmentAt } from './wheel-geometry';
import { WheelComponent } from './wheel.component';

describe('WheelComponent', () => {
  let fixture: ComponentFixture<WheelComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [WheelComponent] }).compileComponents();
    fixture = TestBed.createComponent(WheelComponent);
    fixture.componentRef.setInput('caption', 'Party settings');
    fixture.componentRef.setInput('segments', ['Join Party in Progress', 'Regular']);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  function rotation() {
    const rotor = (fixture.nativeElement as HTMLElement).querySelector<SVGGElement>('.rotor');
    return Number(/rotate\(([-\d.]+)deg\)/.exec(rotor?.style.transform ?? '')?.[1]);
  }

  async function spin(index: number) {
    const done = fixture.componentInstance.spinTo(index, () => 0.5);
    await vi.runAllTimersAsync();
    await done;
  }

  it('turns at least five full turns on every spin, landing on the chosen segment', async () => {
    let previous = 0;
    // The same segment twice, then after the segments change: every spin must
    // still be a full spin, not a creep to the next angle.
    for (const [index, segments] of [
      [1, 2],
      [1, 2],
      [0, 4],
    ] as const) {
      if (segments === 4) {
        fixture.componentRef.setInput('segments', [
          'Min IL + Silence Echo',
          'Unsynced',
          'Join Party in Progress',
          'Regular',
        ]);
        fixture.detectChanges();
      }
      await spin(index);

      expect(rotation() - previous).toBeGreaterThanOrEqual(5 * 360);
      expect(segmentAt(rotation(), segments)).toBe(index);
      expect(fixture.componentInstance.winner()).toBe(index);
      previous = rotation();
    }
  });
});
