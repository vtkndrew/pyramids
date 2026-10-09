import { expect, test, type Page } from '@playwright/test';

import { menuAction } from './helpers';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const rod = (page: Page, n: number) => page.locator(`button[data-rod="${n - 1}"]`);

async function start(page: Page) {
  await button(page, 'Начать игру').click();
  await button(page, 'Играть').click();
}

async function move(page: Page, a: number, b: number) {
  await rod(page, a).click();
  await rod(page, b).click();
}

async function saved(page: Page, moves: number) {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('pyramids-saves:/', 1);

          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        try {
          return await new Promise<number | undefined>((resolve) => {
            const req = db.transaction('meta').objectStore('meta').get('latest');

            req.onsuccess = () => resolve(req.result?.cursor);
          });
        } finally {
          db.close();
        }
      }),
    )
    .toBe(moves);
}

test('reload restores only latest game, future history, control and time; older games are summaries', async ({
  page,
}) => {
  await page.goto('/');
  await start(page);
  await move(page, 1, 3);
  await move(page, 1, 2);
  await button(page, 'Отменить').click();
  await page.clock.install();
  await page.clock.fastForward(2100);
  await saved(page, 1);
  await page.reload();
  await expect(button(page, 'Продолжить партию')).toBeVisible();
  await button(page, 'Новая игра').click();

  if (await page.locator('[data-compact=true]').count()) {
    await page.keyboard.press('Escape');
  } else {
    await button(page, 'Назад к игре').click();
  }

  await expect(button(page, 'Продолжить партию')).toBeVisible();
  await expect(page.locator('[data-testid~=rod]')).toHaveCount(0);
  await button(page, 'Продолжить партию').click();
  await expect(page.locator('[data-testid=move-value]')).toHaveText('1');
  await expect(button(page, 'Повторить')).toBeEnabled();
  await button(page, 'Повторить').click();
  await expect(page.locator('[data-testid=move-value]')).toHaveText('2');
  await menuAction(page, 'Начать заново');
  await saved(page, 0);
  await menuAction(page, 'История игр');
  await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(2);
  await expect(page.locator('[data-testid~=saved-game]').nth(1)).toContainText('Не завершена');
  await expect(page.locator('[data-testid~=saved-game]').nth(1).getByRole('button')).toHaveCount(0);
  await expect(page.locator('[data-testid~=saved-game]').first()).toContainText('В процессе');
});

test('background pauses automatically and opening/cancelling settings does not create another game', async ({
  page,
}) => {
  await page.goto('/');
  await start(page);
  await move(page, 1, 3);
  await page.clock.install();
  await page.clock.fastForward(3100);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('[data-testid~=pause-button]')).toHaveText('Продолжить');
  const elapsed = await page.getByRole('timer').textContent();

  await page.clock.fastForward(10000);

  if (elapsed === null) {
    throw new Error('Missing saved timer');
  }

  await expect(page.getByRole('timer')).toHaveText(elapsed);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('[data-testid~=rod]')).toHaveCount(0);
  await menuAction(page, 'Настройки');
  await button(page, 'Начать игру').click();
  await page.keyboard.press('Escape');
  await button(page, 'Назад к игре').click();
  await menuAction(page, 'История игр');
  await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(1);
});

test('two windows cannot replace each other’s latest save', async ({ page, context }) => {
  await page.goto('/');
  await start(page);
  await move(page, 1, 3);
  await saved(page, 1);
  await button(page, 'Пауза').click();
  const other = await context.newPage();

  await other.goto('/');
  await button(other, 'Продолжить партию').click();
  await move(other, 1, 2);
  await saved(other, 2);
  await page.locator('[data-testid~=pause-button]').click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Сохранение партии', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').getByText('Партия изменена в другом окне.', { exact: true }),
  ).toBeVisible();
  await button(other, 'Пауза').click();
  await button(page, 'Загрузить актуальное сохранение').click();
  await button(page, 'Продолжить партию').click();
  await expect(page.locator('[data-testid=move-value]')).toHaveText('2');
  await other.close();
});

test('victory is one record and undo/redo updates its status after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('slider').fill('3');
  await start(page);

  for (const [a, b] of [
    [1, 3],
    [1, 2],
    [3, 2],
    [1, 3],
    [2, 1],
    [2, 3],
    [1, 3],
  ]) {
    await move(page, a, b);
  }

  await saved(page, 7);
  await page.reload();
  await button(page, 'Открыть последнюю партию').click();
  await expect(button(page, 'Пауза')).toBeDisabled();
  await button(page, 'Отменить').click();
  await menuAction(page, 'История игр');
  await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(1);
  await expect(page.locator('[data-testid~=saved-game]')).toContainText('В процессе');
  await button(page, 'Продолжить партию').click();
  await button(page, 'Повторить').click();
  await menuAction(page, 'История игр');
  await expect(page.locator('[data-testid~=saved-game]')).toContainText('Победа');
});

