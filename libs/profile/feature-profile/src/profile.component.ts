import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { ProfileStore } from '@realworld/profile/data-access';
import { ButtonComponent, TabComponent, TabsComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  imports: [ButtonComponent, TabsComponent, TabComponent, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly profileStore = inject(ProfileStore);
  private readonly authStore = inject(AuthStore);

  $profileLoading = this.profileStore.getProfileLoading;
  $username = this.profileStore.username;
  $id = this.profileStore.id;
  $image = this.profileStore.image;
  $bio = this.profileStore.bio;
  $following = this.profileStore.following;
  $currentUser = this.authStore.user.id;

  $isUser = computed(() => this.$currentUser() === this.$id());

  toggleFollowing() {
    if (this.$following()) {
      this.profileStore.unfollowUser(this.$id);
    } else {
      this.profileStore.followUser(this.$id);
    }
  }
}
