import { TestBed } from '@angular/core/testing';
import { LineChartComponent } from './line-chart.component';
import type { ChartLine } from './line-chart.model';

const day = (date: string) => Date.parse(`${date}T00:00:00Z`);

const lines: ChartLine[] = [
  {
    name: 'Iron Ore',
    points: [
      { at: day('2026-10-01'), value: 200, detail: '3 sales' },
      { at: day('2026-10-02'), value: 300, detail: '1 sale' },
      { at: day('2026-10-03'), value: 250, detail: '2 sales' },
    ],
  },
  { name: 'Iron Ingot', points: [{ at: day('2026-10-02'), value: 1200 }] },
];

describe('LineChartComponent', () => {
  async function render(shown = lines) {
    await TestBed.configureTestingModule({ imports: [LineChartComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LineChartComponent);
    fixture.componentRef.setInput('lines', shown);
    fixture.componentRef.setInput('from', day('2026-10-01'));
    fixture.componentRef.setInput('to', day('2026-10-03'));
    fixture.componentRef.setInput('label', 'Day shown');
    fixture.componentRef.setInput('unit', 'gil');
    fixture.componentRef.setInput('missing', 'no sales');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, page, plot: page.querySelector('[role="slider"]') as HTMLElement };
  }

  const key = (element: HTMLElement, name: string) =>
    element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));

  it("says each line's latest, lowest and highest value in its legend", async () => {
    const { page } = await render();

    const items = [...page.querySelectorAll('.legend li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(items).toEqual([
      'Iron Ore latest 250 gil, low 200 gil, high 300 gil',
      'Iron Ingot latest 1,200 gil, low 1,200 gil, high 1,200 gil',
    ]);
    // Iron Ingot's one point is a dot, not a line.
    expect(page.querySelectorAll('polyline')).toHaveLength(1);
    expect(page.querySelectorAll('.dot.line-1')).toHaveLength(1);
  });

  it("is a slider over the days, starting on the last, that reads each line's value", async () => {
    const { fixture, plot } = await render();

    expect(plot.getAttribute('aria-label')).toBe('Day shown');
    expect(plot.getAttribute('tabindex')).toBe('0');
    expect(plot.getAttribute('aria-valuemax')).toBe('2');
    expect(plot.getAttribute('aria-valuenow')).toBe('2');
    expect(plot.getAttribute('aria-valuetext')).toBe('3 October 2026: Iron Ore 250 gil (2 sales); Iron Ingot no sales');

    key(plot, 'ArrowLeft');
    await fixture.whenStable();
    expect(plot.getAttribute('aria-valuetext')).toBe('2 October 2026: Iron Ore 300 gil (1 sale); Iron Ingot 1,200 gil');

    key(plot, 'Home');
    await fixture.whenStable();
    expect(plot.getAttribute('aria-valuenow')).toBe('0');
    key(plot, 'ArrowLeft');
    key(plot, 'End');
    await fixture.whenStable();
    expect(plot.getAttribute('aria-valuenow')).toBe('2');
  });

  it('breaks a line over a day without a point, and shows a point alone as a dot', async () => {
    const { fixture, page } = await render([
      {
        name: 'Odin',
        points: [
          { at: day('2026-10-01'), value: 200 },
          { at: day('2026-10-02'), value: 300 },
          { at: day('2026-10-04'), value: 250 },
        ],
      },
    ]);
    fixture.componentRef.setInput('to', day('2026-10-04'));
    fixture.componentRef.setInput('gap', 86_400_000);
    await fixture.whenStable();

    expect(page.querySelectorAll('polyline')).toHaveLength(1);
    expect(page.querySelectorAll('polyline')[0].getAttribute('points')?.split(' ')).toHaveLength(2);
  });

  it('says when a line has nothing in the range', async () => {
    const { page, plot } = await render([{ name: 'Fire Shard', points: [] }]);

    expect(page.querySelector('.legend li')?.textContent).toContain('nothing in these days');
    expect(plot.getAttribute('aria-disabled')).toBe('true');
  });
});
