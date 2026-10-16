import { SchemaPath, validate } from '@angular/forms/signals';

// A field that repeats another (the new password, typed twice): an error of
// kind `sameAs` while they differ. An empty repeat is `required`'s job.
export function sameAs(path: SchemaPath<string>, other: SchemaPath<string>) {
  validate(path, ({ value, valueOf }) => (value() && value() !== valueOf(other) ? { kind: 'sameAs' } : null));
}
