import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

// Where else to find EVERise. The Discord invite must be one that never
// expires (Discord: Invite People → Edit invite link → Expire after: Never);
// the current one, from 5 October 2026, expires on 4 November 2026.
export const EVERISE_DISCORD = 'https://discord.gg/zfmSu9ngA';
export const EVERISE_LODESTONE = 'https://na.finalfantasyxiv.com/lodestone/freecompany/9232660711086364990/';

// The free company's Discord server and Lodestone page, opening in a new
// tab: as buttons (the home page banner) or as plain links (the footer).
@Component({
  selector: 'cdt-community-links',
  template: `
    <ul [class]="look()">
      @for (link of links; track link.href) {
        <li>
          @if (look() === 'buttons') {
            <a cdtButton="outline-secondary" size="sm" [href]="link.href" target="_blank" rel="noopener noreferrer">
              <img [src]="link.icon" alt="" width="18" height="18" />{{ link.text
              }}<span class="visually-hidden"> (opens in a new tab)</span>
            </a>
          } @else {
            <a [href]="link.href" target="_blank" rel="noopener noreferrer">
              <img [src]="link.icon" alt="" width="18" height="18" />{{ link.text
              }}<span class="visually-hidden"> (opens in a new tab)</span>
            </a>
          }
        </li>
      }
    </ul>
  `,
  styleUrl: './community-links.component.scss',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityLinksComponent {
  readonly look = input<'buttons' | 'links'>('links');

  protected readonly links = [
    { text: 'Join us on Discord', href: EVERISE_DISCORD, icon: 'assets/images/discord.svg' },
    { text: 'EVERise on the Lodestone', href: EVERISE_LODESTONE, icon: 'assets/images/lodestone.png' },
  ];
}
