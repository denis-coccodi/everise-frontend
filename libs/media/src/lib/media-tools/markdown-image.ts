// The Markdown for an image: ![description](address), with the description
// kept to one line and free of the brackets that would end it early.
export function markdownImage(description: string, url: string): string {
  const alt = description
    .replace(/[[\]\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Brackets and spaces would end the address early.
  const address = url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');
  return `![${alt}](${address})`;
}
