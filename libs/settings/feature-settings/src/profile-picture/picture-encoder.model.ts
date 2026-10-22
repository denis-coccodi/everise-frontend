// Draws the chosen square at side × side pixels and encodes it.
export interface PictureRenderer {
  encode(side: number, type: string, quality: number): Promise<Blob>;
}
