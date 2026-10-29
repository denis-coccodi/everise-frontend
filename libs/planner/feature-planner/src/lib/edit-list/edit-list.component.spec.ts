import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import type { EditItem } from '@everise/planner/data-access';
import { EditListComponent } from './edit-list.component';

describe('EditListComponent', () => {
  const added: EditItem = {
    kind: 'added',
    edit: { player: 1, action: 17, at: 20_000, target: 2 },
    action: 'Sentinel',
    icon: null,
    target: 'Moha A',
  };
  const removed: EditItem = {
    kind: 'removed',
    edit: { player: 1, action: 7531, at: 62_300 },
    action: 'Rampart',
    icon: null,
    target: null,
  };

  function render(items: EditItem[]) {
    TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: '' }] });
    const fixture = TestBed.createComponent(EditListComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    return fixture;
  }

  it('lists each edit with its own Undo', () => {
    const fixture = render([added, removed]);
    const host = fixture.nativeElement as HTMLElement;
    const lines = [...host.querySelectorAll('li > span')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());

    expect(lines).toEqual(['Added Sentinel at 0:20.0 on Moha A', 'Removed Rampart at 1:02.3']);
    expect(host.querySelectorAll('li button')).toHaveLength(2);
  });

  it('says which edit to undo', () => {
    const fixture = render([added, removed]);
    const undone: EditItem[] = [];
    fixture.componentInstance.undone.subscribe((item) => undone.push(item));

    (fixture.nativeElement as HTMLElement).querySelectorAll('li button')[1].dispatchEvent(new Event('click'));

    expect(undone).toEqual([removed]);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('li button')[1].textContent).toContain(
      'Undo removing Rampart at 1:02.3',
    );
  });
});
