import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SquareCrop } from './crop-geometry';
import { ImageCropperComponent } from './image-cropper.component';

@Component({
  imports: [ImageCropperComponent],
  template: `<cdt-image-cropper src="picture.png" [(crop)]="crop" (loaded)="loaded.set($event)" />`,
})
class HostComponent {
  readonly crop = signal<SquareCrop | null>(null);
  readonly loaded = signal<HTMLImageElement | null>(null);
}

describe('ImageCropperComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let page: HTMLElement;

  // jsdom doesn't load images: give the picture a size (800 × 600, shown
  // 400 px wide) and fire its load event.
  async function loadPicture() {
    const img = page.querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 800 });
    Object.defineProperty(img, 'naturalHeight', { value: 600 });
    Object.defineProperty(img, 'clientWidth', { value: 400 });
    img.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    return img;
  }

  const selection = () => page.querySelector('.selection') as HTMLElement;
  const pointer = (target: Element, type: string, x: number, y: number) =>
    target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }) as PointerEvent);

  beforeEach(async () => {
    // jsdom has no PointerEvent; mouse events carry the same coordinates.
    globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('starts on the largest square in the middle, and hands over the image', async () => {
    const img = await loadPicture();

    expect(fixture.componentInstance.crop()).toEqual({ x: 100, y: 0, size: 600 });
    expect(fixture.componentInstance.loaded()).toBe(img);
    // Positioned in percentages of the shown picture.
    expect(selection().style.left).toBe('12.5%');
    expect(selection().style.width).toBe('75%');
    expect(selection().style.height).toBe('100%');
  });

  it('moves with a drag, converting screen pixels to picture pixels', async () => {
    await loadPicture();
    fixture.componentInstance.crop.set({ x: 100, y: 100, size: 200 });
    await fixture.whenStable();

    pointer(selection(), 'pointerdown', 50, 50);
    pointer(selection(), 'pointermove', 60, 40);
    pointer(selection(), 'pointerup', 60, 40);

    // 10 screen pixels are 20 picture pixels at half size.
    expect(fixture.componentInstance.crop()).toEqual({ x: 120, y: 80, size: 200 });
  });

  it('resizes from the corner handle', async () => {
    await loadPicture();
    fixture.componentInstance.crop.set({ x: 100, y: 100, size: 200 });
    await fixture.whenStable();
    const handle = page.querySelector('.handle') as HTMLElement;

    pointer(handle, 'pointerdown', 100, 100);
    pointer(handle, 'pointermove', 125, 110);
    pointer(handle, 'pointerup', 125, 110);

    expect(fixture.componentInstance.crop()).toEqual({ x: 100, y: 100, size: 250 });
  });

  it('moves with the arrow keys and resizes with + and −', async () => {
    await loadPicture();
    fixture.componentInstance.crop.set({ x: 100, y: 100, size: 200 });
    await fixture.whenStable();
    const key = (key: string, shiftKey = false) =>
      selection().dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));

    // A step is 2% of the shorter side (600): 12 pixels; 60 with Shift.
    key('ArrowRight');
    expect(fixture.componentInstance.crop()).toEqual({ x: 112, y: 100, size: 200 });
    key('ArrowDown', true);
    expect(fixture.componentInstance.crop()).toEqual({ x: 112, y: 160, size: 200 });
    key('+');
    expect(fixture.componentInstance.crop()).toEqual({ x: 106, y: 154, size: 212 });
  });

  it('resizes with the size slider', async () => {
    await loadPicture();
    const slider = page.querySelector('input[type=range]') as HTMLInputElement;
    expect([slider.min, slider.max]).toEqual(['32', '600']);

    slider.value = '300';
    slider.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.crop()).toEqual({ x: 250, y: 150, size: 300 });
  });
});
