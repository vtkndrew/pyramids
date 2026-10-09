import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const rod = (page: Page, n: number) => page.locator(`button[data-rod="${n - 1}"]`);

async function appPanel(page: Page) {
  if (
    !(await button(page, 'Установить приложение').count()) &&
    !(await button(page, 'Приложение').count())
  ) {
    await button(page, 'Меню').click();
  }

  await page.getByRole('button', { name: /^(Установить приложение|Приложение)$/ }).click();
}

async function ready(page: Page) {
  await appPanel(page);

  try {
    await expect(page.getByText('Готово к работе без интернета.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  } catch (error) {
    console.info(
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();

        return {
          active: reg?.active?.state,
          installing: reg?.installing?.state,
          waiting: reg?.waiting?.state,
          controller: navigator.serviceWorker.controller?.state,
          caches: await caches.keys(),
        };
      }),
    );
    throw error;
  }

  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
}

async function start(page: Page) {
  await button(page, 'Начать игру').click();
  await button(page, 'Играть').click();
}

async function deployment(context: BrowserContext, value: string) {
  await context.addCookies([{ name: 'pwa_test_version', value, url: 'http://127.0.0.1:4175' }]);
}

async function loseNetwork(context: BrowserContext, browserName: string) {
  // WebKit 1.63 rejects even literal SW responses with setOffline:
  // https://github.com/microsoft/playwright/issues/42775
  // The test server drops every connection for this context instead.
  if (browserName === 'webkit') {
    await context.addCookies([
      { name: 'pwa_test_offline', value: '1', url: 'http://127.0.0.1:4175' },
    ]);
  } else {
    await context.setOffline(true);
  }
}

test('manifest, icons and worker are scoped to the repository', async ({ page, request }) => {
  await page.goto('/pyramids/');
  await ready(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');

  expect(href).toBe('/pyramids/manifest.webmanifest');

  if (!href) {
    throw new Error('Missing manifest link');
  }

  const manifest = await (await request.get(href)).json();

  expect(manifest).toMatchObject({
    id: '/pyramids/',
    start_url: '/pyramids/',
    scope: '/pyramids/',
    name: 'Пирамидки',
    short_name: 'Пирамидки',
    display: 'standalone',
    lang: 'ru',
  });
  expect(manifest.orientation).toBeUndefined();

  for (const [name, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
  ] as const) {
    const response = await request.get(`/pyramids/icons/${name}`);

    expect(response.ok()).toBe(true);
    const png = await response.body();

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size]);
  }

  expect(
    manifest.icons.find((icon: { purpose: string }) => icon.purpose === 'maskable').sizes,
  ).toBe('512x512');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/pyramids/icons/apple-touch-icon.png',
  );
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope),
  ).toBe('http://127.0.0.1:4175/pyramids/');
  expect(
    await page.evaluate(async () =>
      Boolean(await navigator.serviceWorker.getRegistration('/another-app/')),
    ),
  ).toBe(false);
});

