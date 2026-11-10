import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to the privacy policy', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.privacy');
    expect(link?.textContent?.trim()).toBe('Privacy policy');
    expect(link?.getAttribute('href')).toBe('/privacy');
  });

  it('links to the site guide and the developer docs, which the Worker serves', () => {
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav.help a')].map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Site guide', '/guide/'],
      ['Developer docs', '/docs/frontend/'],
      ['Privacy policy', '/privacy'],
    ]);
  });
});
