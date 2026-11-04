import type { PlanSheet } from './plan-sheet.model';

// The PNGs of the icons a sheet's skills have, by icon id, for the
// workbook to place in its cells: from the API's icon address (XIVAPI's,
// cached at the edge), all at once. One that fails is left out: its cell
// falls back to XIVAPI's address.
export async function sheetIcons(
  apiUrl: string,
  sheet: PlanSheet,
  get: typeof fetch = (input, init) => fetch(input, init),
): Promise<Map<number, Uint8Array>> {
  const ids = [...new Set(sheet.players.flatMap((p) => p.choices.map((s) => s.icon)))].filter(
    (id): id is number => id !== null,
  );
  const fetched = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await get(`${apiUrl}/market/icons/${id}`);
        return response.ok ? ([id, new Uint8Array(await response.arrayBuffer())] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return new Map(fetched.filter((f) => f !== null));
}
