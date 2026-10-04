import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonComponent, ButtonVariant } from './button.component';

@Component({
  imports: [ButtonComponent],
  template: `
    <button id="default" cdtButton>Go</button>
    <button id="variant" [cdtButton]="variant()" size="sm">Go</button>
    <a id="link" cdtButton="outline-secondary" size="lg">Edit</a>
  `,
})
class HostComponent {
  readonly variant = signal<ButtonVariant>('outline-danger');
}

describe('ButtonComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLElement;
    return { fixture, el };
  }

  it('marks the variant and size on the native button or link', async () => {
    const { el } = await render();
    expect(el('default').dataset).toMatchObject({ variant: 'primary', size: 'md' });
    expect(el('variant').dataset).toMatchObject({ variant: 'outline-danger', size: 'sm' });
    expect(el('link').dataset).toMatchObject({ variant: 'outline-secondary', size: 'lg' });
    expect(el('default').textContent?.trim()).toBe('Go');
  });

  it('gives the call to action and chips no size, and follows a bound variant', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.variant.set('cta');
    await fixture.whenStable();
    expect(el('variant').dataset['variant']).toBe('cta');
    expect(el('variant').hasAttribute('data-size')).toBe(false);
  });
});
