import { DOCUMENT, effect, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { SettingsState, settingsInitialState } from './models/settings.model';

// The theme is dark by default; Dark Mode off switches to the light theme
// (body.light in apps/everise/src/styles.scss). Only an explicit "false" in
// storage turns it off.
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
    _darkModeStatusInit: () => {
      patchState(store, { darkMode: storedDarkMode() });
    },
    toggleDarkModeStatus: () => {
      const darkMode = !store.darkMode();
      try {
        localStorage.setItem(DARK_MODE_KEY, String(darkMode));
      } catch {
        // Not remembered; the toggle still applies to this visit.
      }
      patchState(store, { darkMode });
    },
  })),
  withHooks({
    onInit: (store) => {
      const document = inject(DOCUMENT);
      store._darkModeStatusInit();

      effect(() => {
        document.body.classList.toggle('light', !store.darkMode());
      });
    },
  }),
);
