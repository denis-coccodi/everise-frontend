import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WeeklyStore } from '@everise/relays/data-access';
import { MessageComponent, PanelComponent } from '@everise/ui/components';
import { DiscordMessageComponent } from '../discord-message/discord-message.component';
import { countdown, shortDateTime } from '../discord-times';
import { fashionReportStatus, islandSeasonStatus } from './weekly-status';

// The Weekly tab: when the next resets come, this week's Fashion Report
// (Kaiyoko's infographic) and Island Sanctuary workshop recommendations
// (Overseas Casuals), as the Everise Discord gets them. Open to guests.
@Component({
  selector: 'cdt-weekly',
  templateUrl: './weekly.component.html',
  styleUrl: './weekly.component.scss',
  imports: [PanelComponent, MessageComponent, DiscordMessageComponent],
  providers: [WeeklyStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyComponent {
  protected readonly store = inject(WeeklyStore);

  protected readonly resets = computed(() => {
    const resets = this.store.weekly.value()?.resets;
    const now = this.store.now();
    if (!resets) return [];
    return [
      { name: 'Daily reset', what: 'Duties, roulettes, tribal quests', at: resets.daily },
      { name: 'Grand Company', what: 'Supply and provisioning missions', at: resets.grandCompany },
      { name: 'Weekly reset', what: 'Raids, Wondrous Tails, the Fashion Report', at: resets.weekly },
    ].map((reset) => {
      const at = Date.parse(reset.at);
      return { ...reset, in: countdown(at, now), when: shortDateTime(at) };
    });
  });

  protected readonly fashionStatus = computed(() => {
    const weekly = this.store.weekly.value();
    return weekly ? fashionReportStatus(weekly.fashionReport, weekly.nextJudgingAt, this.store.now()) : '';
  });

  protected readonly islandStatus = computed(() => {
    const weekly = this.store.weekly.value();
    return weekly ? islandSeasonStatus(weekly.islandSanctuary, this.store.now()) : '';
  });
}
