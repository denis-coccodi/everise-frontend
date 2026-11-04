import type { Cell, Workbook, Worksheet } from 'exceljs';
import type { PlanSheet, SheetRole, SheetRow } from './plan-sheet.model';
import { withCellPictures } from './workbook-pictures';
import type { CellPicture } from './workbook-pictures.model';
import { pullClock } from './pull-time';
import { DAMAGE_NAMES, KIND_NAMES } from './severity-names';

// The players' header colours by role, as raid groups' sheets have them.
const ROLE_FILLS: Record<SheetRole, { head: string }> = {
  tank: { head: 'FF3C78D8' },
  healer: { head: 'FF38761D' },
  dps: { head: 'FFCC0000' },
};
const WHITE = 'FFFFFFFF';
const BLACK = 'FF000000';
// The job icons' row, and the time and attack of a row past a wipe's log.
const ICON_ROW = 'FF666666';
const COMPLETED = 'FF666666';
// A player's columns: an icon, then its skill, for each skill they use at
// once. The columns before the players': time, attack, type, damage type, damage.
const FIXED = ['Time', 'Mechanic', 'Type', 'Damage type', 'Unmitigated'];
const FIXED_WIDTHS = [7, 24, 12, 13, 13];
// Square icons: a row's height in points, an icon column's width in
// characters, about as wide.
const SKILL_WIDTH = 22;
const ICON_WIDTH = 5.7;
// The body: white with a light grid, as the community sheets have it,
// greyed past a wipe's log; a line in the role's colour between players.
const GRID = 'FFD9D9D9';
const COMPLETED_CELL = 'FFF3F3F3';
const FONT = 'Arial';
const ROW_HEIGHT = 30;
const JOB_ROW_HEIGHT = 58;
// The name a job's icon goes by on the lists sheet.
const jobKey = (job: string) => `Job: ${job}`;
const LISTS = 'Skills';
// The lists sheet's file, the second exceljs writes.
const LISTS_PATH = 'xl/worksheets/sheet2.xml';

// A game icon's address at XIVAPI, which the sheet's IMAGE formulas load:
// the icon's folder is its id to the thousand, both six digits.
export function iconUrl(icon: number): string {
  const six = (n: number) => String(n).padStart(6, '0');
  return `https://v2.xivapi.com/api/asset?path=ui/icon/${six(Math.floor(icon / 1000) * 1000)}/${six(icon)}_hr1.tex&format=png`;
}

// The plan as an Excel workbook (.xlsx), like a raid group's mitigation
// sheet: a row per attack, each player's skills in cells with a dropdown of
// their job's mitigations, shields and heals, each after its icon, coloured
// by role. The icon follows the pick: in Excel 365, the picture (from
// `pictures`, the icons' PNGs by id) placed in the lists sheet's cell
// beside the skill, offline; elsewhere (Google Sheets), XIVAPI's through
// IMAGE; in older Excel, none.
export async function planWorkbook(
  sheet: PlanSheet,
  title: string,
  pictures: Map<number, Uint8Array> = new Map(),
): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const book: Workbook = new ExcelJS.Workbook();
  book.creator = 'Everise fight planner';
  const plan = book.addWorksheet('Plan', { views: [{ state: 'frozen', xSplit: 2, ySplit: 2, showGridLines: false }] });
  const lists = book.addWorksheet(LISTS, { state: 'hidden' });
  const { listOf, count, placed } = writeLists(lists, sheet, pictures);

  FIXED_WIDTHS.forEach((w, i) => (plan.getColumn(i + 1).width = w));
  // The header: the fixed columns' names over both rows, each player's job
  // and name over their columns, and their job's icon under it.
  const head = plan.getRow(1);
  FIXED.forEach((name, i) => {
    plan.mergeCells(1, i + 1, 2, i + 1);
    style(head.getCell(i + 1), name, { bold: true, fill: BLACK, color: WHITE, center: true });
  });
  // Each player's first column, then a skill and an icon column per slot.
  const starts: number[] = [];
  let next = FIXED.length + 1;
  for (const p of sheet.players) {
    starts.push(next);
    const fill = ROLE_FILLS[p.role];
    for (let s = 0; s < p.slots; s++) {
      plan.getColumn(next + 2 * s).width = ICON_WIDTH;
      plan.getColumn(next + 2 * s + 1).width = SKILL_WIDTH;
    }
    const last = next + 2 * p.slots - 1;
    if (last > next) {
      plan.mergeCells(1, next, 1, last);
      plan.mergeCells(2, next, 2, last);
    }
    style(head.getCell(next), `${p.job ?? ''} ${p.name}`.trim(), {
      bold: true,
      fill: fill.head,
      color: WHITE,
      center: true,
    });
    const icon = plan.getCell(2, next);
    if (p.job) icon.value = { formula: iconFormula(`"${jobKey(p.job)}"`, count), date1904: false };
    style(icon, null, { fill: ICON_ROW, center: true });
    next = last + 1;
  }
  head.height = ROW_HEIGHT;
  plan.getRow(2).height = JOB_ROW_HEIGHT;

  let r = 3;
  for (const row of sheet.rows) {
    if (row.completed && sheet.completedFrom !== null && !sheet.rows[sheet.rows.indexOf(row) - 1]?.completed) {
      plan.mergeCells(r, 1, r, next - 1);
      style(plan.getCell(r, 1), `From ${pullClock(sheet.completedFrom)}: the rest of the fight, from a kill.`, {
        bold: true,
        fill: COMPLETED,
        color: WHITE,
      });
      r++;
    }
    writeRow(plan, r, row, sheet, starts, listOf, count);
    r++;
  }
  book.title = title;
  book.calcProperties.fullCalcOnLoad = true;
  const xlsx = (await book.xlsx.writeBuffer()) as ArrayBuffer;
  return withCellPictures(xlsx, LISTS_PATH, placed);
}

