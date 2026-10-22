// Draws the picture at width × height pixels and encodes it.
export interface ImageRenderer {
  readonly width: number;
  readonly height: number;
  encode(width: number, height: number, type: string, quality: number): Promise<Blob>;
}
