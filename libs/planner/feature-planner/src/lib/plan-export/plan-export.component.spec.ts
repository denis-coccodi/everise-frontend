import { planEveryone, renderPull, waitFor } from '../planner-page-testing';

describe('PlanExportComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  const button = (page: HTMLElement) =>
    [...page.querySelectorAll<HTMLButtonElement>('cdt-planner-plan-export button')].find((b) =>
      b.textContent?.includes('spreadsheet'),
    );

  it('offers the plan as a spreadsheet once there is one', async () => {
    const rendered = await renderPull();
    expect(button(rendered.page)).toBeUndefined();

    await planEveryone(rendered);

    expect(button(rendered.page)?.textContent?.trim()).toBe('Download as a spreadsheet (.xlsx)');
  });

  it('downloads it, named after the fight and pull', async () => {
    const rendered = await renderPull();
    await planEveryone(rendered);
    const saved: { name: string; type: string }[] = [];
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blob = b as Blob;
      return 'blob:plan';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ name: this.download, type: blob?.type ?? '' });
    });

    button(rendered.page)?.click();
    await waitFor(rendered, () => saved.length > 0);

    expect(saved).toEqual([
      {
        name: 'vamp-fatale-pull-3-plan.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ]);
  });
});
