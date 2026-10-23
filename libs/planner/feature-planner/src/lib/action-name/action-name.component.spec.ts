import { TestBed } from '@angular/core/testing';
import { API_URL } from '@everise/core/http-client';
import { ActionNameComponent } from './action-name.component';

describe('ActionNameComponent', () => {
  function render(icon: number | null, description: string | null) {
    TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: '/api' }] });
    const fixture = TestBed.createComponent(ActionNameComponent);
    fixture.componentRef.setInput('name', 'Adloquium');
    fixture.componentRef.setInput('icon', icon);
    fixture.componentRef.setInput('description', description);
    fixture.detectChanges();
    return { fixture, host: fixture.nativeElement as HTMLElement };
  }

  it('shows the icon before the name, and the tooltip on hover', () => {
    const { fixture, host } = render(2801, "Restores target's HP.\nCure Potency: 300");
    const tip = host.querySelector('[role=tooltip]') as HTMLElement;

    expect(host.querySelector('img')?.getAttribute('src')).toBe('/api/market/icons/2801');
    expect(host.querySelector('strong')?.textContent).toBe('Adloquium');
    expect(tip.textContent?.trim()).toBe("Restores target's HP.\nCure Potency: 300");
    expect(host.querySelector('.trigger')?.getAttribute('tabindex')).toBe('0');

    (host.querySelector('cdt-tooltip') as HTMLElement).dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(tip.classList).toContain('open');
  });

  it('shows the name alone without an icon or tooltip', () => {
    expect(render(null, null).host.textContent?.trim()).toBe('Adloquium');
  });

  it('drops an icon that fails to load', () => {
    const { fixture, host } = render(2801, null);
    expect(host.querySelector('cdt-tooltip')).toBeNull();
    host.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(host.querySelector('img')).toBeNull();
  });
});
