import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DutyCardComponent } from './duty-card.component';

@Component({
  imports: [DutyCardComponent],
  template: `
    <cdt-duty-card
      type="Raids — Savage"
      name="Deltascape V1.0 (Savage)"
      detail="Lv. 70 · i320 · Stormblood"
      [mode]="mode()"
      [image]="image()"
      [jobName]="jobName()"
      jobIcon="/api/images/62141"
      [unknown]="unknown()"
    >
      <a cdtDutyCardLinks href="/wiki">Wiki guide</a>
      <dd class="extra">Awktrail gear set</dd>
    </cdt-duty-card>
  `,
})
class HostComponent {
  readonly mode = signal('Regular');
  readonly image = signal<string | undefined>('/api/images/112001');
  readonly jobName = signal<string | undefined>(undefined);
  readonly unknown = signal(false);
}

describe('DutyCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let card: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    card = fixture.nativeElement.querySelector('cdt-duty-card');
    await fixture.whenStable();
  });

  const text = (selector: string) => card.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  it('shows the banner, type, name, details and party settings', () => {
    expect(card.querySelector('img.picture')?.getAttribute('src')).toBe('/api/images/112001');
    expect(text('.type')).toBe('Raids — Savage');
    expect(text('.name')).toBe('Deltascape V1.0 (Savage)');
    expect(text('.detail')).toBe('Lv. 70 · i320 · Stormblood');
    expect(text('dd')).toBe('Regular');
    expect(card.querySelector('.unknown')).toBeNull();
  });

  it('places links under the details and other content in the party settings', () => {
    expect(card.querySelector('.detail + a')?.textContent).toBe('Wiki guide');
    expect(card.querySelector('dl .extra')?.textContent).toBe('Awktrail gear set');
  });

  it('shows a dealt job with its icon', async () => {
    fixture.componentInstance.jobName.set('Viper');
    await fixture.whenStable();

    expect(text('dd')).toBe('Everyone on the same job: Viper');
    expect(card.querySelector('dd img')?.getAttribute('src')).toBe('/api/images/62141');
  });

  it('marks a duty the game picks, and leaves out a missing banner', async () => {
    fixture.componentInstance.unknown.set(true);
    fixture.componentInstance.image.set(undefined);
    await fixture.whenStable();

    expect(card.querySelector('.unknown')).not.toBeNull();
    expect(card.querySelector('img.picture')).toBeNull();
  });
});
