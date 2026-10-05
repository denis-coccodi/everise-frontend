import { TestBed } from '@angular/core/testing';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  afterEach(() => {
    localStorage.clear();
    document.body.classList.remove('light');
  });

  it("starts dark, or in this browser's last mode", () => {
    expect(TestBed.inject(SettingsStore).darkMode()).toBe(true);

    TestBed.resetTestingModule();
    localStorage.setItem('darkMode', 'false');
    expect(TestBed.inject(SettingsStore).darkMode()).toBe(false);
  });

  it('shows a mode on the page and remembers it in this browser', () => {
    const store = TestBed.inject(SettingsStore);

    store.setDarkMode(false);
    TestBed.tick();
    expect(document.body.classList).toContain('light');
    expect(localStorage.getItem('darkMode')).toBe('false');

    store.setDarkMode(true);
    TestBed.tick();
    expect(document.body.classList).not.toContain('light');
    expect(localStorage.getItem('darkMode')).toBe('true');
  });
});
