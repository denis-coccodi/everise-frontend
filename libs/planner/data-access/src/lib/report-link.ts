import type { ReportLink } from './report-link.model';

// An FFLogs report's code: 16 letters and digits, "a:" first for an
// anonymous report.
const CODE = /^(a:)?[A-Za-z0-9]{16}$/;
// The report (and pull) a pasted FFLogs link or code names: a report's page
// (fflogs.com/reports/<code>, with ?fight=<id> or #fight=<id> for a pull),
// or the code alone. Null when it's neither.
export function readReportLink(text: string): ReportLink | null {
  const trimmed = text.trim();
  if (CODE.test(trimmed)) return { code: trimmed, pull: null };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (!/(^|\.)fflogs\.com$/i.test(url.hostname)) return null;
  const code = /^\/reports\/([^/]+)/.exec(url.pathname)?.[1];
  if (!code || !CODE.test(decodeURIComponent(code))) return null;
  const fight = url.searchParams.get('fight') ?? new URLSearchParams(url.hash.replace(/^#/, '')).get('fight');
  const pull = fight && /^\d+$/.test(fight) ? Number(fight) : null;
  return { code: decodeURIComponent(code), pull };
}
