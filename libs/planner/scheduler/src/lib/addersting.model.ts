// A cast that counts for a sage's Addersting (`addersting.ts`).
export interface StingCast {
  action: number;
  at: number;
  target: number | null;
  // The plan's own: a Toxikon of theirs as played gives way to them.
  own: boolean;
}
