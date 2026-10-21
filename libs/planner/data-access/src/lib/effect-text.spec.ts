import { ActionEffect } from '@everise/core/api-types';
import { effectsText } from './effect-text';

const effect = (values: Partial<ActionEffect> & Pick<ActionEffect, 'kind' | 'target'>): ActionEffect => ({
  status: null,
  statusId: null,
  percent: null,
  physical: null,
  magic: null,
  potency: null,
  of: null,
  durationMs: null,
  stacks: null,
  condition: null,
  ...values,
});

describe('effectsText', () => {
  it('groups effects by who they land on', () => {
    expect(
      effectsText([
        effect({ kind: 'mitigation', target: 'party', percent: 10, durationMs: 15_000 }),
        effect({ kind: 'regen', target: 'party', potency: 100, durationMs: 15_000 }),
      ]),
    ).toBe('Party: −10% damage taken (15s), regen 100 potency (15s)');
  });

  it('gives physical and magic apart, and enemies their damage dealt', () => {
    expect(
      effectsText([effect({ kind: 'mitigation', target: 'enemies', physical: 5, magic: 10, durationMs: 15_000 })]),
    ).toBe('Enemies: −5% physical, 10% magic damage dealt (15s)');
  });

  it('sizes shields by potency or by a share of max HP or the heal, with their condition', () => {
    expect(
      effectsText([
        effect({ kind: 'heal', target: 'target', potency: 300 }),
        effect({ kind: 'shield', target: 'target', percent: 180, of: 'healed', durationMs: 30_000 }),
        effect({
          kind: 'shield',
          target: 'target',
          percent: 180,
          of: 'healed',
          durationMs: 30_000,
          condition: 'critical heal',
        }),
      ]),
    ).toBe('Target: heal 300 potency, shield 180% of the heal (30s), shield 180% of the heal (30s) when critical heal');
    expect(effectsText([effect({ kind: 'shield', target: 'party', percent: 10, of: 'casterMaxHp' })])).toBe(
      "Party: shield 10% of the caster's max HP",
    );
  });

  it('names the other kinds', () => {
    expect(
      effectsText([
        effect({ kind: 'maxHp', target: 'self', percent: 20 }),
        effect({ kind: 'invulnerable', target: 'self', durationMs: 10_000 }),
        effect({ kind: 'delayedHeal', target: 'self', potency: 1200 }),
      ]),
    ).toBe('Self: +20% max HP, invulnerable (10s), delayed heal 1200 potency');
  });
});
