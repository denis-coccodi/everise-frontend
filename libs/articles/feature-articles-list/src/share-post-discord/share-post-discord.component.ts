import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DiscordSharingService, PostDiscordShareStore } from '@everise/articles/data-access';
import { AuthStore } from '@everise/auth/data-access';
import { Article } from '@everise/core/api-types';
import { ButtonComponent, IconComponent, MessageComponent } from '@everise/ui/components';

// "Share to Discord" on a post that's already up: for its author, or an
// admin on any post, where sharing to the Everise Discord is set up. Says
// when it's sent, or why not.
@Component({
  selector: 'cdt-share-post-discord',
  templateUrl: './share-post-discord.component.html',
  styleUrl: './share-post-discord.component.scss',
  imports: [ButtonComponent, IconComponent, MessageComponent],
  providers: [PostDiscordShareStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharePostDiscordComponent {
  readonly article = input.required<Article>();

  protected readonly store = inject(PostDiscordShareStore);
  private readonly authStore = inject(AuthStore);
  private readonly available = inject(DiscordSharingService).available;

  protected readonly canShare = computed(() => {
    if (!this.available() || !this.authStore.loggedIn()) return false;
    const user = this.authStore.user();
    return user.role === 'admin' || user.id === this.article().author.id;
  });

  protected share() {
    this.store.share(this.article().id);
  }
}
