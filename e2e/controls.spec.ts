import { menuAction, expectStep } from './helpers';
import { expect, test, type Page } from '@playwright/test';

const rod = (page: Page, index: number) => page.locator(`button[data-rod="${index - 1}"]`);
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function start(page: Page, hardcore = false) {
  await page.goto('/');
  if (hardcore) await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await button(page, 'Начать игру').click();
  await button(page, 'Играть').click();
}
async function center(page: Page, index: number) {
  const rect = (await rod(page, index).boundingBox())!;
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
async function pointer(page: Page, touch: boolean) {
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  return {
    async down(point: { x: number; y: number }) {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
      else { await page.mouse.move(point.x, point.y); await page.mouse.down(); }
    },
    async move(point: { x: number; y: number }) {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
      else await page.mouse.move(point.x, point.y, { steps: 5 });
    },
    async up() {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.mouse.up();
    },
    async cancel() {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      else await page.keyboard.press('Escape');
    },
    async second(point: { x: number; y: number }) {
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }, { x: point.x + 20, y: point.y + 20, id: 2 }] });
    },
    async dispose() { await cdp?.detach(); },
  };
}

test('control dialog defaults, cancellation, timer and manual pause', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-07T12:00:10Z'));
  await page.getByRole('slider').fill('7');
  await button(page, 'Начать игру').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Перетаскивание', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Свайпы', exact: true })).toHaveCount(0);
  await expect(page.locator('.rod')).toHaveCount(0);
  await page.clock.fastForward(60_000);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('slider')).toHaveValue('7');
  if (await page.locator('.compact-app').count()) await expect(page.getByRole('heading', { name: 'Ваша головоломка' })).toBeFocused();
  else await expect(button(page, 'Начать игру')).toBeFocused();
  await button(page, 'Начать игру').click();
  await page.getByRole('radio', { name: 'Нажатия', exact: true }).check();
  await button(page, 'Играть').click();
  await expect(page.getByRole('timer')).toHaveText('00:00');
  await page.keyboard.press('1'); await page.keyboard.press('3');
  await page.clock.runFor(1500);
  await menuAction(page, 'Управление');
  await expect(page.locator('.rod')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Нажатия', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Перетаскивание', exact: true }).check();
  await page.clock.fastForward(60_000);
  await page.keyboard.press('1'); await page.keyboard.press('2');
  await expectStep(page, 1, 1);
  await page.keyboard.press('Escape');
  await expect(button(page, await page.locator('.compact-app').count() ? 'Меню' : 'Управление')).toBeFocused();
  await expect(page.locator('.board-shell.control-tap')).toHaveCount(1);
  await page.clock.runFor(500);
  await expect(page.getByRole('timer')).toHaveText('00:02');
  await button(page, 'Пауза').click();
  await menuAction(page, 'Управление');
  await page.getByRole('radio', { name: 'Перетаскивание', exact: true }).check();
  await button(page, 'Применить').click();
  await expect(page.getByRole('heading', { name: 'Игра на паузе' })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.getByRole('timer')).toHaveText('00:02');
  await page.locator('.pause-button').click();
  await expect(page.locator('.control-drag')).toHaveCount(1);
  await expectStep(page, 1, 1);
  await menuAction(page, 'Начать заново');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.control-drag')).toHaveCount(1);
  await menuAction(page, 'Настройки');
  await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await button(page, 'Начать игру').click();
  await expect(page.getByRole('radio', { name: 'Свайпы', exact: true })).toBeChecked();
  await page.keyboard.press('Escape');
  await button(page, 'Назад к игре').click();
  await expect(page.locator('.mode-badge')).toContainText('Обычный');
});

