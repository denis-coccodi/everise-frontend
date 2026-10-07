import { RouletteSettings } from './roulette-engine';

const SETTINGS_KEY = 'everise-roulette-settings';

// The Duty Finder settings are a per-browser convenience; storage can be
// unavailable (private windows, blocked site data), and the page works the
// same without it.
export function loadSettings(): unknown {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: RouletteSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not saved.
  }
}
