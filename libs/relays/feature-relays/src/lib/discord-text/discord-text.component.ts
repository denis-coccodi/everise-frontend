import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { discordTime } from '../discord-times';
import { discordMarkdown, inline } from './discord-markdown';
import type { BlockNode, InlineNode } from './discord-markdown.model';

// Text written on Discord (a message, an embed's title, description or
// field), shown as Discord shows it: Markdown, custom emoji, times in the
// reader's time zone. `inline` reads one line without blocks (titles,
// field names). `now` moves relative times ("in 5 minutes") on.
@Component({
  selector: 'cdt-discord-text',
  templateUrl: './discord-text.component.html',
  styleUrl: './discord-text.component.scss',
  imports: [NgTemplateOutlet],
  host: { '[class.inline]': 'inline()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscordTextComponent {
  readonly text = input.required<string>();
  readonly inline = input(false);
  readonly now = input(Date.now());

  protected readonly blocks = computed<BlockNode[]>(() => (this.inline() ? [] : discordMarkdown(this.text())));
  protected readonly line = computed<InlineNode[]>(() => (this.inline() ? inline(this.text()) : []));

  protected time(node: { at: number; style: string }) {
    return discordTime(node.at, node.style, this.now());
  }

  protected iso(at: number) {
    return new Date(at).toISOString();
  }
}
