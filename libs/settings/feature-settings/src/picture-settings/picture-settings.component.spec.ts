import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@everise/auth/data-access';
import { PictureSettingsComponent } from './picture-settings.component';

describe('PictureSettingsComponent', () => {
  async function render(image: string) {
    const authStore = {
      user: signal({ image }),
      imageBusy: signal(false),
      imageError: signal<string | null>('An old problem.'),
      setImageError: vi.fn(),
      uploadImage: vi.fn(),
      removeImage: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [PictureSettingsComponent],
      providers: [{ provide: AuthStore, useValue: authStore }],
    });
    const fixture = TestBed.createComponent(PictureSettingsComponent);
    await fixture.whenStable();
    return { page: fixture.nativeElement as HTMLElement, authStore };
  }

  function buttons(page: HTMLElement) {
    return [...page.querySelectorAll('button')].map((button) => button.textContent?.trim());
  }

  it('clears a problem from an earlier visit', async () => {
    const { authStore } = await render('/a.png');

    expect(authStore.setImageError).toHaveBeenCalledWith(null);
  });

  it('offers to remove an uploaded picture, not the default one', async () => {
    expect(buttons((await render('/assets/images/avatar-profile.png')).page)).toEqual(['Choose a picture']);

    TestBed.resetTestingModule();
    const { page, authStore } = await render('https://everise.test/api/profile-images/p1');
    expect(buttons(page)).toEqual(['Choose a picture', 'Remove']);

    (page.querySelectorAll('button')[1] as HTMLButtonElement).click();
    expect(authStore.removeImage).toHaveBeenCalled();
  });
});