test('cached app cold-starts offline and keeps all game actions usable', async ({
  page,
  context,
  browserName,
}) => {
  await page.goto('/pyramids/');
  await ready(page);
  await button(page, 'Назад').click();
  await start(page);
  await rod(page, 1).tap();
  await rod(page, 3).tap();
  await loseNetwork(context, browserName);
  // Confirm the network is really unavailable, independently of the SW cache.
  expect(
    await page.evaluate(async () => {
      try {
        await fetch('/uncached-network-probe');

        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page.close();
  const next = await context.newPage();
  const response = await next.goto('/pyramids/');

  expect(response?.fromServiceWorker()).toBe(true);
  await button(next, 'Продолжить партию').click();
  await expect(next.locator('[data-testid=move-value]')).toHaveText('1');
  await button(next, 'Отменить').click();
  await button(next, 'Повторить').click();
  await button(next, 'Меню').click();
  await button(next, 'История игр').click();
  await expect(next.locator('[data-testid~=saved-game]')).toHaveCount(1);
  await button(next, 'Назад').click();
  await button(next, 'Настройки').click();
  await next.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await start(next);
  await expect(next.locator('[data-testid=move-value]')).toHaveText('0');
  await expect(next.getByRole('timer')).toHaveText('00:00');
  const r = await rod(next, 1).boundingBox();

  if (!r) {
    throw new Error('Expected visible element bounds');
  }

  await next.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await next.mouse.down();
  await next.mouse.move(r.x + r.width / 2 + 40, r.y + r.height / 2, {
    steps: 5,
  });
  await next.mouse.up();
  await expect(next.locator('[data-testid=move-value]')).toHaveText('1');
  await button(next, 'Отменить').click();
  await button(next, 'Повторить').click();
  await button(next, 'Пауза').click();
  await expect(next.locator('[data-testid~=rod]')).toHaveCount(0);
  await next.locator('[data-testid~=pause-button]').click();
  await expect(rod(next, 2)).toHaveAccessibleName(/Верхний диск: 1/);
  expect(
    await next.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // App-shell navigation fallback stays inside the repository scope.
  expect((await next.goto('/pyramids/offline-route'))?.fromServiceWorker()).toBe(true);
  await expect(button(next, 'Продолжить партию')).toBeVisible();
  await button(next, 'История игр').click();
  await expect(next.locator('[data-testid~=saved-game]')).toHaveCount(2);
});

test('install request is user-triggered, consumed once, and handles acceptance and cancellation', async ({
  page,
}) => {
  await page.goto('/pyramids/');
  await appPanel(page);

  async function offer(outcome: 'accepted' | 'dismissed') {
    await page.evaluate((outcome) => {
      const event = new Event('beforeinstallprompt', { cancelable: true });

      Object.assign(event, {
        prompt: async () => {
          document.documentElement.dataset.promptCalls = String(
            Number(document.documentElement.dataset.promptCalls || 0) + 1,
          );
        },
        userChoice: Promise.resolve({ outcome }),
      });
      window.dispatchEvent(event);
    }, outcome);
  }

  await offer('dismissed');
  expect(await page.locator('html').getAttribute('data-prompt-calls')).toBeNull();
  await button(page, 'Установить').click();
  await expect(page.getByText('Установка отменена.', { exact: false })).toBeVisible();
  await expect(button(page, 'Установить')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-prompt-calls', '1');
  await offer('accepted');
  await button(page, 'Установить').click();
  await expect(page.getByText('Установка подтверждена.', { exact: false })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-prompt-calls', '2');
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.getByText('Приложение установлено.', { exact: false })).toBeVisible();
  await button(page, 'Назад').click();
  await expect(button(page, 'Приложение')).toBeVisible();
  await expect(button(page, 'Установить приложение')).toHaveCount(0);
});

test('iOS instructions and standalone mode do not offer a duplicate install', async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'userAgent', {
      get: () =>
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
    }),
  );
  await page.goto('/pyramids/');
  await appPanel(page);
  await expect(page.getByText('Нажмите «Поделиться» → «На экран “Домой”».')).toBeVisible();
  await expect(page.getByText('Если есть переключатель', { exact: false })).toBeVisible();
  const installed = await context.newPage();

  await installed.addInitScript(() =>
    Object.defineProperty(navigator, 'standalone', { get: () => true }),
  );
  await installed.goto('/pyramids/');
  await expect(button(installed, 'Приложение')).toBeVisible();
  await appPanel(installed);
  await expect(installed.getByText('Приложение установлено.', { exact: false })).toBeVisible();
  await expect(button(installed, 'Установить')).toHaveCount(0);
});

test('application panel preserves draft, manual pause, focus and compact bounds', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/pyramids/');
  await page.getByRole('slider').fill('10');
  await ready(page);
  await button(page, 'Назад').click();
  await expect(page.getByRole('slider')).toHaveValue('10');
  await start(page);
  await rod(page, 1).tap();
  await rod(page, 3).tap();
  await button(page, 'Пауза').click();
  await appPanel(page);
  const time = await page.locator('[role="timer"]').textContent();

  await expect(page.locator('[data-testid~=rod]')).toHaveCount(0);
  await page.setViewportSize({ width: 568, height: 280 });

  for (const locator of [
    page.getByRole('dialog'),
    button(page, 'Закрыть окно'),
    button(page, 'Назад'),
  ]) {
    const r = await locator.boundingBox();

    if (!r) {
      throw new Error('Expected visible element bounds');
    }

    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.y + r.height).toBeLessThanOrEqual(280);
  }

  expect(
    await page.evaluate(
      () => scrollX === 0 && scrollY === 0 && document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(
      true,
    );
  }

  await page.keyboard.press('Escape');
  await expect(button(page, 'Меню')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Игра на паузе' })).toBeVisible();

  if (time === null) {
    throw new Error('Missing timer');
  }

  await expect(page.getByRole('timer')).toHaveText(time);
  await page.locator('[data-testid~=pause-button]').click();
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
  await expect(page.locator('[data-testid~=game-toolbar] button')).toHaveCount(4);
});

test('failed worker registration does not prevent online play', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.serviceWorker.register = () =>
      Promise.reject(new Error('Registration unavailable in this test'));
  });
  await page.goto('/pyramids/');
  await appPanel(page);
  await expect(page.getByText('Офлайн-режим пока недоступен.', { exact: false })).toBeVisible();
  await expect(page.getByText('Готово к работе без интернета.', { exact: true })).toHaveCount(0);
  await button(page, 'Назад').click();
  await start(page);
  await rod(page, 1).tap();
  await rod(page, 3).tap();
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
});

