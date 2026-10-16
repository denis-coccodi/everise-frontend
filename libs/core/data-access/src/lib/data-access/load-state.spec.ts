import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { errorMessageOf, loadStateOf } from './load-state';

describe('loadStateOf and errorMessageOf', () => {
  async function settled<T>(loader: () => Promise<T>) {
    const loaded = TestBed.runInInjectionContext(() => resource({ loader }));
    expect(loadStateOf(loaded)).toBe('loading');
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    return loaded;
  }

  it('is ready once there is an answer, with nothing to say', async () => {
    const loaded = await settled(async () => ['Odin']);

    expect(loadStateOf(loaded)).toBe('ready');
    expect(errorMessageOf(loaded)).toBe('');
  });

  it("is an error when the load failed, in the backend's words", async () => {
    const loaded = await settled(() =>
      Promise.reject(new HttpErrorResponse({ status: 503, error: { errors: { body: ['Try again later.'] } } })),
    );

    expect(loadStateOf(loaded)).toBe('error');
    expect(errorMessageOf(loaded)).toBe('Try again later.');
  });
});
