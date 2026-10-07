import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BylineComponent } from './byline.component';

@Component({
  imports: [BylineComponent],
  template: `
    <cdt-byline
      id="linked"
      image="/a.png"
      name="Thancred"
      date="2026-10-04T10:00:00Z"
      [link]="['/profile', 'Thancred']"
      avatarTestId="article-author"
    />
    <cdt-byline id="plain" image="/b.png" date="2026-10-04T10:00:00Z" />
  `,
})
class HostComponent {}

describe('BylineComponent', () => {
  it('shows the avatar, name and date, linking them to the profile when given a link', async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;

    expect(el('#linked [data-testid=article-author]').getAttribute('href')).toBe('/profile/Thancred');
    expect(el('#linked .avatar img').getAttribute('src')).toBe('/a.png');
    // The name link is the one to use; the avatar's would repeat it.
    expect(el('#linked .avatar-link').getAttribute('tabindex')).toBe('-1');
    expect(el('#linked .avatar-link').getAttribute('aria-hidden')).toBe('true');
    expect(el('#linked a.author').textContent?.trim()).toBe('Thancred');
    expect(el('#linked .date').textContent?.trim()).toBe('October 4, 2026');

    expect(el('#plain a')).toBeNull();
    expect(el('#plain .author')).toBeNull();
    expect(el('#plain .avatar img').getAttribute('src')).toBe('/b.png');
  });
});
