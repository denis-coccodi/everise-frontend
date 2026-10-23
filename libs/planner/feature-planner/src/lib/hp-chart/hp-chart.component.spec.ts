import { TestBed } from '@angular/core/testing';
import { HpCurve } from '@everise/planner/data-access';
import { HpChartComponent } from './hp-chart.component';

describe('HpChartComponent', () => {
  const curves: HpCurve[] = [
    {
      id: 1,
      name: 'Tank Main',
      job: 'PLD',
      played: [
        { at: 0, share: 1 },
        { at: 60_000, share: 0.2 },
      ],
      planned: [
        { at: 0, share: 1 },
        { at: 60_000, share: 0.5 },
      ],
      marks: [],
    },
    {
      id: 2,
      name: 'Heal Main',
      job: 'SCH',
      played: [
        { at: 0, share: 1 },
        { at: 120_000, share: 0 },
      ],
      planned: [
        { at: 0, share: 1 },
        { at: 120_000, share: 0.05 },
      ],
      marks: [
        { at: 120_000, share: 0, kind: 'death', action: null },
        { at: 120_000, share: 0.05, kind: 'short', action: 'Wall' },
      ],
    },
  ];

  function render() {
    const fixture = TestBed.createComponent(HpChartComponent);
    fixture.componentRef.setInput('curves', curves);
    fixture.componentRef.setInput('durationMs', 180_000);
    fixture.componentRef.setInput('margin', 0.1);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const readouts = () => [...host.querySelectorAll('.readout')].map((r) => r.textContent?.trim());
    return { fixture, host, readouts };
  }

  it('gives each member a panel that says their lowest HP, as played and with the plan', () => {
    const { host, readouts } = render();

    expect([...host.querySelectorAll('.panel .name')].map((n) => n.textContent?.trim())).toEqual([
      'PLD Tank Main',
      'SCH Heal Main',
    ]);
    expect(readouts()).toEqual([
      'Lowest: played 20% at 1:00, plan 50% at 1:00',
      'Lowest: played 0% at 2:00, plan 5% at 2:00',
    ]);
    expect(host.querySelectorAll('path.played')).toHaveLength(2);
    expect(host.querySelector('.margin-key')?.textContent?.trim()).toBe('10% margin');
  });

  it('says what each mark is, without seeing it', () => {
    const { host } = render();

    expect([...host.querySelectorAll('.panel ul li')].map((li) => li.textContent?.trim())).toEqual([
      'Died at 2:00, as played',
      'Wall, 2:00: short with the plan, 5% left',
    ]);
  });

  it('hides a line, or a member', () => {
    const { fixture, host, readouts } = render();

    (host.querySelectorAll<HTMLInputElement>('.lines input')[1] as HTMLInputElement).click();
    fixture.detectChanges();
    expect(host.querySelectorAll('path.planned')).toHaveLength(0);
    expect(readouts()[0]).toBe('Lowest: played 20% at 1:00');

    const chip = host.querySelector<HTMLButtonElement>('.members button') as HTMLButtonElement;
    chip.click();
    fixture.detectChanges();
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelectorAll('.panel')).toHaveLength(1);
  });

  it('moves a cursor shared by every panel with the keys, saying each HP then', () => {
    const { fixture, host, readouts } = render();
    const slider = host.querySelector('[role=slider]') as HTMLElement;
    const press = (key: string) => {
      slider.dispatchEvent(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();
    };

    press('End');
    expect(slider.getAttribute('aria-valuetext')).toBe('3:00');
    press('PageDown');
    expect(readouts()).toEqual(['2:50: played 20%, plan 50%', '2:50: played 0%, plan 5%']);
    press('Escape');
    expect(readouts()[0]).toMatch(/^Lowest/);
  });
});