test('drag moves exactly once; invalid and outside drops preserve history; taps still work', async ({ page, isMobile }) => {
  await start(page);
  const input = await pointer(page, isMobile);
  try {
    await rod(page, 2).click(); // Empty source must not start a drag.
    await input.down(await center(page, 1));
    await input.move(await center(page, 3));
    await expect(page.locator('.drag-ghost')).toHaveCount(1);
    await expect(rod(page, 3)).toHaveClass(/rod-drop-target/);
    await expect(rod(page, 1).locator('.disk-in-transit')).toHaveCount(1);
    await input.up();
    await expectStep(page, 1, 1);
    await expect(page.locator('button.rod[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('.drag-ghost')).toHaveCount(0);
    await input.down(await center(page, 1)); await input.move(await center(page, 3)); await input.up();
    await expect(page.getByRole('status')).toContainText('Большой диск');
    await expectStep(page, 1, 1);
    await input.down(await center(page, 1)); await input.move({ x: 2, y: 2 }); await input.up();
    await expectStep(page, 1, 1);
    await expect(page.locator('.drag-ghost')).toHaveCount(0);
    await rod(page, 1).click(); await rod(page, 2).click();
    await expectStep(page, 2, 2);
    await button(page, 'Отменить').click();
    await input.down(await center(page, 1)); await input.move(await center(page, 3)); await input.up();
    await expect(button(page, 'Повторить')).toBeEnabled();
    await input.down(await center(page, 3)); await input.move(await center(page, 2)); await input.up();
    await expect(button(page, 'Повторить')).toBeDisabled();
    await expectStep(page, 2, 2);
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('');
    expect(await page.locator('.board-shell').evaluate(el => getComputedStyle(el).userSelect)).toBe('none');
  } finally { await input.dispose(); }
});

test('swipes move only to neighbours in both directions and do not become clicks', async ({ page, isMobile }) => {
  await start(page, true);
  const input = await pointer(page, isMobile);
  try {
    let from = await center(page, 1);
    await input.down(from); await input.move({ x: from.x + 100, y: from.y }); await input.up();
    await expect(rod(page, 2)).toHaveAccessibleName(/Верхний диск: 1/);
    await expectStep(page, 1, 1);
    await expect(page.locator('button.rod[aria-pressed="true"]')).toHaveCount(0);
    from = await center(page, 2);
    await input.down(from); await input.move({ x: from.x - 40, y: from.y }); await input.up();
    await expect(rod(page, 1)).toHaveAccessibleName(/Верхний диск: 1/);
    await expectStep(page, 2, 2);
    from = await center(page, 1);
    await input.down(from); await input.move({ x: from.x - 30, y: from.y }); await input.up();
    await expectStep(page, 2, 2);
    await expect(page.getByRole('status')).toContainText('Выберите стержень');
    // A tiny motion remains a tap.
    await input.down(from); await input.move({ x: from.x + 3, y: from.y }); await input.up();
    await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'true');
    await rod(page, 2).click();
    await expectStep(page, 3, 3);
    await input.down(from); await input.move({ x: from.x + 40, y: from.y }); await input.up();
    await expect(page.getByRole('status')).toContainText('Большой диск');
    await expectStep(page, 3, 3);
    // Below the swipe threshold and a mostly vertical gesture cannot move a disk.
    // Use the middle rod so an accidental horizontal swipe would be a legal move.
    from = await center(page, 2);
    await input.down(from); await input.move({ x: from.x + 15, y: from.y }); await input.up();
    await expectStep(page, 3, 3);
    await expect(rod(page, 2)).toHaveAttribute('aria-pressed', 'false');
    await input.down(from); await input.move({ x: from.x + 25, y: from.y + 40 }); await input.up();
    await expectStep(page, 3, 3);
  } finally { await input.dispose(); }
});

test('cancelled gestures, second touch and resizing never commit a move', async ({ page, isMobile }) => {
  await start(page);
  const input = await pointer(page, isMobile);
  try {
    await input.down(await center(page, 1)); await input.move(await center(page, 2));
    await input.cancel(); if (!isMobile) await input.up();
    await expectStep(page, 0, 0);
    await expect(page.locator('.drag-ghost')).toHaveCount(0);
    if (isMobile) {
      await input.down(await center(page, 1)); await input.move(await center(page, 2));
      await input.second(await center(page, 2)); await input.up();
      await expectStep(page, 0, 0);
      await expect(page.locator('.drag-ghost')).toHaveCount(0);
    }
    await input.down(await center(page, 1)); await input.move(await center(page, 2));
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ ...viewport, width: viewport.width - 10 });
    await expect(page.locator('.drag-ghost')).toHaveCount(0);
    await input.up();
    await expectStep(page, 0, 0);
    await input.down(await center(page, 1)); await input.move(await center(page, 2));
    // Simulate loss of capture while the device still has its pointer down.
    await rod(page, 1).evaluate(el => el.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true })));
    await input.up();
    await expectStep(page, 0, 0);
    await input.down(await center(page, 1)); await input.move(await center(page, 2));
    await button(page, 'Пауза').focus(); await page.keyboard.press('Enter'); await input.up();
    await expect(page.getByRole('heading', { name: 'Игра на паузе' })).toBeVisible();
    await expect(page.locator('.drag-ghost')).toHaveCount(0);
    await page.locator('.pause-button').click();
    await expectStep(page, 0, 0);
    await input.down(await center(page, 1)); await input.move(await center(page, 2));
    const compact = !!(await page.locator('.compact-app').count());
    await button(page, compact ? 'Меню' : 'Управление').focus(); await page.keyboard.press('Enter'); await input.up();
    if (compact) await button(page, 'Управление').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.drag-ghost')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Нажатия', exact: true }).check();
    await button(page, 'Применить').click();
    await expectStep(page, 0, 0);
  } finally { await input.dispose(); }
});

