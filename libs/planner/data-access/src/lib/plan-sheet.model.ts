// A plan laid out like a raid group's mitigation sheet: a row per boss
// attack, a column group per player with what they use for it.

// A skill as the sheet shows it: its name, and its icon (the game's id).
export interface SheetSkill {
  name: string;
  icon: number | null;
}

export type SheetRole = 'tank' | 'healer' | 'dps';

export interface SheetPlayer {
  id: number;
  name: string;
  job: string | null;
  // Their job's icon (the game's id), for the sheet's header.
  jobIcon: number | null;
  role: SheetRole;
  // How many skills a row of theirs can hold (the most they use for one
  // attack), at least 1.
  slots: number;
  // What their cells offer to pick from: their mitigations, shields and
  // heals at the pull's level, by name.
  choices: SheetSkill[];
}

export interface SheetRow {
  at: number;
  mechanic: string;
  kind: 'raidwide' | 'tankbuster' | 'targeted';
  damageType: 'physical' | 'magic' | 'unique' | null;
  // The usual damage of a hit before mitigation (the median), when known.
  damage: number | null;
  // An enrage, or a hit that may be one: nothing saves anyone.
  wipe: boolean;
  // Past a wipe's end, taken from the kill completing it.
  completed: boolean;
  // Each player's skills for it, in the players' order.
  cells: SheetSkill[][];
}

export interface PlanSheet {
  players: SheetPlayer[];
  rows: SheetRow[];
  // Where a completed wipe's log ends (its rows after are completed).
  completedFrom: number | null;
  // Where an Ultimate's phases begin, as FFLogs names them ("P2: Usurper
  // of Frost"); none for other fights.
  phases: SheetPhase[];
}

export interface SheetPhase {
  at: number;
  name: string;
}
