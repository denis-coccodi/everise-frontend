import { splitRichText } from './rich-text/rich-text';
import { youTubeLink, youTubeVideo } from './youtube';

describe('youTubeVideo', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 0],
    ['https://youtu.be/dQw4w9WgXcQ?t=42', 'dQw4w9WgXcQ', 42],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s', 'dQw4w9WgXcQ', 90],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 0],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 0],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ?start=7', 'dQw4w9WgXcQ', 7],
  ])('reads %s', (link, id, start) => {
    expect(youTubeVideo(link)).toEqual({ id, start });
  });

  it.each([
    'https://www.youtube.com/watch?v=short',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'javascript:alert(1)',
    'not a link',
    'https://www.youtube.com/channel/UC123',
  ])('ignores %s', (link) => {
    expect(youTubeVideo(link)).toBeNull();
  });

  it('writes a plain watch link back, with the start time', () => {
    expect(youTubeLink({ id: 'dQw4w9WgXcQ', start: 90 })).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s');
  });
});

describe('splitRichText', () => {
  it('turns a YouTube link alone on a line into a video, and keeps the rest as Markdown', () => {
    expect(
      splitRichText(
        'Look at this:\n\nhttps://youtu.be/dQw4w9WgXcQ\n<https://youtu.be/aaaaaaaaaaa>\nNice, see https://youtu.be/dQw4w9WgXcQ too',
      ),
    ).toEqual([
      { kind: 'markdown', text: 'Look at this:\n' },
      { kind: 'youtube', video: { id: 'dQw4w9WgXcQ', start: 0 } },
      { kind: 'youtube', video: { id: 'aaaaaaaaaaa', start: 0 } },
      { kind: 'markdown', text: 'Nice, see https://youtu.be/dQw4w9WgXcQ too' },
    ]);
  });
});
