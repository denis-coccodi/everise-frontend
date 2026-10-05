import { DOCUMENT, effect, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { SettingsState, settingsInitialState } from './models/settings.model';

// The theme is dark by default; Dark Mode off switches to the light theme
// (body.light, see the theme's tokens). A signed-in user's choice is saved
// with their settings on the backend, and the app applies it when the user
// loads (app.component.ts). This browser keeps a copy, so the page starts in
// the right mode before the user has loaded, and guests keep their choice
// here. Only an explicit "false" in storage means light.
const DARK_MODE_KEY = 'darkMode';

function storedDarkMode(): boolean {
  try {
    return localStorage.getItem(DARK_MODE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState<SettingsState>(settingsInitialState),
  withMethods((store) => ({
    // Shows the site in this mode and remembers it in this browser.
    setDarkMode: (darkMode: boolean) => {
      try {
        localStorage.setItem(DARK_MODE_KEY, String(darkMode));
      } catch {
        // Not remembered; the mode still applies to this visit.
      }
      patchState(store, { darkMode });
    },
  })),
  withHooks({
    onInit: (store) => {
      const document = inject(DOCUMENT);
      patchState(store, { darkMode: storedDarkMode() });

      effect(() => {
        document.body.classList.toggle('light', !store.darkMode());
      });
    },
  }),
);
