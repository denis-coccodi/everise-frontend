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
    expect(items.map((i) => i.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(items.map((i) => i.classList.contains('active'))).toEqual([false, true, false]);

    let chosen = 0;
    fixture.componentInstance.setPage.subscribe((page) => (chosen = page));
    items[2].click();
    expect(chosen).toBe(3);
  });
});
