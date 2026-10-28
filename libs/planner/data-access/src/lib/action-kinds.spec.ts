import { CatalogAction } from '@everise/core/api-types';
import { onlyDamage, whatItDoes } from './action-kinds';

describe('onlyDamage', () => {
  const action = (id: number, description: string, effects: CatalogAction['effects'] = []) =>
    ({ id, name: '', description, effects }) as unknown as CatalogAction;

  it('takes an attack for damage, even with a buff of its own, but not a buff or an enabler', () => {
    expect(onlyDamage(3617, action(3617, 'Delivers an attack with a potency of 300.'))).toBe(true);
    expect(onlyDamage(167, action(167, 'Deals unaspected damage with a potency of 100.'))).toBe(true);
    // MP it restores doesn't count either (Syphon Strike's combo).
    const mp = { kind: 'mp', potency: 600 } as CatalogAction['effects'][number];
    expect(onlyDamage(3623, action(3623, 'Delivers an attack with a potency of 240.', [mp]))).toBe(true);
    expect(onlyDamage(20, action(20, 'Increases damage dealt by 25%.\nDuration: 20s'))).toBe(false);
    expect(onlyDamage(16542, action(16542, 'Allows the next Adloquium...'))).toBe(false);
    // Not in the catalog: a combo step, but a potion or Sprint isn't.
    expect(onlyDamage(36918, undefined)).toBe(true);
    expect(onlyDamage(34603667, undefined)).toBe(false);
    expect(onlyDamage(3, undefined)).toBe(false);
  });

  it("says what one does: an enabler's words, or its tooltip's first line", () => {
    expect(whatItDoes(166, undefined)).toBe('3 Aetherflow stacks');
    expect(whatItDoes(20, action(20, 'Increases damage dealt by 25%.\nDuration: 20s'))).toBe(
      'Increases damage dealt by 25%.',
    );
  });
});
