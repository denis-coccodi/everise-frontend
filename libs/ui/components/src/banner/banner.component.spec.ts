import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BannerComponent } from './banner.component';

@Component({
  imports: [BannerComponent],
  template: `<cdt-banner><h1>everise</h1></cdt-banner>`,
})
class HostComponent {}

describe('BannerComponent', () => {
  it('puts its content in the page-width container', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('cdt-banner .container h1');
    expect(heading?.textContent).toBe('everise');
  });
});
