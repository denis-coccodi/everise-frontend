import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { AssignableRole, Member, StagingAccessResult } from '@realworld/core/api-types';
import { serverMessage } from '@realworld/core/forms';
import { debounceTime, distinctUntilChanged, exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { AdminService } from './admin.service';

// Members on one page of the list.
export const MEMBERS_PER_PAGE = 20;
// How long typing pauses before the search runs.
const SEARCH_DELAY_MS = 300;

const ROLE_NAMES: Record<AssignableRole, string> = {
  user: 'a user',
  'staging-tester': 'a staging tester',
};

export function isAssignableRole(value: string): value is AssignableRole {
  return value in ROLE_NAMES;
}

interface AdminMembersState {
  // Null until the first page arrives.
  members: Member[] | null;
  count: number;
  // Whether role changes reach Cloudflare Access; unknown at first.
  connected: boolean | null;
  searchTerm: string;
  page: number;
  // The member whose role is being saved or who is being deleted, or "sync"
  // while syncing.
  saving: string | null;
  status: string;
  // The staging access list couldn't be updated: shown as a warning.
  warning: boolean;
  error: string | null;
}

// For admins: the members and their roles, a page at a time, found by part
// of their username or email; changing a role (a staging tester may open
// the staging site), deleting a member, syncing staging access. Provided by
// the admin's members window.
export const AdminMembersStore = signalStore(
  withState<AdminMembersState>({
    members: null,
    count: 0,
    connected: null,
    searchTerm: '',
    page: 1,
    saving: null,
    status: '',
    warning: false,
    error: null,
  }),
  withComputed((store) => ({
    pages: computed(() => Array.from({ length: Math.ceil(store.count() / MEMBERS_PER_PAGE) }, (_, i) => i + 1)),
  })),
  withMethods((store, admin = inject(AdminService)) => {
    const load = rxMethod<void>(
      pipe(
        switchMap(() =>
          admin.members(store.searchTerm(), MEMBERS_PER_PAGE, (store.page() - 1) * MEMBERS_PER_PAGE).pipe(
            tapResponse({
              next: ({ users, usersCount, stagingAccessConnected }) =>
                patchState(store, { members: users, count: usersCount, connected: stagingAccessConnected }),
              error: (error: unknown) => patchState(store, { error: serverMessage(error) }),
            }),
          ),
        ),
      ),
    );
    const start = (what: string) => patchState(store, { saving: what, status: '', error: null });
    const done = (change: string, access: StagingAccessResult | undefined) =>
      patchState(store, {
        saving: null,
        warning: access ? !access.synced : false,
        status: `${change} ${access?.message ?? ''}`.trim(),
      });
    // The list shows what the backend has: reloaded after a refusal.
    const failed = (error: unknown) => {
      patchState(store, { saving: null, error: serverMessage(error) });
      load();
    };
    return {
      load,
      search: rxMethod<string>(
        pipe(
          debounceTime(SEARCH_DELAY_MS),
          distinctUntilChanged(),
          tap((term) => {
            patchState(store, { searchTerm: term, page: 1 });
            load();
          }),
        ),
      ),
      setPage: (page: number) => {
        patchState(store, { page });
        load();
      },
      changeRole: rxMethod<{ member: Member; role: AssignableRole }>(
        pipe(
          tap(({ member }) => start(member.username)),
          exhaustMap(({ member, role }) =>
            admin.setRole(member.id, role).pipe(
              tapResponse({
                next: ({ user, stagingAccess }) => {
                  patchState(store, ({ members }) => ({
                    members: members?.map((m) => (m.id === user.id ? user : m)) ?? null,
                  }));
                  done(`${user.username} is now ${ROLE_NAMES[role]}.`, stagingAccess);
                },
                error: failed,
              }),
            ),
          ),
        ),
      ),
      deleteMember: rxMethod<Member>(
        pipe(
          tap((member) => start(member.username)),
          exhaustMap((member) =>
            admin.deleteMember(member.id).pipe(
              tapResponse({
                next: ({ deleted, stagingAccess }) => {
                  done(
                    `Deleted ${deleted.username}, with ${plural(deleted.articles, 'post')} and ${plural(
                      deleted.comments,
                      'comment',
                    )}.`,
                    stagingAccess,
                  );
                  load();
                },
                error: failed,
              }),
            ),
          ),
        ),
      ),
      syncStagingAccess: rxMethod<void>(
        pipe(
          tap(() => start('sync')),
          exhaustMap(() =>
            admin
              .syncStagingAccess()
              .pipe(tapResponse({ next: ({ stagingAccess }) => done('', stagingAccess), error: failed })),
          ),
        ),
      ),
    };
  }),
  withHooks({ onInit: (store) => store.load() }),
);

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
