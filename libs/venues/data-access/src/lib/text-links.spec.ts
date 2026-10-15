import { textParts } from './text-links';

describe('textParts', () => {
  it('cuts the web addresses out of the text, leaving sentence punctuation', () => {
    expect(textParts('Discord Link : https://discord.gg/gPp6SVss87. Come by!')).toEqual([
      { text: 'Discord Link : ' },
      { text: 'https://discord.gg/gPp6SVss87', url: 'https://discord.gg/gPp6SVss87' },
      { text: '. Come by!' },
    ]);
  });

  it('keeps text without an address whole, and never takes markup as an address', () => {
    expect(textParts('Every Friday')).toEqual([{ text: 'Every Friday' }]);
    expect(textParts('<a href="javascript:alert(1)">x</a>')).toEqual([{ text: '<a href="javascript:alert(1)">x</a>' }]);
    expect(textParts('(https://a.example/x)')).toEqual([
      { text: '(' },
      { text: 'https://a.example/x', url: 'https://a.example/x' },
      { text: ')' },
    ]);
  });
});
