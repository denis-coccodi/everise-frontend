// Where to go back to after signing in, e.g. the post a Discord link
// pointed to. Kept in this tab (sessionStorage), so it survives a provider
// sign-in's round trip; taken once.
const KEY = 'returnUrl';

export function rememberReturnUrl(url: string) {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    // Storage blocked: the member lands on the home page instead.
  }
}

export function takeReturnUrl(): string | null {
  try {
    const url = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    // Only the site's own pages.
    return url && url.startsWith('/') && !url.startsWith('//') ? url : null;
  } catch {
    return null;
  }
}
