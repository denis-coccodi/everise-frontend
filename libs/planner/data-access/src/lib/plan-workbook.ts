import type { Cell, Workbook, Worksheet } from 'exceljs';
import type { PlanSheet, SheetRole, SheetRow } from './plan-sheet.model';
import { withCellPictures } from './workbook-pictures';
import type { CellPicture } from './workbook-pictures.model';
import { pullClock } from './pull-time';
import { DAMAGE_NAMES, KIND_NAMES } from './severity-names';

// Fills by role, as raid groups' sheets have them: the header, then the cells.
const ROLE_FILLS: Record<SheetRole, { head: string; cell: string }> = {
  tank: { head: 'FF3C78D8', cell: 'FFC9DAF8' },
  healer: { head: 'FF38761D', cell: 'FFD9EAD3' },
  dps: { head: 'FFCC0000', cell: 'FFF4CCCC' },
};
const HEAD_TEXT = 'FFFFFFFF';
const COMPLETED_TEXT = 'FF666666';
// A player's columns: an icon, then its skill, for each skill they use at
// once. The columns before the players': time, attack, type, damage type, damage.
const FIXED = ['Time', 'Mechanic', 'Type', 'Damage type', 'Unmitigated'];
const FIXED_WIDTHS = [7, 24, 12, 12, 12];
const SKILL_WIDTH = 20;
const ICON_WIDTH = 5;
const ROW_HEIGHT = 24;
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
  const plan = book.addWorksheet('Plan', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
  const lists = book.addWorksheet(LISTS, { state: 'hidden' });
  const { listOf, count, placed } = writeLists(lists, sheet, pictures);

  FIXED_WIDTHS.forEach((w, i) => (plan.getColumn(i + 1).width = w));
  const head = plan.getRow(1);
  FIXED.forEach((name, i) => style(head.getCell(i + 1), name, { bold: true }));
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
    if (last > next) plan.mergeCells(1, next, 1, last);
    style(head.getCell(next), `${p.job ?? ''} ${p.name}`.trim(), { bold: true, fill: fill.head, color: HEAD_TEXT });
    next = last + 1;
  }
  head.height = ROW_HEIGHT;

  let r = 2;
  for (const row of sheet.rows) {
    if (row.completed && sheet.completedFrom !== null && !sheet.rows[sheet.rows.indexOf(row) - 1]?.completed) {
      plan.mergeCells(r, 1, r, next - 1);
      style(plan.getCell(r, 1), `From ${pullClock(sheet.completedFrom)}: the rest of the fight, from a kill.`, {
        bold: true,
        color: COMPLETED_TEXT,
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
  const text = { italic: row.completed, color: row.completed ? COMPLETED_TEXT : undefined };
  const fixed = [
    pullClock(row.at),
    row.wipe ? `${row.mechanic} (enrage)` : row.mechanic,
    KIND_NAMES[row.kind],
    row.damageType ? DAMAGE_NAMES[row.damageType] : '',
    row.damage ?? '',
  ];
  fixed.forEach((value, i) => style(line.getCell(i + 1), value, { ...text, bold: i === 1 }));
  line.getCell(FIXED.length).numFmt = '#,##0';
  sheet.players.forEach((p, i) => {
    const fill = ROLE_FILLS[p.role].cell;
    for (let s = 0; s < p.slots; s++) {
      const icon = line.getCell(starts[i] + 2 * s);
      const skill = line.getCell(starts[i] + 2 * s + 1);
      style(skill, row.cells[i][s]?.name ?? '', { fill });
      // A line between players.
      if (s === 0) icon.border = { left: { style: 'thin', color: { argb: ROLE_FILLS[p.role].head } } };
      skill.dataValidation = { type: 'list', allowBlank: true, formulae: [listOf(i)] };
      // The icon of whatever the cell holds: picked from the list, it follows.
      icon.value = { formula: iconFormula(skill.address, count), date1904: false };
      style(icon, null, { fill });
    }
  });
}

// The icon of the skill in `skill`: the picture beside it on the lists
// sheet, else XIVAPI's, else nothing (and nothing for no skill).
function iconFormula(skill: string, count: number) {
  const [names, placed] = ['A', 'C'].map((c) => `${LISTS}!$${c}$1:$${c}$${count}`);
  const image = `IFERROR(_xlfn.IMAGE(VLOOKUP(${skill},${LISTS}!$A$1:$B$${count},2,FALSE)),"")`;
  return `IF(${skill}="","",IFERROR(_xlfn.XLOOKUP(${skill},${names},${placed}),${image}))`;
}

// The hidden sheet behind the dropdowns and icons: every skill's name, icon
// address and picture (A, B and C, for the lookups; #N/A where there's no
// picture), and a column per player of what their cells offer. Answers each
// player's list as a range, how many skills there are, and the pictures to
// place.
function writeLists(lists: Worksheet, sheet: PlanSheet, pictures: Map<number, Uint8Array>) {
  const icons = new Map(sheet.players.flatMap((p) => p.choices).map((s) => [s.name, s.icon]));
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
}

function style(cell: Cell, value: string | number | null, look: Look) {
  if (value !== null) cell.value = value;
  cell.font = { bold: !!look.bold, italic: !!look.italic, ...(look.color ? { color: { argb: look.color } } : {}) };
  if (look.fill)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: look.fill }, bgColor: { argb: look.fill } };
  cell.alignment = { vertical: 'middle' };
}
