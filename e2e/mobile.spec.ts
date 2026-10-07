import { expect, test, type Page } from '@playwright/test';
import { button, menuAction } from './helpers';

const rod = (page: Page, n: number) => page.locator(`button[data-rod="${n - 1}"]`);
const moveCount = (page: Page) => page.locator('.move-value');
async function start(page: Page, mode = 'Обычный', disks = 5) {
  await page.goto('/');
  await page.getByRole('radio', { name: mode, exact: true }).check();
  await page.getByRole('slider').fill(String(disks));
  await button(page, 'Начать игру').click(); await button(page, 'Играть').click();
}
async function assertFits(page: Page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const board = document.querySelector('.play-area')!.getBoundingClientRect();
    const outside: string[] = [];
    for (const el of document.querySelectorAll('.rod, .disk, .disk span, .rod-top-label, .rod-number, .game-toolbar .button, .game-toolbar .button span, .game-toolbar .button svg, .game-heading, .game-message')) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) outside.push(el.className);
      if (el.matches('.rod, .disk, .disk span') && (r.left < board.left - 1 || r.right > board.right + 1 || r.top < board.top - 1 || r.bottom > board.bottom + 1)) outside.push(`board:${el.className}`);
      if (el.matches('.disk span')) {
        const disk = el.parentElement!.getBoundingClientRect();
        if (r.top < disk.top - 1 || r.bottom > disk.bottom + 1 || r.left < disk.left - 1 || r.right > disk.right + 1) outside.push('disk label');
      }
      if (el.matches('.game-toolbar .button span, .game-toolbar .button svg')) {
        const button = el.closest('button')!.getBoundingClientRect();
        if (r.top < button.top || r.bottom > button.bottom || r.left < button.left || r.right > button.right) outside.push('button contents');
      }
    }
    const buttons = [...document.querySelectorAll('.game-toolbar .button')].map(el => el.getBoundingClientRect());
    const controlsFit = buttons.length === 4 && buttons.every((r, i) => r.height >= 44 && (i === 0 || r.left >= buttons[i - 1].right));
    const heading = document.querySelector('.game-heading')!.getBoundingClientRect();
    const message = document.querySelector('.game-message')!.getBoundingClientRect();
    return { outside, controlsFit, rowsFit: heading.bottom <= board.top + 1 && board.bottom <= message.top + 1,
      noScroll: doc.scrollWidth <= doc.clientWidth && doc.scrollHeight <= doc.clientHeight && document.body.scrollHeight <= innerHeight && scrollX === 0 && scrollY === 0 };
  });
  expect(metrics).toEqual({ outside: [], controlsFit: true, rowsFit: true, noScroll: true });
}

