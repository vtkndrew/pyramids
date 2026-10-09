import { writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function readSave(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('pyramids-saves:/pyramids/', 1);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(['meta', 'boards', 'summaries']);
    const read = <T>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const [head, boards, summaries] = await Promise.all([
      read(tx.objectStore('meta').get('latest')),
      read(tx.objectStore('boards').getAll()),
      read(tx.objectStore('summaries').getAll()),
    ]);

    db.close();

    return { head, boards, summaries };
  });
}

// Run with PWA_BASELINE_DIR pointing to an actual build from before the refactor.
// Use accessible UI and the persisted contract, not either build's CSS classes.
test('previous production build upgrades with its saved game and cold-starts offline', async ({
  page,
  context,
  browserName,
}, testInfo) => {
  await page.goto('/pyramids/');
  await button(page, 'Установить приложение').click();
  await expect(page.getByText('Готово к работе без интернета.', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await button(page, 'Назад').click();
  await button(page, 'Начать игру').click();
  await page.getByRole('radio', { name: 'Нажатия', exact: true }).check();
  await button(page, 'Играть').click();

  for (const n of [1, 3, 1, 2]) {
    await page.getByRole('button', { name: new RegExp(`^Стержень ${n}`) }).click();
  }

  await button(page, 'Отменить').click();
  await expect.poll(async () => (await readSave(page)).head.cursor).toBe(1);
  await button(page, 'Меню').click();
  await button(page, 'Установить приложение').click();
  const before = await readSave(page);

  expect(before.head).toMatchObject({
    version: 1,
    config: { rods: 3, disks: 5, mode: 'classic' },
    control: 'tap',
    cursor: 1,
    length: 3,
  });
  await writeFile(testInfo.outputPath('legacy-save-v1.json'), JSON.stringify(before, null, 2));
  await context.addCookies([
    { name: 'pwa_test_version', value: 'two', url: 'http://127.0.0.1:4175' },
  ]);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      throw new Error('Missing service worker registration');
    }

    await registration.update();
  });
  await button(page, 'Обновить').click();
  await button(page, 'Позже').click();
  expect((await readSave(page)).boards).toEqual(before.boards);
  await button(page, 'Обновить').click();
  await button(page, 'Обновить и перезапустить').click();
  await expect(page.locator('html')).toHaveAttribute('data-pwa-test-build', 'two', {
    timeout: 15000,
  });
  await expect(button(page, 'Продолжить партию')).toBeVisible();
  const after = await readSave(page);

  expect(after.head).toMatchObject({
    id: before.head.id,
    config: before.head.config,
    control: 'tap',
    cursor: 1,
    length: 3,
    elapsed: before.head.elapsed,
  });
  expect(after.boards).toEqual(before.boards);
  expect(after.summaries).toHaveLength(1);
  await button(page, 'Продолжить партию').click();
  await button(page, 'Повторить').click();
  await expect(page.getByTestId('move-value')).toHaveText('2');
  await button(page, 'Отменить').click();
  await button(page, 'Отменить').click();
  await expect(page.getByTestId('move-value')).toHaveText('0');
  await button(page, 'Повторить').click();
  await button(page, 'Пауза').click();
  await expect.poll(async () => (await readSave(page)).head.cursor).toBe(1);
  await button(page, 'Меню').click();
  await button(page, 'Установить приложение').click();
  await expect(page.getByText('Готово к работе без интернета.', { exact: true })).toBeVisible();
  await page.close();

  if (browserName === 'webkit') {
    await context.addCookies([
      { name: 'pwa_test_offline', value: '1', url: 'http://127.0.0.1:4175' },
    ]);
  } else {
    await context.setOffline(true);
  }

  const offline = await context.newPage();

  await offline.goto('/pyramids/');
  await button(offline, 'Продолжить партию').click();
  await expect(offline.getByTestId('move-value')).toHaveText('1');
  await button(offline, 'Повторить').click();
  await expect(offline.getByTestId('move-value')).toHaveText('2');
  await offline.close();
});
