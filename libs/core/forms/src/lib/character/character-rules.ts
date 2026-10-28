import { SchemaPath, validate } from '@angular/forms/signals';

// A member's character in the game, optional at sign-up and in the settings:
// its name as the game allows it, and its world, both or neither. The
// backend's rules (src/users/character-name.ts): a forename and a surname of
// 2 to 15 letters each (an apostrophe or hyphen inside one, as in Y'shtola),
// 20 letters at most in all; spaces around and between them are tidied.
const NAME_PART = /^[A-Za-z][A-Za-z'-]*[A-Za-z]$/;
const PART_MAX = 15;
const NAME_MAX = 20;

export function isCharacterName(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length === 2 &&
    parts.every((part) => part.length <= PART_MAX && NAME_PART.test(part)) &&
    parts.join('').length <= NAME_MAX
  );
}

// Errors go on the field the person filled in, so they show once it's
// changed: `characterName` for a name the game wouldn't allow,
// `characterWorldMissing` on a name without a world, `characterNameMissing`
// on a world without a name.
export function characterRules(name: SchemaPath<string>, world: SchemaPath<string>) {
  validate(name, ({ value }) => (value().trim() && !isCharacterName(value()) ? { kind: 'characterName' } : null));
  validate(name, ({ value, valueOf }) =>
    value().trim() && !valueOf(world) ? { kind: 'characterWorldMissing' } : null,
  );
  validate(world, ({ value, valueOf }) => (value() && !valueOf(name).trim() ? { kind: 'characterNameMissing' } : null));
}