test('native IndexedDB transactions incrementally save, branch, reject conflicts and validate corruption', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite serves source modules in development.
    const { SaveRepository, SaveConflict, InvalidSave, NewerSave } =
      await import('/src/entities/game/index.ts');
    // @ts-expect-error Vite serves source modules in development.
    const { createGame, gameReducer } = await import('/src/entities/game/index.ts');
    const name = 'pyramids-test-transactions';
    const one = new SaveRepository(name);

    await one.load();
    let game = createGame({ rods: 3, disks: 3, mode: 'hardcore' });
    const snapshot = () => ({
      id: 'one',
      startedAt: 1,
      game,
      control: 'swipe',
      elapsed: 1000,
    });

    await one.commit(snapshot());
    game = gameReducer(game, { type: 'move', from: 0, to: 1 });
    await one.commit(snapshot());
    game = gameReducer(game, { type: 'move', from: 1, to: 2 });
    await one.commit(snapshot());
    game = gameReducer(game, { type: 'undo' });
    await one.commit(snapshot());
    const two = new SaveRepository(name);
    const restored = await two.load();
    const future = restored.game.history.length === 3 && restored.game.cursor === 1;

    game = gameReducer(game, { type: 'move', from: 1, to: 0 });
    await one.commit(snapshot());
    let conflict = false;

    try {
      await two.commit(restored);
    } catch (e) {
      conflict = e instanceof SaveConflict;
    }

    const branch = await new SaveRepository(name).load();
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open(name);

      r.onsuccess = () => resolve(r.result);
    });
    const corrupt = (version: number) =>
      new Promise<void>((resolve) => {
        const tx = db.transaction('meta', 'readwrite');
        const store = tx.objectStore('meta');
        const req = store.get('latest');

        req.onsuccess = () => store.put({ ...req.result, version, elapsed: -1 }, 'latest');
        tx.oncomplete = () => resolve();
      });

    await corrupt(1);
    let invalid = false;

    try {
      await one.load();
    } catch (e) {
      invalid = e instanceof InvalidSave;
    }

    await corrupt(2);
    let unknown = false;

    try {
      await one.load();
    } catch (e) {
      unknown = e instanceof NewerSave;
    }

    db.close();

    return {
      future,
      conflict,
      branch: branch.game.history[2][0].at(-1) === 1,
      invalid,
      unknown,
    };
  });

  expect(result).toEqual({
    future: true,
    conflict: true,
    branch: true,
    invalid: true,
    unknown: true,
  });
});

test('storage and persistence denial leave the game playable; retry recovers', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;

    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory['open']>) {
      if (!document.documentElement.dataset.allowStorage) {
        throw new DOMException('Unavailable', 'SecurityError');
      }

      return original.apply(this, args);
    };

    Object.defineProperty(navigator.storage, 'persist', {
      value: () => Promise.reject(new Error('denied')),
    });
  });
  await page.goto('/');
  await start(page);
  await move(page, 1, 3);
  await expect(page.getByText('Прогресс не сохраняется.', { exact: false }).first()).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.allowStorage = 'yes';
  });

  if (await page.locator('[data-compact=true]').count()) {
    await button(page, 'Меню').click();
  }

  await button(page, 'Повторить сохранение').click();
  await saved(page, 1);
  await expect(page.getByText('Прогресс не сохраняется.', { exact: false })).toHaveCount(0);
});

test('59048-move save restores all undo/redo states, appends one board and paginates summaries', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile', 'Same Chromium storage is tested on desktop.');
  test.setTimeout(120000);
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module
    const { SaveRepository } = await import('/src/entities/game/index.ts');
    // @ts-expect-error Vite source module
    const { createGame, gameReducer, moveError, isWon } =
      await import('/src/entities/game/index.ts');
    const repo = new SaveRepository('pyramids-stress');

    await repo.load();
    const config = { rods: 3, disks: 10, mode: 'hardcore' };
    const initial = createGame(config);
    const history = [initial.history[0]];

    const step = (from: number, to: number) => {
      const board = history.at(-1);

      if (moveError(board, from, to, 'hardcore')) {
        throw new Error('invalid move');
      }

      const next = board.map((rod: number[]) => [...rod]);

      next[to].push(next[from].pop());
      history.push(next);
    };

    const solve = (n: number, from: number, to: number): void => {
      if (!n) {
        return;
      }

      solve(n - 1, from, to);
      step(from, 1);
      solve(n - 1, to, from);
      step(1, to);
      solve(n - 1, from, to);
    };

    solve(10, 0, 2);
    let game = {
      ...initial,
      history: history.slice(0, -1),
      cursor: history.length - 2,
    };
    const snap = () => ({
      id: 'long',
      startedAt: 1,
      game,
      control: 'swipe',
      elapsed: 3600000,
    });

    await repo.commit(snap());
    let puts = 0;
    const original = IDBObjectStore.prototype.put;

    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'boards') {
        puts++;
      }

      return original.apply(this, args);
    };

    game = { ...game, history, cursor: history.length - 1 };
    await repo.commit(snap());
    const appended = puts;
    const reader = new SaveRepository('pyramids-stress');
    const loaded = await reader.load();

    game = gameReducer(loaded.game, { type: 'resume' });

    for (let n = 0; n < 59048; n++) {
      game = gameReducer(game, { type: 'undo' });
    }

    await reader.commit(snap());
    const undone = game.cursor === 0;

    for (let n = 0; n < 59048; n++) {
      game = gameReducer(game, { type: 'redo' });
    }

    await reader.commit(snap());
    const redone = isWon(game);
    const boardWrites = puts;

    for (let n = 0; n < 51; n++) {
      await reader.commit({
        id: `short-${n}`,
        startedAt: 10 + n,
        game: initial,
        control: 'swipe',
        elapsed: 0,
      });
    }

    const first = await reader.list(50);
    const second = await reader.list(100);

    IDBObjectStore.prototype.put = original;

    return {
      length: loaded.game.history.length,
      appended,
      boardWrites,
      undone,
      redone,
      first: first.records.length,
      more: first.more,
      total: second.records.length,
    };
  });

  expect(result).toEqual({
    length: 59049,
    appended: 1,
    boardWrites: 1,
    undone: true,
    redone: true,
    first: 50,
    more: true,
    total: 52,
  });
});

