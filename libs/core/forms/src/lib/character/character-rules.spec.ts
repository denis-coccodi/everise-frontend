import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { characterRules, isCharacterName } from './character-rules';

describe('character rules', () => {
  it('takes a name as the game allows it: two parts, 2 to 15 letters each, 20 in all', () => {
    expect(isCharacterName('Avar Kriss')).toBe(true);
    expect(isCharacterName("Y'shtola Rhul")).toBe(true);
    expect(isCharacterName('  Avar   Kriss ')).toBe(true);
    expect(isCharacterName('Alphinaudlevei Leveil')).toBe(true);

    expect(isCharacterName('Avar')).toBe(false);
    expect(isCharacterName('Avar Kriss Odin')).toBe(false);
    expect(isCharacterName('A Kriss')).toBe(false);
    expect(isCharacterName('Avar Kr1ss')).toBe(false);
    expect(isCharacterName("Avar Kriss'")).toBe(false);
    expect(isCharacterName('Abcdefghijklmnop Kriss')).toBe(false);
    expect(isCharacterName('Abcdefghijklmn Leveilx')).toBe(false);
  });

  function character(name: string, world: string) {
    const model = signal({ name, world });
    const tree = form(model, (path) => characterRules(path.name, path.world), {
      injector: TestBed.inject(Injector),
    });
    const kinds = (field: 'name' | 'world') =>
      tree[field]()
        .errors()
        .map((error) => error.kind);
    return { name: kinds('name'), world: kinds('world') };
  }

  it('is optional, but both or neither, each error on the field that was filled in', () => {
    expect(character('', '')).toEqual({ name: [], world: [] });
    expect(character('Avar Kriss', 'Odin')).toEqual({ name: [], world: [] });
    expect(character('Avar Kriss', '')).toEqual({ name: ['characterWorldMissing'], world: [] });
    expect(character('  ', 'Odin')).toEqual({ name: [], world: ['characterNameMissing'] });
    expect(character('Avar', 'Odin')).toEqual({ name: ['characterName'], world: [] });
  });
});
