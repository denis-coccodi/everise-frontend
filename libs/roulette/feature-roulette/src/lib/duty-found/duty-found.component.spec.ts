import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DutyFoundComponent, RouletteResult } from './duty-found.component';

const result: RouletteResult = {
  type: 'Raids — Savage',
  name: 'Alexander - The Burden of the Father (Savage)',
  detail: 'Lv. 60 · i205 · Heavensward',
  mode: 'Awktrail',
  dutyUnknown: false,
};

describe('DutyFoundComponent', () => {
  let fixture: ComponentFixture<DutyFoundComponent>;

  async function show(shown: RouletteResult) {
    await TestBed.configureTestingModule({ imports: [DutyFoundComponent] }).compileComponents();
    fixture = TestBed.createComponent(DutyFoundComponent);
    fixture.componentRef.setInput('result', shown);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the guide for the party setting, opening in a new tab', async () => {
    const page = await show({ ...result, guide: { label: 'Awktrail gear sets', url: 'https://example.com/sheet' } });

    const link = page.querySelector<HTMLAnchorElement>('.guide a');
    expect(link?.textContent?.trim()).toBe('Awktrail gear sets');
    expect(link?.getAttribute('href')).toBe('https://example.com/sheet');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('puts the focus on Commence', async () => {
    const page = await show(result);

    expect(document.activeElement?.textContent?.trim()).toBe('Commence');
    expect(page.contains(document.activeElement)).toBe(true);
  });

  it('shows no guide link without one', async () => {
    const page = await show({ ...result, mode: 'Regular' });

    expect(page.querySelector('.guide')).toBeNull();
  });
});
