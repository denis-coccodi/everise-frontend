import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('user', { email: '', username: '', bio: '', image: '' });
    fixture.componentRef.setInput('isLoggedIn', false);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([false, true])(
    'links to the roulette whether or not someone is logged in (logged in: %s)',
    async (loggedIn) => {
      fixture.componentRef.setInput('isLoggedIn', loggedIn);
      await fixture.whenStable();

      const roulette = (fixture.nativeElement as HTMLElement).querySelector('a[href="/roulette"]');
      expect(roulette?.textContent).toContain('Roulette');
    },
  );
});
