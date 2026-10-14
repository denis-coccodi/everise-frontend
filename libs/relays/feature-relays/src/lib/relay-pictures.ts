import { Attachment, RelayEmbed, RelayImage, RelayMessage } from '@everise/core/api-types';

// Where a relayed picture is: our copy (Discord's own links expire), or
// where Discord had it (Tenor, Imgur).
export function pictureUrl(apiUrl: string, image: RelayImage): string {
  return image.file ? `${apiUrl}/relays/images/${encodeURIComponent(image.file)}` : image.url;
}

function isGif(url: string, contentType?: string) {
  return contentType === 'image/gif' || /\.gif($|\?)/i.test(url);
}

function picture(apiUrl: string, image: RelayImage, alt: string, contentType?: string): Attachment {
  const url = pictureUrl(apiUrl, image);
  return { kind: isGif(url, contentType) ? 'gif' : 'image', url, alt, width: image.width, height: image.height };
}

// Embeds Discord shows as the picture alone (a GIF from Tenor, an image
// link), not as a card.
export function isPictureEmbed(embed: RelayEmbed): boolean {
  return (embed.type === 'gifv' || embed.type === 'image') && !!(embed.thumbnail ?? embed.image);
}

// A message's pictures, for the media grid: those embeds, then attached
// images.
export function messagePictures(apiUrl: string, message: RelayMessage): Attachment[] {
  const embeds = message.embeds.filter(isPictureEmbed).map((embed) => {
    const image = (embed.image ?? embed.thumbnail) as RelayImage;
    return picture(apiUrl, image, embed.title ?? (embed.type === 'gifv' ? 'GIF' : 'Picture'));
  });
  const attached = message.attachments
    .filter((file) => file.contentType?.startsWith('image/'))
    .map((file) => picture(apiUrl, file, file.name, file.contentType));
  return [...embeds, ...attached];
}

// A card's large picture, for the media grid.
export function embedPicture(apiUrl: string, embed: RelayEmbed): Attachment[] {
  return embed.image ? [picture(apiUrl, embed.image, embed.title ?? 'Picture')] : [];
}

// A card's edge colour (0xRRGGBB), or none.
export function embedColour(embed: RelayEmbed): string | null {
  return embed.color === undefined ? null : `#${embed.color.toString(16).padStart(6, '0')}`;
}
