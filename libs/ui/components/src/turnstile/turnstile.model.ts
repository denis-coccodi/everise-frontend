// The parts of Turnstile's script the component uses.
export interface TurnstileOptions {
  sitekey: string;
  action: string;
  theme: 'light' | 'dark';
  size: 'flexible' | 'compact';
  language: 'auto';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
