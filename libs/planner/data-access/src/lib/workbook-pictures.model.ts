// A cell to hold a picture: its address on the sheet, and the PNG.
export interface CellPicture {
  cell: string;
  png: Uint8Array;
}
