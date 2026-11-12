// The Edges of Shadow a Dark Knight's MP pays for with the plan on top of
// those as played: the MP a Blackest Night that breaks gives back (Dark
// Arts) and what the plan saves go to damage, never sit there. Each goes at
// the earliest moment it fits (`fits`: one more there, with those before,
// never runs their MP out later nor drops an Edge as played), so none is
// wasted on MP already full. Their times.
export function spareEdges(points: { at: number; mp: number }[], fits: (at: number[]) => boolean): number[] {
  const added: number[] = [];
  for (const at of new Set(points.map((p) => p.at))) if (fits([...added, at].sort((a, b) => a - b))) added.push(at);
  return added;
}