test('new build waits for consent; deferral preserves game; activation cleans only its cache', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;

    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (document.documentElement.dataset.rejectSave === 'yes') {
        throw new DOMException('Disk full', 'QuotaExceededError');
      }

      return original.apply(this, args);
    };
  });
  await page.goto('/pyramids/');
  await ready(page);
  const oldScript = await page.locator('script[type="module"]').getAttribute('src');

  await page.evaluate(async () => {
    const other = await caches.open('other-project');

    await other.put('/other-resource', new Response('keep me'));
  });
  await button(page, 'Назад').click();
  await start(page);
  await rod(page, 1).tap();
  await rod(page, 3).tap();
  const otherTab = await context.newPage();

  await otherTab.goto('/pyramids/');
  await expect(button(otherTab, 'Продолжить партию')).toBeVisible();
  await deployment(context, 'two');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      throw new Error('Missing service worker registration');
    }

    await registration.update();
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
      ),
    )
    .toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-pwa-test-build', 'one');
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
  await button(page, 'Меню').click();
  await expect(button(page, 'Доступна новая версия')).toBeVisible();
  await appPanel(page);
  await button(page, 'Обновить').click();
  await expect(
    page.getByText(
      'Игра сохранится и перезапустится. После обновления можно продолжить последнюю партию.',
    ),
  ).toBeVisible();
  await button(page, 'Позже').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
  await expect(page.locator('html')).toHaveAttribute('data-pwa-test-build', 'one');
  await appPanel(page);
  await button(page, 'Обновить').click();
  await page.evaluate(() => {
    document.documentElement.dataset.rejectSave = 'yes';
  });
  await button(page, 'Обновить и перезапустить').click();
  await expect(
    page.getByText('Не удалось сохранить партию. Обновление отложено; повторите сохранение.'),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-pwa-test-build', 'one');
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
  await page.evaluate(() => {
    delete document.documentElement.dataset.rejectSave;
  });
  await button(page, 'Обновить и перезапустить').click();
  await expect(page.locator('html')).toHaveAttribute('data-pwa-test-build', 'two', {
    timeout: 15_000,
  });
  await expect(button(page, 'Продолжить партию')).toBeVisible();
  await button(page, 'Продолжить партию').click();
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
  expect(await page.locator('script[type="module"]').getAttribute('src')).not.toBe(oldScript);
  await expect(otherTab.locator('html')).toHaveAttribute('data-pwa-test-build', 'one');
  await expect(button(otherTab, 'Продолжить партию')).toBeVisible();
  await otherTab.close();
  await ready(page);
  expect(
    await page.evaluate(async (oldScript) => {
      const cacheName = (await caches.keys()).find((name) => name.startsWith('pyramids-precache-'));

      if (!cacheName || !oldScript) {
        throw new Error('Missing cache or previous script URL');
      }

      const cache = await caches.open(cacheName);

      return Boolean(await cache.match(oldScript, { ignoreSearch: true }));
    }, oldScript),
  ).toBe(false);
  expect(
    await page.evaluate(async () =>
      (await (await caches.open('other-project')).match('/other-resource'))?.text(),
    ),
  ).toBe('keep me');
});

test('foreground update checks are throttled to one per hour', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now.bind(Date);

    Date.now = () => now() + Number(document.documentElement?.dataset.testTimeOffset || 0);
    const update = ServiceWorkerRegistration.prototype.update;

    ServiceWorkerRegistration.prototype.update = function () {
      document.documentElement.dataset.updateCalls = String(
        Number(document.documentElement.dataset.updateCalls || 0) + 1,
      );

      return update.call(this);
    };
  });
  await page.goto('/pyramids/');
  await ready(page);
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
  });
  expect(await page.locator('html').getAttribute('data-update-calls')).toBeNull();
  await page.evaluate(() => {
    document.documentElement.dataset.testTimeOffset = String(60 * 60 * 1000 + 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-update-calls', '1');
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-update-calls', '1');
});
