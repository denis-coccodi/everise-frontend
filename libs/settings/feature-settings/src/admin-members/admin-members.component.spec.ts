import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Member } from '@realworld/core/api-types';
import { API_URL } from '@realworld/core/http-client';
import { AdminMembersComponent } from './admin-members.component';

const members: Member[] = [
  { username: 'Minfilia', email: 'minfilia@example.com', image: '/m.png', role: 'admin' },
  { username: 'Thancred', email: 'thancred@example.com', image: '/t.png', role: 'user' },
];

describe('AdminMembersComponent', () => {
  const list = (r: { url: string }) => r.url === '/admin/users';

  async function render(response: object = { users: members, usersCount: 2, stagingAccessConnected: true }) {
    TestBed.configureTestingModule({
      imports: [AdminMembersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '' },
      ],
    });
    const fixture = TestBed.createComponent(AdminMembersComponent);
    const http = TestBed.inject(HttpTestingController);
    const first = http.expectOne(list);
    expect(first.request.params.toString()).toBe('search=&limit=20&offset=0');
    first.flush(response);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, http, page };
  }

  it('lists the members, with a labelled role choice for everyone but admins', async () => {
    const { page } = await render();

    const rows = [...page.querySelectorAll('.member')] as HTMLElement[];
    expect(rows.map((r) => r.querySelector('.name')?.textContent?.trim())).toEqual(['Minfilia', 'Thancred']);
    expect(rows[0].querySelector('select')).toBeNull();
    expect(rows[0].querySelector('.admin')?.textContent?.trim()).toBe('Admin');

    const select = rows[1].querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('user');
    expect((select.labels?.[0] as HTMLLabelElement).textContent?.trim()).toBe('Role of Thancred');
  });

  it('changes a role and says whether staging access followed', async () => {
    const { fixture, http, page } = await render();
    const select = page.querySelectorAll('select')[0] as HTMLSelectElement;

    select.value = 'staging-tester';
    select.dispatchEvent(new Event('change'));
    const request = http.expectOne('/admin/users/Thancred/role');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBe(JSON.stringify({ role: 'staging-tester' }));
    request.flush({
      user: { ...members[1], role: 'staging-tester' },
      stagingAccess: { synced: false, message: "Staging access isn't connected on this backend." },
    });
    await fixture.whenStable();

    const status = page.querySelector('.status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent?.trim()).toBe(
      "Thancred is now a staging tester. Staging access isn't connected on this backend.",
    );
    expect(status.classList).toContain('warning');
  });

  it('syncs staging access on request', async () => {
    const { fixture, http, page } = await render();

    (page.querySelector('button') as HTMLButtonElement).click();
    const request = http.expectOne('/admin/staging-access');
    expect(request.request.method).toBe('POST');
    request.flush({ stagingAccess: { synced: true, message: 'Staging access updated: 2 people can open staging.' } });
    await fixture.whenStable();

    expect(page.querySelector('.status')?.textContent?.trim()).toBe(
      'Staging access updated: 2 people can open staging.',
    );
    expect(page.querySelector('.status')?.classList).not.toContain('warning');
  });

  it('searches by username or email once typing pauses, and says how many match', async () => {
    const { fixture, http, page } = await render();
    const search = page.querySelector('#member-search') as HTMLInputElement;
    expect(search.labels?.[0].textContent?.trim()).toBe('Search by username or email');

    search.value = ' thanc ';
    search.dispatchEvent(new Event('input'));
    http.expectNone(list);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const request = http.expectOne(list);
    expect(request.request.params.get('search')).toBe('thanc');
    request.flush({ users: [members[1]], usersCount: 1, stagingAccessConnected: true });
    await fixture.whenStable();

    expect(page.querySelector('.count')?.textContent?.trim()).toBe('1 member matches "thanc".');
    expect(page.querySelectorAll('.member')).toHaveLength(1);
  });

  it('pages through many members', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...members[1], username: `Member${i}` }));
    const { fixture, http, page } = await render({ users: many, usersCount: 45, stagingAccessConnected: true });

    const pager = page.querySelector('cdt-pager nav') as HTMLElement;
    expect(pager.getAttribute('aria-label')).toBe('Member pages');
    const buttons = [...pager.querySelectorAll('button')];
    expect(buttons).toHaveLength(3);

    buttons[2].click();
    const request = http.expectOne(list);
    expect(request.request.params.get('offset')).toBe('40');
    request.flush({ users: many.slice(0, 5), usersCount: 45, stagingAccessConnected: true });
    await fixture.whenStable();
    expect(page.querySelectorAll('.member')).toHaveLength(5);
  });

  it("warns up front when role changes don't reach staging access", async () => {
    const connected = await render();
    expect(connected.page.querySelector('.notice')).toBeNull();

    TestBed.resetTestingModule();
    const { page } = await render({ users: members, usersCount: 2, stagingAccessConnected: false });
    expect(page.querySelector('.notice')?.textContent).toContain('CF_ACCESS_API_TOKEN');
  });
});
