// The Events page keeps the data centre it shows in the query string
// (?dc=chaos), in lower case, so a link brings it along. Without one, it
// shows every data centre's.

// "chaos" (from the address) → "Chaos"; null for every data centre.
export function eventDataCentre(query: { get(name: string): string | null }): string | null {
  const id = query.get('dc')?.trim().toLowerCase() ?? '';
  if (!/^[a-z]+$/.test(id)) return null;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// The query for a data centre's events, or every one's.
export function eventsQuery(dataCentre: string | null) {
  return { dc: dataCentre ? dataCentre.toLowerCase() : null };
}
