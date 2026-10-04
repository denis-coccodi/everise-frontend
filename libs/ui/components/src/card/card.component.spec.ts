import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';

@Component({
  imports: [CardComponent],
  template: `
    <cdt-card id="with-footer">
      <p>Count me in.</p>
      <div cdtCardFooter><span>Thancred</span></div>
    </cdt-card>
    <cdt-card id="plain" [flush]="true"><p>Body only</p></cdt-card>
  `,
})
class HostComponent {}

describe('CardComponent', () => {
  it('puts the body and the footer slot in their places', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;

    expect(el('#with-footer .body p')?.textContent).toBe('Count me in.');
    expect(el('#with-footer .footer span')?.textContent).toBe('Thancred');
    expect(el('#plain .body').classList).toContain('flush');
    expect(el('#plain .footer').childElementCount).toBe(0);
  });
});