test('history paginates in a bounded modal and only the latest record can reopen', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module
    const { SaveRepository } = await import('/src/entities/game/index.ts');
    // @ts-expect-error Vite source module
    const { createGame } = await import('/src/entities/game/index.ts');
    const repo = new SaveRepository();

    await repo.load();
    const game = createGame({ rods: 3, disks: 5, mode: 'classic' });

    // Equal wall-clock timestamps must not scramble the most recently started game.
    for (let n = 0; n < 52; n++) {
      await repo.commit({
        id: `game-${n}`,
        startedAt: 1000,
        game,
        control: 'drag',
        elapsed: n * 1000,
      });
    }
  });
  await page.reload();
  await button(page, 'История игр').click();
  await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(50);
  await expect(page.locator('[data-testid~=saved-game]').first()).toContainText('00:51');
  await expect(button(page, 'Продолжить партию')).toHaveCount(1);
  await button(page, 'Показать ещё').click();
  await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(52);

  for (const [width, height] of [
    [320, 480],
    [390, 844],
    [568, 280],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('[data-compact=true]')).toHaveCount(1);
    expect(
      await page.evaluate(() => {
        const dialogElement = document.querySelector('dialog');

        if (!dialogElement) {
          throw new Error('Missing dialog element');
        }

        const dialog = dialogElement.getBoundingClientRect();
        const footerElement = document.querySelector('[data-testid~=dialog-footer]');

        if (!footerElement) {
          throw new Error('Missing footer element');
        }

        const footer = footerElement.getBoundingClientRect();
        const body = document.querySelector('[data-testid~=saved-games]');

        if (!body) {
          throw new Error('Missing history body');
        }

        return (
          dialog.top >= 0 &&
          dialog.bottom <= innerHeight &&
          dialog.left >= 0 &&
          dialog.right <= innerWidth &&
          footer.bottom <= innerHeight &&
          body.scrollHeight > body.clientHeight &&
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth
        );
      }),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`history-${width}x${height}.png`),
    });
  }

  await button(page, 'Назад').click();
  await expect(button(page, 'Продолжить партию')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(button(page, 'Вернуться к сохранению')).toBeFocused();
});

for (const version of [1, 99]) {
  test(`corrupt or incompatible latest save is never replaced with an older game: ${version}`, async ({
    page,
  }) => {
    await page.goto('/');
    await start(page);
    await move(page, 1, 3);
    await saved(page, 1);
    await menuAction(page, 'Начать заново');
    await saved(page, 0);
    await button(page, 'Пауза').click();
    await page.evaluate(async (version) => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open('pyramids-saves:/');

        r.onsuccess = () => resolve(r.result);
      });

      await new Promise<void>((resolve) => {
        const tx = db.transaction('meta', 'readwrite');
        const store = tx.objectStore('meta');
        const req = store.get('latest');

        req.onsuccess = () =>
          store.put(
            {
              ...req.result,
              revision: req.result.revision + 1,
              version,
              elapsed: -1,
            },
            'latest',
          );
        tx.oncomplete = () => resolve();
      });
      db.close();
    }, version);
    await page.reload();

    if (version === 99) {
      await expect(
        page.getByRole('dialog').getByText('Неизвестная версия сохранения. Обновите приложение.'),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await button(page, 'Настроить игру').click();
    } else {
      await expect(
        page.getByText('Последнее сохранение повреждено.', { exact: false }).first(),
      ).toBeVisible();
    }

    await button(page, 'История игр').click();
    await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(2);
    await expect(page.locator('[data-testid~=saved-game] button')).toHaveCount(0);
    await button(page, 'Назад').click();

    if (version === 1) {
      await start(page);
      await saved(page, 0);
      await menuAction(page, 'История игр');
      await expect(page.locator('[data-testid~=saved-game]')).toHaveCount(3);
    }
  });
}