function writeRow(
  plan: Worksheet,
  r: number,
  row: SheetRow,
  sheet: PlanSheet,
  starts: number[],
  listOf: (player: number) => string,
  count: number,
) {
  const line = plan.getRow(r);
  line.height = ROW_HEIGHT;
  // Time and attack white on black (grey past a wipe's log), as raid
  // groups' sheets have them; the rest centred.
  const dark = row.completed ? COMPLETED : BLACK;
  const fixed = [
    pullClock(row.at),
    row.wipe ? `${row.mechanic} (enrage)` : row.mechanic,
    KIND_NAMES[row.kind],
    row.damageType ? DAMAGE_NAMES[row.damageType] : '',
    row.damage ?? '',
  ];
  fixed.forEach((value, i) =>
    style(
      line.getCell(i + 1),
      value,
      i < 2
        ? { bold: true, fill: dark, color: WHITE, center: true }
        : { italic: row.completed, center: i < 4, grid: true, fill: row.completed ? COMPLETED_CELL : undefined },
    ),
  );
  line.getCell(FIXED.length).numFmt = '#,##0';
  sheet.players.forEach((p, i) => {
    const fill = row.completed ? COMPLETED_CELL : undefined;
    for (let s = 0; s < p.slots; s++) {
      const icon = line.getCell(starts[i] + 2 * s);
      const skill = line.getCell(starts[i] + 2 * s + 1);
      style(skill, row.cells[i][s]?.name ?? '', { fill, grid: true });
      // A long name ("Eukrasian Prognosis II") shrinks to fit.
      skill.alignment = { ...skill.alignment, indent: 1, shrinkToFit: true };
      skill.dataValidation = { type: 'list', allowBlank: true, formulae: [listOf(i)] };
      // The icon of whatever the cell holds: picked from the list, it follows.
      icon.value = { formula: iconFormula(skill.address, count), date1904: false };
      style(icon, null, { fill, center: true, grid: true });
      // An icon and its skill as one cell; a line between players.
      icon.border = { ...icon.border, right: undefined };
      skill.border = { ...skill.border, left: undefined };
      if (s === 0)
        icon.border = { ...icon.border, left: { style: 'medium', color: { argb: ROLE_FILLS[p.role].head } } };
    }
  });
}

// The icon of the skill (or job) `skill` names (a cell, or a quoted key):
// the picture beside it on the lists sheet, else XIVAPI's, else nothing
// (and nothing for no skill).
function iconFormula(skill: string, count: number) {
  const [names, placed] = ['A', 'C'].map((c) => `${LISTS}!$${c}$1:$${c}$${count}`);
  const image = `IFERROR(_xlfn.IMAGE(VLOOKUP(${skill},${LISTS}!$A$1:$B$${count},2,FALSE)),"")`;
  return `IF(${skill}="","",IFERROR(_xlfn.XLOOKUP(${skill},${names},${placed}),${image}))`;
}

// The hidden sheet behind the dropdowns and icons: every skill's (and job's) name, icon
// address and picture (A, B and C, for the lookups; #N/A where there's no
// picture), and a column per player of what their cells offer. Answers each
// player's list as a range, how many skills there are, and the pictures to
// place.
function writeLists(lists: Worksheet, sheet: PlanSheet, pictures: Map<number, Uint8Array>) {
  const jobs = sheet.players.flatMap((p) => (p.job ? [{ name: jobKey(p.job), icon: p.jobIcon }] : []));
  const icons = new Map([...sheet.players.flatMap((p) => p.choices), ...jobs].map((s) => [s.name, s.icon]));
  const placed: CellPicture[] = [];
  [...icons].forEach(([name, icon], i) => {
    lists.getCell(i + 1, 1).value = name;
    lists.getCell(i + 1, 2).value = icon === null ? '' : iconUrl(icon);
    const png = icon === null ? undefined : pictures.get(icon);
    const cell = lists.getCell(i + 1, 3);
    // A placeholder the picture replaces.
    cell.value = png ? 0 : { formula: 'NA()', date1904: false };
    if (png) placed.push({ cell: cell.address, png });
  });
  const ranges = sheet.players.map((p, i) => {
    const column = lists.getColumn(i + 4);
    p.choices.forEach((s, j) => (lists.getCell(j + 1, column.number).value = s.name));
    return `${LISTS}!$${column.letter}$1:$${column.letter}$${Math.max(1, p.choices.length)}`;
  });
  return { listOf: (player: number) => ranges[player], count: Math.max(1, icons.size), placed };
}

interface Look {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fill?: string;
  center?: boolean;
  grid?: boolean;
}

function style(cell: Cell, value: string | number | null, look: Look) {
  if (value !== null) cell.value = value;
  cell.font = {
    name: FONT,
    size: 10,
    bold: !!look.bold,
    italic: !!look.italic,
    ...(look.color ? { color: { argb: look.color } } : {}),
  };
  if (look.grid) {
    const line = { style: 'thin' as const, color: { argb: GRID } };
    cell.border = { top: line, bottom: line, left: line, right: line };
  }
  if (look.fill)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: look.fill }, bgColor: { argb: look.fill } };
  cell.alignment = { vertical: 'middle', ...(look.center ? { horizontal: 'center' } : {}) };
}
