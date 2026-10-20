import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ShowPasswordComponent } from './show-password.component';

@Component({
  imports: [ShowPasswordComponent],
  template: `<input id="secret" type="password" value="echo-of-light" /><cdt-show-password for="secret" />`,
})
class HostComponent {}

describe('ShowPasswordComponent', () => {
  async function render() {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    document.body.appendChild(page);
    return {
      fixture,
      input: page.querySelector('#secret') as HTMLInputElement,
      button: page.querySelector('button') as HTMLButtonElement,
    };
  }

  it('is a button named for showing the password, controlling the field', async () => {
    const { button } = await render();

    expect(button.type).toBe('button');
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe('Show password');
    expect(button.getAttribute('aria-controls')).toBe('secret');
  });

  it('shows the password, then hides it again', async () => {
    const { fixture, input, button } = await render();

    button.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(button.textContent?.replace(/\s+/g, ' ').trim()).toBe('Hide password');

    button.click();
    await fixture.whenStable();
    expect(input.type).toBe('password');
    expect(input.value).toBe('echo-of-light');
  });
});
