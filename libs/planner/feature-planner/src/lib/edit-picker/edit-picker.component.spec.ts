import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import type { PickedSkill } from '@everise/planner/data-access';
import type { EditChoice } from '@everise/planner/scheduler';
import { EditPickerComponent } from './edit-picker.component';

describe('EditPickerComponent', () => {
  const caress: EditChoice = {
    action: 37011,
    name: 'Divine Caress',
    gcd: false,
    ok: true,
    reason: null,
    replaces: null,
    targeted: false,
    icon: null,
    description: null,
    replacesIcon: null,
    first: { action: 16536, name: 'Temperance', icon: null, at: 61_300 },
  };

  function render(choices: EditChoice[]) {
    TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: '' }] });
    const fixture = TestBed.createComponent(EditPickerComponent);
    fixture.componentRef.setInput('slots', [{ at: 62_000, label: 'After Glare III at 1:01.4' }]);
    fixture.componentRef.setInput('choicesFor', () => choices);
    fixture.componentRef.setInput('key', '62000');
    fixture.detectChanges();
    return fixture;
  }

  it('says what a skill needs first comes with it, and adds both', () => {
    const fixture = render([caress]);
    const host = fixture.nativeElement as HTMLElement;
    const picked: PickedSkill[] = [];
    fixture.componentInstance.picked.subscribe((p) => picked.push(p));

    expect(host.querySelector('.choices li')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Add Divine Caress with Temperance at 1:01.3 first',
    );
    host.querySelector<HTMLButtonElement>('.choices button')?.click();

    expect(picked).toEqual([{ at: 62_000, action: 37011, target: null, first: { action: 16536, at: 61_300 } }]);
  });

  it('adds a skill alone when it needs nothing first', () => {
    const fixture = render([{ ...caress, first: null }]);
    const picked: PickedSkill[] = [];
    fixture.componentInstance.picked.subscribe((p) => picked.push(p));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.choices button')?.click();

    expect(picked).toEqual([{ at: 62_000, action: 37011, target: null, first: null }]);
  });
});
