import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AvatarComponent, AvatarFrame, DEFAULT_AVATAR } from './avatar.component';

@Component({
  imports: [AvatarComponent],
  template: `<cdt-avatar [src]="src()" [size]="48" [alt]="alt()" [frame]="frame()" />`,
})
class HostComponent {
  readonly src = signal<string | undefined>('/minfilia.png');
  readonly alt = signal('');
  readonly frame = signal<AvatarFrame>('none');
}

describe('AvatarComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const host = (fixture.nativeElement as HTMLElement).querySelector('cdt-avatar') as HTMLElement;
    return { fixture, host, img: host.querySelector('img') as HTMLImageElement };
  }

  it('shows the picture at its size, decorative unless told otherwise', async () => {
    const { host, img } = await render();

    expect(img.getAttribute('src')).toBe('/minfilia.png');
    expect(img.getAttribute('width')).toBe('48');
    expect(img.alt).toBe('');
    expect(host.style.getPropertyValue('--avatar-size')).toBe('48px');
  });

  it('shows the default picture without one, and says who it is when asked', async () => {
    const { fixture, host, img } = await render();

    fixture.componentInstance.src.set(undefined);
    fixture.componentInstance.alt.set('Your profile picture');
    fixture.componentInstance.frame.set('highlight');
    await fixture.whenStable();

    expect(img.getAttribute('src')).toBe(DEFAULT_AVATAR);
    expect(img.alt).toBe('Your profile picture');
    expect(host.getAttribute('data-frame')).toBe('highlight');
  });
});
