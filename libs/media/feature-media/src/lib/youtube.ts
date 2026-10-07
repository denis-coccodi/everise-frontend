// A YouTube video named by a link: its id, and where to start (seconds).
export interface YouTubeVideo {
  id: string;
  start: number;
}

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
];

// The video a link points at, or null for anything else. Understands the
// links YouTube shares: watch?v=, youtu.be/, /shorts/, /live/ and /embed/.
export function youTubeVideo(link: string): YouTubeVideo | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!HOSTS.includes(url.hostname)) return null;

  const path = url.pathname.split('/').filter(Boolean);
  const id =
    url.hostname === 'youtu.be'
      ? path[0]
      : path[0] === 'watch'
        ? url.searchParams.get('v')
        : ['shorts', 'live', 'embed'].includes(path[0])
          ? path[1]
          : null;
  if (!id || !ID.test(id)) return null;
  return { id, start: seconds(url.searchParams.get('t') ?? url.searchParams.get('start')) };
}

// "90", "90s" or "1m30s" as seconds; 0 when missing or unreadable.
function seconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+s?$/.test(value)) return parseInt(value, 10);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

// The link written into a post: a plain watch link, which reads well even
// where it isn't shown as a video.
export function youTubeLink(video: YouTubeVideo): string {
  return `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}s` : ''}`;
}
