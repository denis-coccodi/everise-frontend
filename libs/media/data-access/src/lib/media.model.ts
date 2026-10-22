// An uploaded image or GIF, where it's served.
export interface UploadedMedia {
  id: string;
  url: string;
  contentType: string;
  width: number;
  height: number;
}

// A GIF from the GIPHY search.
export interface Gif {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
  width: number;
  height: number;
}
