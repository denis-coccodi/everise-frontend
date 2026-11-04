import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { PlanSheet } from './plan-sheet.model';
import { iconUrl, planWorkbook } from './plan-workbook';

const sheet: PlanSheet = {
  players: [
    {
      id: 1,
      name: 'Tank Main',
      job: 'PLD',
      role: 'tank',
      slots: 2,
      choices: [
        { name: 'Rampart', icon: 2573 },
        { name: 'Reprisal', icon: 806 },
      ],
    },
    { id: 2, name: 'Heal Main', job: 'SCH', role: 'healer', slots: 1, choices: [{ name: 'Adloquium', icon: 2801 }] },
  ],
  rows: [
    {
      at: 65_000,
      mechanic: 'Killer Voice',
      kind: 'raidwide',
      damageType: 'magic',
      damage: 100_000,
      wipe: false,
      completed: false,
      cells: [[{ name: 'Rampart', icon: 2573 }], [{ name: 'Adloquium', icon: 2801 }]],
    },
    {
      at: 150_000,
      mechanic: 'Killer Voice',
      kind: 'raidwide',
      damageType: 'magic',
      damage: 100_000,
      wipe: false,
      completed: true,
      cells: [[], []],
    },
  ],
  completedFrom: 100_000,
};

async function opened() {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await planWorkbook(sheet, 'M9S, pull 3'));
  return book;
}

describe('iconUrl', () => {
  it('points at the icon’s large PNG at XIVAPI', () => {
    expect(iconUrl(2573)).toBe('https://v2.xivapi.com/api/asset?path=ui/icon/002000/002573_hr1.tex&format=png');
  });
});

describe('planWorkbook', () => {
  it('has a row per attack and a column pair per skill slot: the icon, then its skill', async () => {
    const plan = (await opened()).getWorksheet('Plan')!;

    expect(plan.getRow(1).values).toEqual([
      undefined,
      'Time',
      'Mechanic',
      'Type',
      'Damage type',
      'Unmitigated',
      'PLD Tank Main',
      'PLD Tank Main',
      'PLD Tank Main',
      'PLD Tank Main',
      'SCH Heal Main',
      'SCH Heal Main',
    ]);
    expect(['A2', 'B2', 'C2', 'D2', 'E2', 'G2', 'K2'].map((a) => plan.getCell(a).value)).toEqual([
      '1:05',
      'Killer Voice',
      'Raidwide',
      'Magic',
      100_000,
      'Rampart',
      'Adloquium',
    ]);
    // The picture beside the skill on the lists sheet, else XIVAPI's.
    expect(plan.getCell('F2').formula).toBe(
      'IF(G2="","",IFERROR(_xlfn.XLOOKUP(G2,Skills!$A$1:$A$3,Skills!$C$1:$C$3),' +
        'IFERROR(_xlfn.IMAGE(VLOOKUP(G2,Skills!$A$1:$B$3,2,FALSE)),"")))',
    );
  });

  it('places the icons it has as pictures in the lists sheet’s cells, #N/A for the others', async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const data = await planWorkbook(sheet, 'M9S, pull 3', new Map([[2573, png]]));
    const zip = await JSZip.loadAsync(data);
    const text = (path: string) => zip.file(path)?.async('string') ?? Promise.resolve('');

    // Rampart (C1) placed; Reprisal and Adloquium without one.
    const lists = await text('xl/worksheets/sheet2.xml');
    expect(lists).toContain('<c r="C1" t="e" vm="1"><v>#VALUE!</v></c>');
    expect(lists).toMatch(/<c r="C2"[^>]*><f>NA\(\)<\/f>/);
    expect(await zip.file('xl/media/cell-picture-1.png')?.async('uint8array')).toEqual(png);
    expect(await text('xl/richData/_rels/richValueRel.xml.rels')).toContain('Target="../media/cell-picture-1.png"');
    expect(await text('xl/metadata.xml')).toContain('<valueMetadata count="1"><bk><rc t="1" v="0"/></bk>');
    expect(await text('[Content_Types].xml')).toContain('PartName="/xl/richData/rdrichvalue.xml"');
    expect(await text('xl/_rels/workbook.xml.rels')).toContain('Target="richData/richValueRel.xml"');
    expect(await text('xl/workbook.xml')).toContain('fullCalcOnLoad="1"');
  });

  it('offers each player’s skills in a dropdown, from a hidden sheet with their icons', async () => {
    const book = await opened();
    const [plan, lists] = [book.getWorksheet('Plan')!, book.getWorksheet('Skills')!];

    expect(plan.getCell('I2').dataValidation).toMatchObject({ type: 'list', formulae: ['Skills!$D$1:$D$2'] });
    expect(plan.getCell('K2').dataValidation).toMatchObject({ type: 'list', formulae: ['Skills!$E$1:$E$1'] });
    expect(lists.state).toBe('hidden');
    expect([lists.getCell('A1').value, lists.getCell('B1').value]).toEqual(['Rampart', iconUrl(2573)]);
  });

  it('colours by role and heads the rows past a wipe’s log', async () => {
    const plan = (await opened()).getWorksheet('Plan')!;

    expect(plan.getCell('F1').fill).toMatchObject({ fgColor: { argb: 'FF3C78D8' } });
    expect(plan.getCell('K2').fill).toMatchObject({ fgColor: { argb: 'FFD9EAD3' }, bgColor: { argb: 'FFD9EAD3' } });
    expect(plan.getCell('A3').value).toBe('From 1:40: the rest of the fight, from a kill.');
    expect(plan.getCell('B4').font).toMatchObject({ italic: true });
  });
});
