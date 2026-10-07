import { YouTubeVideo, youTubeVideo } from '../youtube';

export type RichTextPart = { kind: 'markdown'; text: string } | { kind: 'youtube'; video: YouTubeVideo };

// Splits a post or comment into Markdown and YouTube videos: a YouTube link
// alone on its line (optionally in <angle brackets>) becomes a video.
export function splitRichText(text: string): RichTextPart[] {
  const parts: RichTextPart[] = [];
  let markdown: string[] = [];
  const flush = () => {
    const chunk = markdown.join('\n');
    if (chunk.trim()) parts.push({ kind: 'markdown', text: chunk });
    markdown = [];
  };
  for (const line of text.split(/\r?\n/)) {
    const video = youTubeVideo(line.trim().replace(/^<(.*)>$/, '$1'));
    if (video) {
      flush();
      parts.push({ kind: 'youtube', video });
    } else {
      markdown.push(line);
    }
  }
  flush();
  return parts;
}