for (const [width, height] of [[320, 480], [360, 640], [390, 844], [430, 932], [568, 320], [844, 390], [956, 440], [568, 280], [390, 600]]) {
  test(`every configuration fits ${width}x${height}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height }); await page.goto('/');
    for (const rods of [3, 4, 5, 6]) for (let disks = 3; disks <= 10; disks++) {
      await page.getByRole('radio', { name: String(rods), exact: true }).check();
      await page.getByRole('slider').fill(String(disks));
      await page.getByRole('radio', { name: disks % 2 ? 'Обычный' : 'Хардкор', exact: true }).check();
      await button(page, 'Начать игру').click(); await button(page, 'Играть').click();
      await expect(rod(page, rods)).toBeVisible();
      await expect(page.locator('.disk')).toHaveCount(disks);
      await assertFits(page);
      await rod(page, 1).click(); // Raised selection also has to fit.
      await assertFits(page);
      if (rods === 6 && disks === 10) await page.screenshot({ path: testInfo.outputPath('maximum.png') });
      await menuAction(page, 'Настройки');
    }
  });
}

test('initial settings, draft, modal scrolling, focus and responsive transitions', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 280 }); await page.goto('/');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.locator('.rod')).toHaveCount(0);
  const dialogBounds = await page.getByRole('dialog').boundingBox();
  const startBounds = await button(page, 'Начать игру').boundingBox();
  expect(dialogBounds!.y).toBeGreaterThanOrEqual(0);
  expect(startBounds!.y + startBounds!.height).toBeLessThanOrEqual(280);
  expect(await page.locator('.dialog-body').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.getByRole('radio', { name: '6', exact: true }).check();
  await page.getByRole('slider').fill('10');
  await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveValue('10');
  await expect(page.getByRole('radio', { name: '6', exact: true })).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await button(page, 'Начать игру').click();
  await page.getByRole('radio', { name: 'Нажатия', exact: true }).check();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole('radio', { name: 'Нажатия', exact: true })).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('slider')).toHaveValue('10');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button(page, 'Настроить игру')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Начальная позиция' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await button(page, 'Настроить игру').click();
  await expect(page.getByRole('slider')).toHaveValue('10');
  await button(page, 'Начать игру').click(); await button(page, 'Играть').click();
  await expect(page.getByRole('timer')).toHaveText('00:00');
  await assertFits(page);
  await button(page, 'Меню').click();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press(i % 3 === 0 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await button(page, 'Правила').click(); await expect(page.getByRole('dialog')).toHaveCount(1);
  await button(page, 'Назад').click(); await expect(button(page, 'Настройки')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(button(page, 'Меню')).toBeFocused();
});

test('menu freezes time and preserves manual pause, history and controls', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.goto('/'); await page.clock.pauseAt(new Date('2026-10-07T12:00:10Z'));
  await button(page, 'Начать игру').click(); await button(page, 'Играть').click();
  await rod(page, 1).tap(); await rod(page, 3).tap();
  await page.clock.runFor(1500); await button(page, 'Меню').click();
  await expect(page.getByText('Шаг 1 из 1')).toBeVisible();
  await expect(page.locator('.rod')).toHaveCount(0);
  await page.clock.runFor(60_000);
  await button(page, 'Правила').click(); await page.clock.runFor(60_000);
  await button(page, 'Назад').click(); await button(page, 'Управление').click();
  await page.getByRole('radio', { name: 'Нажатия', exact: true }).check();
  await button(page, 'Применить').click();
  await expect(page.getByRole('timer')).toHaveText('00:01');
  await expect(moveCount(page)).toHaveText('1');
  await page.clock.runFor(500); await expect(page.getByRole('timer')).toHaveText('00:02');
  await button(page, 'Пауза').click(); await assertFits(page);
  await menuAction(page, 'Настройки');
  await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await button(page, 'Начать игру').click(); await page.keyboard.press('Escape');
  await button(page, 'Назад к игре').click();
  await expect(page.getByRole('heading', { name: 'Игра на паузе' })).toBeVisible();
  await page.clock.runFor(10_000); await expect(page.getByRole('timer')).toHaveText('00:02');
  await expect(page.locator('.mode-badge')).toHaveText('Обычный');
  await page.locator('.pause-button').click();
  await expect(page.locator('.control-tap')).toBeVisible();
  await button(page, 'Отменить').click(); await menuAction(page, 'Правила');
  await page.keyboard.press('Escape'); await button(page, 'Повторить').click();
  await expect(moveCount(page)).toHaveText('1');
  await menuAction(page, 'Начать заново');
  await expect(page.getByRole('timer')).toHaveText('00:00');
  await expect(moveCount(page)).toHaveText('0');
  await expect(page.locator('.control-tap')).toBeVisible();
});

test('pointer gestures and touch taps survive rotation and opening the menu', async ({ page, browserName }) => {
  await start(page);
  const center = async (n: number) => { const r = (await rod(page, n).boundingBox())!; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  async function down(n: number) { const p = await center(n); await page.mouse.move(p.x, p.y); await page.mouse.down(); }
  async function move(n: number) { const p = await center(n); await page.mouse.move(p.x, p.y, { steps: 5 }); }
  await down(1); await move(3); await page.mouse.up();
  await expect(moveCount(page)).toHaveText('1');
  await down(1); await move(2);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.drag-ghost')).toHaveCount(0); await page.mouse.up();
  await expect(moveCount(page)).toHaveText('1'); await assertFits(page);
  await down(1); await move(2);
  await button(page, 'Меню').focus(); await page.keyboard.press('Enter'); await page.mouse.up();
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(moveCount(page)).toHaveText('1');
  await rod(page, 1).tap(); await rod(page, 2).tap(); await expect(moveCount(page)).toHaveText('2');
  await menuAction(page, 'Настройки'); await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await button(page, 'Начать игру').click(); await button(page, 'Играть').click();
  await down(1); const p = await center(1); await page.mouse.move(p.x + 100, p.y, { steps: 5 }); await page.mouse.up();
  await expect(moveCount(page)).toHaveText('1'); await expect(rod(page, 2)).toHaveAccessibleName(/Верхний диск: 1/);
  await rod(page, 1).tap(); await rod(page, 2).tap(); // Illegal larger disk.
  await expect(page.getByRole('status')).toContainText('Большой диск'); await assertFits(page);
  if (browserName === 'chromium') await page.mouse.wheel(0, 300);
  else await page.evaluate(() => window.scrollBy(0, 300));
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('victory, long timer and move count fit without obscuring the board', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.clock.install(); await start(page, 'Обычный', 3);
  await page.clock.fastForward(360_000_000);
  await expect(page.getByRole('timer')).toContainText('100:00:');
  // Text stress fixture only: history semantics are covered by the reducer tests.
  await page.locator('.move-value').evaluate(el => { el.textContent = '59048'; });
  await assertFits(page);
  for (const [from, to] of [[1, 3], [1, 2], [3, 2], [1, 3], [2, 1], [2, 3], [1, 3]]) { await rod(page, from).tap(); await rod(page, to).tap(); }
  await expect(page.getByRole('status')).toContainText('Пирамидка собрана!');
  await expect(moveCount(page)).toHaveText('7'); await assertFits(page);
  await button(page, 'Отменить').click(); await assertFits(page);
  await button(page, 'Повторить').click(); await expect(rod(page, 3)).toBeDisabled();
  await expect(button(page, 'Пауза')).toBeDisabled();
});
