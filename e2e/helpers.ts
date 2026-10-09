import { expect, type Page } from '@playwright/test';

export const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

export async function menuAction(page: Page, name: string) {
  if (!(await button(page, name).count())) {
    await button(page, 'Меню').click();
  }

  await button(page, name).click();
}

export async function expectStep(page: Page, cursor: number, total: number) {
  await expect(page.locator('[data-testid=move-value]')).toHaveText(String(cursor));
  const history = page.locator('[data-testid~=history-position]');

  if (await history.count()) {
    await expect(history).toHaveText(`Шаг ${cursor} из ${total}`);
  }
}
