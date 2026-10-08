import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PartyFinderListing } from '@everise/core/api-types';
import { API_URL } from '@everise/core/http-client';
import { PfPartyComponent } from './pf-party.component';

type Slot = PartyFinderListing['slots'][number];

const paladin = (): Slot[] => [{ job: 'PLD', icon: 62119, roles: [], accepts: [] }];

describe('PfPartyComponent', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [PfPartyComponent],
      providers: [{ provide: API_URL, useValue: '' }],
    });
    const fixture = TestBed.createComponent(PfPartyComponent);
    const ref: ComponentRef<PfPartyComponent> = fixture.componentRef;
    ref.setInput('slots', paladin());
    ref.setInput('icons', { tank: 62581, healer: 62582, dps: 62583, beginner: 61523 });
    await fixture.whenStable();
    return { fixture, ref, root: fixture.nativeElement as HTMLElement };
  }

  it("shows a job in words when its icon doesn't load, and tries the icon again on the next refresh", async () => {
    const { fixture, ref, root } = await render();

    root.querySelector('img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.slot')?.textContent?.trim()).toBe('PLD');

    // The listings are read again: new slots, the icon is tried again.
    ref.setInput('slots', paladin());
    await fixture.whenStable();
    expect(root.querySelector('img')?.getAttribute('src')).toBe('/images/62119');
  });
});
