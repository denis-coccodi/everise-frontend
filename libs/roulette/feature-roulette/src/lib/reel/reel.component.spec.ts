import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReelComponent, ReelItem } from './reel.component';

const item = (title: string): ReelItem => ({ title, detail: '' });

@Component({
  imports: [ReelComponent],
  template: `<cdt-roulette-reel caption="Duty" [preview]="preview()" />`,
})
class HostComponent {
  readonly preview = signal<ReelItem[]>([]);
  readonly reel = viewChild.required(ReelComponent);
}

describe('ReelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  const titles = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.row .title')].map((t) => t.textContent?.trim());

  it('shows the possible outcomes while idle, scrolling when there are several', async () => {
    expect(titles()).toEqual(['· · ·', '· · ·', '· · ·', '· · ·', '· · ·', '· · ·']);

    fixture.componentInstance.preview.set([item('Sastasha'), item('the Aurum Vale'), item('Brayflox')]);
    await fixture.whenStable();

    // The loop twice over, so the scroll can wrap.
    expect(titles()).toEqual(['Sastasha', 'the Aurum Vale', 'Brayflox', 'Sastasha', 'the Aurum Vale', 'Brayflox']);
    expect((fixture.nativeElement as HTMLElement).querySelector('.strip.idle.moving')).not.toBeNull();
  });

  it('keeps the winner after a spin, and goes back to the preview when the outcomes change', async () => {
    const outcomes = [item('Sastasha'), item('the Aurum Vale')];
    fixture.componentInstance.preview.set(outcomes);
    await fixture.whenStable();

    // Only the spin's animation wait runs on fake timers.
    vi.useFakeTimers();
    const spin = fixture.componentInstance.reel().spinTo(outcomes, item('the Aurum Vale'), () => 0);
    await vi.runAllTimersAsync();
    await spin;
    vi.useRealTimers();
    await fixture.whenStable();

    expect(fixture.componentInstance.reel().mode()).toBe('landed');
    expect((fixture.nativeElement as HTMLElement).querySelector('.row.winner .title')?.textContent?.trim()).toBe(
      'the Aurum Vale',
    );

    fixture.componentInstance.preview.set([item('Brayflox')]);
    await fixture.whenStable();
    expect(fixture.componentInstance.reel().mode()).toBe('idle');
    expect(titles()).toContain('Brayflox');
  });
});
