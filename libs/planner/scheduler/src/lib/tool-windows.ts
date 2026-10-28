import type { PullTimeline } from '@everise/core/api-types';
import { withAetherflow } from './aetherflow';
import { withBans } from './edits';
import type { PlanEdits } from './edits.model';
import { withEnablerWindows } from './enabled-windows';
import { withFairyAway } from './fairy-heals';
import { withDraws } from './opening';
import type { Opening } from './openers.model';
import type { HealTool, MitigationTool } from './plan.model';

// The tools as the pull and the opener allow them: a scholar's fairy
// orders wait for her while Dissipation has her away; Aetherflow comes
// with its refills, an astrologian's cards with their draws; Lux Solaris
// waits for the burst that grants it; and the user's removed skills aren't
// planned where they were.
export function toolWindows(timeline: PullTimeline, opening: Opening, edits: PlanEdits | undefined) {
  const { dissipations, refills } = opening;
  return <T extends MitigationTool | HealTool>(tools: T[]) =>
    withBans(
      withEnablerWindows(
        timeline,
        withDraws(withAetherflow(timeline, withFairyAway(timeline, tools, dissipations), refills), opening),
      ),
      edits,
    );
}
