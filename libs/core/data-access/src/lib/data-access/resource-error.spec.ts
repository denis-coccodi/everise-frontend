import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { errorMessageOf } from './resource-error';

describe('errorMessageOf', () => {
  async function settled<T>(loader: () => Promise<T>) {
    const loaded = TestBed.runInInjectionContext(() => resource({ loader }));
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    return loaded;
  }

  it('says nothing once there is an answer', async () => {
    const loaded = await settled(async () => ['Odin']);

    expect(errorMessageOf(loaded)).toBe('');
  });

  it("says why the load failed, in the backend's words", async () => {
    const loaded = await settled(() =>
      Promise.reject(new HttpErrorResponse({ status: 503, error: { errors: { body: ['Try again later.'] } } })),
    );

    expect(errorMessageOf(loaded)).toBe('Try again later.');
  });
});
