import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AssignableRole, Member, StagingAccessResult } from '@realworld/core/api-types';
import { AdminService, adminErrorMessage } from '@realworld/settings/data-access';
import {
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  PagerComponent,
  PanelComponent,
} from '@realworld/ui/components';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

const ROLE_NAMES: Record<AssignableRole, string> = {
  user: 'a user',
  'staging-tester': 'a staging tester',
};

// Members on one page of the list.
export const MEMBERS_PER_PAGE = 20;
// How long typing pauses before the search runs.
const SEARCH_DELAY_MS = 300;

// For admins: the members and their roles, a page at a time, found by part
// of their username or email. Making someone a staging tester lets them open
// the staging site (the backend updates its Cloudflare Access list); admins
// come from the backend's settings and can't be changed here. A member can
// also be deleted for good, after a confirmation, e.g. when they ask under
// the privacy policy.
@Component({
  selector: 'cdt-admin-members',
  templateUrl: './admin-members.component.html',
  styleUrl: './admin-members.component.scss',
  imports: [
    ButtonComponent,
    DialogComponent,
    FieldComponent,
    InputComponent,
    PagerComponent,
    PanelComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMembersComponent {
  private readonly admin = inject(AdminService);
  private readonly injector = inject(Injector);
  private readonly searchField = viewChild.required('searchField', { read: ElementRef<HTMLInputElement> });
  private readonly keepButton = viewChild('keepButton', { read: ElementRef<HTMLButtonElement> });

  protected readonly members = signal<Member[] | null>(null);
  protected readonly count = signal(0);
  // Unknown until the first page arrives.
  protected readonly connected = signal<boolean | null>(null);
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly pages = computed(() =>
    Array.from({ length: Math.ceil(this.count() / MEMBERS_PER_PAGE) }, (_, i) => i + 1),
  );
  // The member whose role is being saved, or "sync" while syncing.
  protected readonly saving = signal<string | null>(null);
  protected readonly status = signal('');
  // The staging access list couldn't be updated: shown as a warning.
  protected readonly warning = signal(false);
  protected readonly error = signal<string | null>(null);
  // The member the admin is asked to confirm deleting.
  protected readonly confirming = signal<Member | null>(null);

  private readonly searches = new Subject<string>();
  private loading?: Subscription;

  constructor() {
    this.load();
    this.searches
      .pipe(debounceTime(SEARCH_DELAY_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(1);
        this.load();
      });
  }

  protected onSearch(term: string) {
    this.searches.next(term.trim());
  }

  protected setPage(page: number) {
    this.page.set(page);
    this.load();
  }

  protected changeRole(member: Member, role: AssignableRole) {
    if (role === member.role) return;
    this.start(member.username);
    this.admin.setRole(member.id, role).subscribe({
      next: ({ user, stagingAccess }) => {
        this.members.update((list) => list?.map((m) => (m.id === user.id ? user : m)) ?? null);
        this.done(`${user.username} is now ${ROLE_NAMES[role]}.`, stagingAccess);
      },
      error: (response: HttpErrorResponse) => this.failed(response),
    });
  }

  protected askToDelete(member: Member) {
    this.confirming.set(member);
    // Start on "Keep", the safe choice.
    afterNextRender(() => this.keepButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected deleteMember(member: Member) {
    this.start(member.username);
    this.admin.deleteMember(member.id).subscribe({
      next: ({ deleted, stagingAccess }) => {
        this.closeConfirmation();
        this.saving.set(null);
        const removed = `Deleted ${deleted.username}, with ${plural(deleted.articles, 'post')} and ${plural(
          deleted.comments,
          'comment',
        )}.`;
        this.warning.set(stagingAccess ? !stagingAccess.synced : false);
        this.status.set(`${removed} ${stagingAccess?.message ?? ''}`.trim());
        this.load();
      },
      error: (response: HttpErrorResponse) => {
        this.closeConfirmation();
        this.failed(response);
      },
    });
  }

  // Closes the confirmation. Its "Delete" button may be gone with the
  // member, so the focus goes to the search field.
  protected closeConfirmation() {
    this.confirming.set(null);
    this.searchField().nativeElement.focus();
  }

  protected syncStagingAccess() {
    this.start('sync');
    this.admin.syncStagingAccess().subscribe({
      next: ({ stagingAccess }) => this.done('', stagingAccess),
      error: (response: HttpErrorResponse) => this.failed(response),
    });
  }

  private load() {
    this.loading?.unsubscribe();
    this.loading = this.admin.members(this.search(), MEMBERS_PER_PAGE, (this.page() - 1) * MEMBERS_PER_PAGE).subscribe({
      next: ({ users, usersCount, stagingAccessConnected }) => {
        this.members.set(users);
        this.count.set(usersCount);
        this.connected.set(stagingAccessConnected);
      },
      error: (response: HttpErrorResponse) => this.error.set(adminErrorMessage(response)),
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
    this.load();
  }
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
