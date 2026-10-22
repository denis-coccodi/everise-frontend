import { ActionEffect } from '@everise/core/api-types';

const WHO: Record<ActionEffect['target'], string> = {
  self: 'Self',
  target: 'Target',
  party: 'Party',
  enemies: 'Enemies',
};

// An action's heals and mitigations in a few words: "Party: −10% damage
// taken, regen 100 potency (15s)".
export function effectsText(effects: ActionEffect[]): string {
  const byWho = new Map<string, string[]>();
  for (const effect of effects) {
    const who = WHO[effect.target];
    byWho.set(who, [...(byWho.get(who) ?? []), effectText(effect)]);
  }
  return [...byWho].map(([who, parts]) => `${who}: ${parts.join(', ')}`).join('; ');
}

function effectText(e: ActionEffect): string {
  const time = e.durationMs ? ` (${e.durationMs / 1000}s)` : '';
  const when = e.condition ? ` when ${e.condition}` : '';
  return `${core(e)}${time}${when}`;
}

function core(e: ActionEffect): string {
  switch (e.kind) {
    case 'mitigation':
      return e.target === 'enemies' ? `−${split(e)} damage dealt` : `−${split(e)} damage taken`;
    case 'shield':
      return `shield ${amount(e)}`;
    case 'heal':
      return `heal ${amount(e)}`;
    case 'regen':
      return `regen ${e.potency} potency`;
    case 'delayedHeal':
      return `delayed heal ${e.potency} potency`;
    case 'maxHp':
      return `+${e.percent}% max HP`;
    case 'healingReceived':
      return `+${e.percent}% healing received`;
    case 'healingPotency':
      return `+${e.percent}% healing`;
    case 'invulnerable':
      return 'invulnerable';
  }
}

// "10%", or "10% physical, 20% magic" when they differ.
function split(e: ActionEffect) {
  if (e.percent !== null) return `${e.percent}%`;
  const parts = [];
  if (e.physical !== null) parts.push(`${e.physical}% physical`);
  if (e.magic !== null) parts.push(`${e.magic}% magic`);
  return parts.join(', ');
}

// A heal's or shield's size: potency, or a share of max HP or of the heal.
function amount(e: ActionEffect) {
  if (e.potency !== null) return `${e.potency} potency`;
  if (e.percent === null) return '';
  if (e.of === 'healed') return `${e.percent}% of the heal`;
  if (e.of === 'casterMaxHp') return `${e.percent}% of the caster's max HP`;
  return `${e.percent}% of max HP`;
}
