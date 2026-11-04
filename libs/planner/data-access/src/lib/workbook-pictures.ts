import type { CellPicture } from './workbook-pictures.model';

// Excel 365's pictures in cells ("Place in Cell"), which exceljs can't
// write: each picture is a rich value (xl/richData) pointing at an image in
// xl/media, and a cell holds one through its value metadata (`vm`). A lookup
// on such cells returns the picture, so a cell can show the one beside the
// skill picked, offline and with nothing to allow.

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RICH = 'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata';
const RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
// What a picture placed in a cell is: a local image, made by the user.
const LOCAL_IMAGE = 5;

const PARTS = {
  metadata: {
    path: 'xl/metadata.xml',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml',
  },
  values: { path: 'xl/richData/rdrichvalue.xml', type: 'application/vnd.ms-excel.rdrichvalue+xml' },
  structures: {
    path: 'xl/richData/rdrichvaluestructure.xml',
    type: 'application/vnd.ms-excel.rdrichvaluestructure+xml',
  },
  types: { path: 'xl/richData/rdRichValueTypes.xml', type: 'application/vnd.ms-excel.rdrichvaluetypes+xml' },
  rels: { path: 'xl/richData/richValueRel.xml', type: 'application/vnd.ms-excel.richvaluerel+xml' },
};
const WORKBOOK_RELS: [string, string][] = [
  [`${OFFICE_RELS}/sheetMetadata`, 'metadata.xml'],
  ['http://schemas.microsoft.com/office/2017/06/relationships/rdRichValue', 'richData/rdrichvalue.xml'],
  [
    'http://schemas.microsoft.com/office/2017/06/relationships/rdRichValueStructure',
    'richData/rdrichvaluestructure.xml',
  ],
  ['http://schemas.microsoft.com/office/2017/06/relationships/rdRichValueTypes', 'richData/rdRichValueTypes.xml'],
  ['http://schemas.microsoft.com/office/2022/10/relationships/richValueRel', 'richData/richValueRel.xml'],
];
// Flags Excel writes for its own keys, the same in every file.
const KEY_FLAGS = [
  ['_Self', ['ExcludeFromFile', 'ExcludeFromCalcComparison']],
  ['_DisplayString', ['ExcludeFromCalcComparison']],
  ['_Flags', ['ExcludeFromCalcComparison']],
  ['_Format', ['ExcludeFromCalcComparison']],
  ['_SubLabel', ['ExcludeFromCalcComparison']],
  ['_Attribution', ['ExcludeFromCalcComparison']],
  ['_Icon', ['ExcludeFromCalcComparison']],
  ['_Display', ['ExcludeFromCalcComparison']],
  ['_CanonicalPropertyNames', ['ExcludeFromCalcComparison']],
  ['_ClassificationId', ['ExcludeFromCalcComparison']],
] as const;

// The workbook (`xlsx`, as exceljs wrote it) with these pictures in these
// cells of the sheet at `sheetPath` (e.g. xl/worksheets/sheet2.xml), which
// must have something in each of them for the picture to replace.
export async function withCellPictures(xlsx: ArrayBuffer, sheetPath: string, pictures: CellPicture[]) {
  if (!pictures.length) return xlsx;
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(xlsx);
  pictures.forEach((p, i) => zip.file(`xl/media/cell-picture-${i + 1}.png`, p.png));
  zip.file(PARTS.metadata.path, metadata(pictures.length));
  zip.file(PARTS.values.path, richValues(pictures.length));
  zip.file(
    PARTS.structures.path,
    `${xml}<rvStructures xmlns="${RICH}" count="1"><s t="_localImage"><k n="_rvRel:LocalImageIdentifier" t="i"/><k n="CalcOrigin" t="i"/></s></rvStructures>`,
  );
  zip.file(PARTS.types.path, valueTypes());
  zip.file(PARTS.rels.path, valueRels(pictures.length));
  zip.file('xl/richData/_rels/richValueRel.xml.rels', imageRels(pictures.length));
  await edit(zip, '[Content_Types].xml', (s) => s.replace('</Types>', `${contentTypes(s)}</Types>`));
  await edit(zip, 'xl/_rels/workbook.xml.rels', (s) =>
    s.replace('</Relationships>', `${workbookRels()}</Relationships>`),
  );
  await edit(zip, sheetPath, (s) =>
    pictures.reduce(
      (sheet, p, i) =>
        sheet.replace(
          new RegExp(`<c r="${p.cell}"[^>]*?(/>|>.*?</c>)`),
          `<c r="${p.cell}" t="e" vm="${i + 1}"><v>#VALUE!</v></c>`,
        ),
      s,
    ),
  );
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const times = (n: number, part: (i: number) => string) => Array.from({ length: n }, (_, i) => part(i)).join('');

async function edit(zip: import('jszip'), path: string, change: (s: string) => string) {
  const file = zip.file(path);
  if (!file) throw new Error(`No ${path} in the workbook.`);
  zip.file(path, change(await file.async('string')));
}

function metadata(n: number) {
  const flags =
    'minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1"';
  return (
    `${xml}<metadata xmlns="${MAIN}" xmlns:xlrd="${RICH}">` +
    `<metadataTypes count="1"><metadataType name="XLRICHVALUE" ${flags}/></metadataTypes>` +
    `<futureMetadata name="XLRICHVALUE" count="${n}">` +
    times(
      n,
      (i) => `<bk><extLst><ext uri="{3e2802c4-a4d2-4d8b-9148-e3be6c30e623}"><xlrd:rvb i="${i}"/></ext></extLst></bk>`,
    ) +
    `</futureMetadata><valueMetadata count="${n}">${times(n, (i) => `<bk><rc t="1" v="${i}"/></bk>`)}</valueMetadata></metadata>`
  );
}

const richValues = (n: number) =>
  `${xml}<rvData xmlns="${RICH}" count="${n}">${times(n, (i) => `<rv s="0"><v>${i}</v><v>${LOCAL_IMAGE}</v></rv>`)}</rvData>`;

function valueTypes() {
  const keys = KEY_FLAGS.map(
    ([name, flags]) => `<key name="${name}">${flags.map((f) => `<flag name="${f}" value="1"/>`).join('')}</key>`,
  ).join('');
  return (
    `${xml}<rvTypesInfo xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata2" ` +
    `xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x" xmlns:x="${MAIN}">` +
    `<global><keyFlags>${keys}</keyFlags></global></rvTypesInfo>`
  );
}

const valueRels = (n: number) =>
  `${xml}<richValueRels xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel" xmlns:r="${OFFICE_RELS}">` +
  times(n, (i) => `<rel r:id="rId${i + 1}"/>`) +
  `</richValueRels>`;

const imageRels = (n: number) =>
  `${xml}<Relationships xmlns="${RELS}">` +
  times(
    n,
    (i) => `<Relationship Id="rId${i + 1}" Type="${OFFICE_RELS}/image" Target="../media/cell-picture-${i + 1}.png"/>`,
  ) +
  `</Relationships>`;

function contentTypes(existing: string) {
  const png = /Extension="png"/i.test(existing) ? '' : '<Default Extension="png" ContentType="image/png"/>';
  return (
    png +
    Object.values(PARTS)
      .map((p) => `<Override PartName="/${p.path}" ContentType="${p.type}"/>`)
      .join('')
  );
}

const workbookRels = () =>
  WORKBOOK_RELS.map(
    ([type, target], i) => `<Relationship Id="rIdPictures${i + 1}" Type="${type}" Target="${target}"/>`,
  ).join('');
