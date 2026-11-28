// Whether a planner section that folds away (the timeline, the HP chart, the
// deaths) was left open, as the browser keeps it under `key`: open unless
// left closed.
export function readFold(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'closed';
  } catch {
    return true;
  }
}

export function saveFold(key: string, open: boolean) {
  try {
    localStorage.setItem(key, open ? 'open' : 'closed');
  } catch {
    // Not kept (a private window): it's open again next time.
  }
}