test('numeric keys respect selection, mode, pause, form inputs and key repeats', async ({ page }) => {
  await start(page, true);
  await page.keyboard.press('1'); await page.keyboard.press('3');
  await expect(page.getByRole('status')).toContainText('только на соседний');
  await page.keyboard.press('2');
  await expectStep(page, 1, 1);
  await page.keyboard.press('6');
  await expect(page.locator('button.rod[aria-pressed="true"]')).toHaveCount(0);
  await page.keyboard.down('1'); await page.keyboard.down('1'); await page.keyboard.up('1');
  await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Control+1');
  await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'false');
  await button(page, 'Пауза').click();
  await page.keyboard.press('2'); await page.keyboard.press('3');
  await expectStep(page, 1, 1);
  await menuAction(page, 'Настройки');
  await page.getByRole('slider').focus();
  await page.keyboard.press('1'); await page.keyboard.press('2');
  await button(page, 'Назад к игре').click();
  await expectStep(page, 1, 1);
});

test('dialog keeps focus inside and supports reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await button(page, 'Начать игру').click();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  expect(await page.locator('.demo-moving-disk').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.screenshot({ path: testInfo.outputPath('controls-dialog.png'), fullPage: true });
  await page.keyboard.press('Escape');
  if (await page.locator('.compact-app').count()) await expect(page.getByRole('heading', { name: 'Ваша головоломка' })).toBeFocused();
  else await expect(button(page, 'Начать игру')).toBeFocused();
});

for (const width of [768, 1440]) {
  test(`all rod and disk counts fit the board at ${width}px`, async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, 'The complete viewport matrix is run once.');
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    async function assertFits() {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const metrics = await page.locator('.board-shell').evaluate(el => {
        const rect = el.getBoundingClientRect();
        return {
          scroll: el.scrollWidth <= el.clientWidth + 1,
          fits: [...el.querySelectorAll('.rod, .disk')].every(cell => {
            const r = cell.getBoundingClientRect();
            return r.width > 0 && r.left >= rect.left && r.right <= rect.right;
          }),
        };
      });
      expect(metrics).toEqual({ scroll: true, fits: true });
    }
    for (const rods of [3, 4, 5, 6]) {
      for (let disks = 3; disks <= 10; disks++) {
        await page.getByRole('radio', { name: String(rods), exact: true }).check();
        await page.getByRole('slider').fill(String(disks));
        await assertFits();
        await button(page, 'Начать игру').click(); await button(page, 'Играть').click();
        await expect(page.locator('button.rod')).toHaveCount(rods);
        await assertFits();
        if (rods === 6 && disks === 10) await page.screenshot({ path: testInfo.outputPath('six-rods.png'), fullPage: true });
        await menuAction(page, 'Настройки');
      }
    }
  });
}
