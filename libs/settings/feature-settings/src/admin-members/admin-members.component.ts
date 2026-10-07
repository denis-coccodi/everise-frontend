import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Member } from '@realworld/core/api-types';
import { AdminMembersStore, isAssignableRole } from '@realworld/settings/data-access';
import {
  AvatarComponent,
  ButtonComponent,
  DialogComponent,
  FieldComponent,
  InputComponent,
  MessageComponent,
  PagerComponent,
  PanelComponent,
} from '@realworld/ui/components';

// For admins: the members and their roles, a page at a time, found by part
// of their username or email (AdminMembersStore). Making someone a staging
// tester lets them open the staging site; admins come from the backend's
// settings and can't be changed here. A member can also be deleted for
// good, after a confirmation, e.g. when they ask under the privacy policy.
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
    AvatarComponent,
    MessageComponent,
  ],
  providers: [AdminMembersStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMembersComponent {
  protected readonly store = inject(AdminMembersStore);
  private readonly injector = inject(Injector);
  private readonly searchField = viewChild.required('searchField', { read: ElementRef<HTMLInputElement> });
  private readonly keepButton = viewChild('keepButton', { read: ElementRef<HTMLButtonElement> });

  // The member the admin is asked to confirm deleting.
  protected readonly confirming = signal<Member | null>(null);
  private deleting = false;

  constructor() {
    // A deletion done (or refused) closes its confirmation.
    effect(() => {
      const saving = this.store.saving();
      untracked(() => {
        if (this.deleting && saving === null) {
          this.deleting = false;
          this.closeConfirmation();
        }
      });
    });
  }

  protected onSearch(term: string) {
    this.store.search(term.trim());
  }

  // The role chosen in the member's list (a select's value).
  protected changeRole(member: Member, role: string) {
    if (isAssignableRole(role) && role !== member.role) this.store.changeRole({ member, role });
  }

  protected askToDelete(member: Member) {
    this.confirming.set(member);
    // Start on "Keep", the safe choice.
    afterNextRender(() => this.keepButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected deleteMember(member: Member) {
    this.deleting = true;
    this.store.deleteMember(member);
  }

  // Closes the confirmation. Its "Delete" button may be gone with the
  // member, so the focus goes to the search field.
  protected closeConfirmation() {
    this.confirming.set(null);
    this.searchField().nativeElement.focus();
  }
}
