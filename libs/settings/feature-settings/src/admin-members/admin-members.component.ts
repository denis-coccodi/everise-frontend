import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssignableRole, Member, StagingAccessResult } from '@realworld/core/api-types';
import { AdminService, adminErrorMessage } from '@realworld/settings/data-access';
import { ButtonComponent, InputComponent, PanelComponent } from '@realworld/ui/components';

const ROLE_NAMES: Record<AssignableRole, string> = {
  user: 'a user',
  'staging-tester': 'a staging tester',
};

// For admins: every member and their role. Making someone a staging tester
// lets them open the staging site (the backend updates its Cloudflare Access
// list); admins come from the backend's settings and can't be changed here.
@Component({
  selector: 'cdt-admin-members',
  templateUrl: './admin-members.component.html',
  styleUrl: './admin-members.component.scss',
  imports: [ButtonComponent, InputComponent, PanelComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMembersComponent {
  private readonly admin = inject(AdminService);

  protected readonly members = signal<Member[] | null>(null);
  // The member whose role is being saved, or "sync" while syncing.
  protected readonly saving = signal<string | null>(null);
  protected readonly status = signal('');
  // The staging access list couldn't be updated: shown as a warning.
  protected readonly warning = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.admin.members().subscribe({
      next: ({ users }) => this.members.set(users),
      error: (response: HttpErrorResponse) => this.error.set(adminErrorMessage(response)),
    });
  }

  protected changeRole(member: Member, role: AssignableRole) {
    if (role === member.role) return;
    this.start(member.username);
    this.admin.setRole(member.username, role).subscribe({
      next: ({ user, stagingAccess }) => {
        this.members.update((list) => list?.map((m) => (m.username === user.username ? user : m)) ?? null);
        this.done(`${user.username} is now ${ROLE_NAMES[role]}.`, stagingAccess);
      },
      error: (response: HttpErrorResponse) => this.failed(response),
    });
  }

  protected syncStagingAccess() {
    this.start('sync');
    this.admin.syncStagingAccess().subscribe({
      next: ({ stagingAccess }) => this.done('', stagingAccess),
      error: (response: HttpErrorResponse) => this.failed(response),
    });
  }

  private start(what: string) {
    this.saving.set(what);
    this.status.set('');
    this.error.set(null);
  }

  private done(change: string, access: StagingAccessResult) {
    this.saving.set(null);
    this.warning.set(!access.synced);
    this.status.set(`${change} ${access.message}`.trim());
  }

  private failed(response: HttpErrorResponse) {
    this.saving.set(null);
    this.error.set(adminErrorMessage(response));
    // The list shows what the backend has; reload it after a refusal.
    this.admin.members().subscribe({ next: ({ users }) => this.members.set(users) });
  }
}
