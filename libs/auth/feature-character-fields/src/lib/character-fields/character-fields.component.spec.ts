import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { API_URL } from '@everise/core/http-client';
import { characterRules } from '@everise/core/forms';
import { CharacterFieldsComponent } from './character-fields.component';

@Component({
  template: `<cdt-character-fields [name]="form.characterName" [world]="form.server" />`,
  imports: [CharacterFieldsComponent],
})
class HostComponent {
  readonly model = signal({ characterName: '', server: '' });
  readonly form = form(this.model, (path) => characterRules(path.characterName, path.server));
}

const REGIONS = {
  regions: [
    {
      id: 'europe',
      name: 'Europe',
      dataCentres: [
        { name: 'Chaos', worlds: [{ id: 39, name: 'Omega' }] },
        {
          name: 'Light',
          worlds: [
            { id: 33, name: 'Twintania' },
            { id: 71, name: 'Odin' },
          ],
        },
      ],
    },
    { id: 'japan', name: 'Japan', dataCentres: [{ name: 'Elemental', worlds: [{ id: 90, name: 'Aegis' }] }] },
  ],
  defaultRegion: 'europe',
  homeWorld: 'Odin',
};

describe('CharacterFieldsComponent', () => {
  async function render(server = '') {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api' }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.model.set({ characterName: '', server });
    fixture.detectChanges();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/market/regions');
    const page = fixture.nativeElement as HTMLElement;
    const name = page.querySelector('#character-name') as HTMLInputElement;
    const world = page.querySelector('#character-world') as HTMLSelectElement;
    const type = async (value: string) => {
      name.value = value;
      name.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const choose = async (value: string) => {
      world.value = value;
      world.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, page, request, name, world, type, choose, model: fixture.componentInstance.model };
  }

  it('lists the worlds a group per data centre, named with its region', async () => {
    const { fixture, request, world } = await render();
    request.flush(REGIONS);
    await fixture.whenStable();

    expect(world.closest('fieldset')?.querySelector('legend')?.textContent?.trim()).toBe('Your character');
    expect(world.labels?.[0].textContent?.trim()).toBe('World');
    expect(world.options[0].textContent).toBe('None');
    expect([...world.querySelectorAll('optgroup')].map((group) => group.label)).toEqual([
      'Chaos (Europe)',
      'Light (Europe)',
      'Elemental (Japan)',
    ]);
    expect([...world.querySelectorAll('optgroup[label^=Light] option')].map((option) => option.textContent)).toEqual([
      'Twintania',
      'Odin',
    ]);
  });

  it('fills in the name and world, both or neither', async () => {
    const { fixture, page, request, type, choose, model, name } = await render();
    request.flush(REGIONS);
    await fixture.whenStable();
    const errors = () => [...page.querySelectorAll('cdt-input-errors')].map((list) => list.textContent?.trim());

    await type('Avar Kriss');
    expect(errors()).toEqual(["Choose your character's world too, or leave the name empty.", '']);

    await choose('Odin');
    expect(model()).toEqual({ characterName: 'Avar Kriss', server: 'Odin' });
    expect(errors()).toEqual(['', '']);

    await type('Avar');
    expect(errors()[0]).toBe("Enter your character's first and last name as the game shows them, like Avar Kriss.");
    expect(name.getAttribute('aria-invalid')).toBe('true');

    await type('');
    expect(errors()).toEqual(['', "Enter your character's name too, or choose no world."]);
  });

  it("shows a saved world once the list arrives, and keeps it when the list can't be loaded", async () => {
    const loaded = await render('Odin');
    loaded.request.flush(REGIONS);
    await loaded.fixture.whenStable();
    expect(loaded.world.value).toBe('Odin');
    TestBed.resetTestingModule();

    const failed = await render('Odin');
    failed.request.flush({}, { status: 500, statusText: 'Server Error' });
    await failed.fixture.whenStable();
    expect(failed.world.value).toBe('Odin');
    expect(failed.page.querySelector('[role=alert]')?.textContent).toContain("Couldn't load the list of worlds");
  });
});
