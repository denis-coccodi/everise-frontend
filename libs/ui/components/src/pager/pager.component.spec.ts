import { TestBed } from '@angular/core/testing';
import { PagerComponent } from './pager.component';

describe('PagerComponent', () => {
  it('lists the pages, marks the current one and reports the chosen page', async () => {
    await TestBed.configureTestingModule({ imports: [PagerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PagerComponent);
    fixture.componentRef.setInput('currentPage', 2);
    fixture.componentRef.setInput('totalPages', [1, 2, 3]);
    await fixture.whenStable();

    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.page-item')] as HTMLElement[];
    expect(items.map((i) => i.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Page 1', 'Page 2', 'Page 3']);
    expect(items.map((i) => i.classList.contains('active'))).toEqual([false, true, false]);
    const buttons = items.map((i) => i.querySelector('button') as HTMLButtonElement);
    expect(buttons.map((b) => b.getAttribute('aria-current'))).toEqual([null, 'page', null]);
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.getAttribute('aria-label')).toBe('Pages');

    let chosen = 0;
    fixture.componentInstance.setPage.subscribe((page) => (chosen = page));
    buttons[2].click();
    expect(chosen).toBe(3);
  });
});
