import { TestBed } from '@angular/core/testing';
import { Injector, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { sameAs } from './same-as';

describe('sameAs', () => {
  function passwords(password: string, repeat: string) {
    const model = signal({ password, repeat });
    return TestBed.runInInjectionContext(() =>
      form(model, (path) => sameAs(path.repeat, path.password), { injector: TestBed.inject(Injector) }),
    );
  }

  it('is an error while the repeat differs', () => {
    expect(passwords('crystal-1', 'crystal-2').repeat().errors()).toEqual([
      expect.objectContaining({ kind: 'sameAs' }),
    ]);
  });

  it('passes when they match, or while the repeat is empty', () => {
    expect(passwords('crystal-1', 'crystal-1').repeat().errors()).toEqual([]);
    expect(passwords('crystal-1', '').repeat().errors()).toEqual([]);
  });
});
