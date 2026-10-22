import type { YouTubeVideo } from '../youtube.model';

export type RichTextPart = { kind: 'markdown'; text: string } | { kind: 'youtube'; video: YouTubeVideo };
