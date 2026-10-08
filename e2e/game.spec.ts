import { menuAction, expectStep } from './helpers';
import { test, expect, type Page } from '@playwright/test';

const rod = (page: Page, index: number) => page.getByRole('button', { name: new RegExp(`^Стержень ${index}[,.]`) });
async function move(page: Page, from: number, to: number) {
  await rod(page, from).click();
  await rod(page, to).click();
}

test('settings, history, errors, branching and restart', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '3', exact: true })).toBeChecked();
  await expect(page.getByRole('slider', { name: 'Количество дисков' })).toHaveValue('5');
  await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled();
  await move(page, 1, 3);
  await move(page, 1, 2);
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await move(page, 1, 3);
  await expect(page.getByRole('status')).toContainText('Большой диск нельзя');
  await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeEnabled();
  await rod(page, 1).click();
  await move(page, 3, 2);
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled();
  await expectStep(page, 2, 2);
  await page.screenshot({ path: testInfo.outputPath('game.png'), fullPage: true });
  await menuAction(page, 'Настройки');
  await page.getByRole('radio', { name: '6', exact: true }).check();
  await page.getByRole('slider', { name: 'Количество дисков' }).fill('10');
  await page.getByRole('button', { name: 'Назад к игре', exact: true }).click();
  await expectStep(page, 2, 2);
  await expect(page.locator('button.rod')).toHaveCount(3);
  await menuAction(page, 'Начать заново');
  await expect(rod(page, 1)).toHaveAccessibleName('Стержень 1, старт. Диски снизу вверх: 5, 4, 3, 2, 1. Верхний диск: 1.');
  await expectStep(page, 0, 0);
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('victory, complete undo and redo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('slider', { name: 'Количество дисков' }).fill('3');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  for (const [from, to] of [[1, 3], [1, 2], [3, 2], [1, 3], [2, 1], [2, 3], [1, 3]]) await move(page, from, to);
  await expect(page.getByRole('heading', { name: 'Всё получилось!' })).toBeVisible();
  await expect(rod(page, 3)).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Количество ходов: 7');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(rod(page, 3)).toBeEnabled();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expectStep(page, 0, 7);
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Всё получилось!' })).toBeVisible();
});

test('maximum settings, last-rod target and no horizontal scrolling', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('radio', { name: '6', exact: true }).check();
  await page.getByRole('slider', { name: 'Количество дисков' }).fill('10');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await expect(page.locator('button.rod')).toHaveCount(6);
  await expect(rod(page, 6)).toHaveAccessibleName('Стержень 6, цель. Пустой.');
  await move(page, 1, 6);
  await expect(rod(page, 6)).toHaveAccessibleName('Стержень 6, цель. Диски снизу вверх: 1. Верхний диск: 1.');
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
  if (testInfo.project.name === 'mobile') {
    const scroll = page.getByRole('region', { name: 'Игровое поле' });
    expect(await scroll.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(false);
  }
  await page.screenshot({ path: testInfo.outputPath('max-settings.png'), fullPage: true });
});

test('keyboard can start, select, move, undo and redo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  if (!(await page.locator('.compact-app').count())) {
    await expect(page.getByRole('heading', { name: 'Ход за ходом' })).toBeFocused();
    await page.keyboard.press('Tab'); // Pause
    await page.keyboard.press('Tab'); // Controls
    await page.keyboard.press('Tab'); // Settings
    await page.keyboard.press('Tab'); // Application
  } else {
    await page.getByRole('region', { name: 'Игровое поле' }).focus();
  }
  if (!(await page.locator('.compact-app').count())) await page.keyboard.press('Tab'); // Game field
  await page.keyboard.press('Tab'); // First rod
  await expect(rod(page, 1)).toBeFocused();
  expect(await rod(page, 1).evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Space');
  await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(rod(page, 2)).toHaveAccessibleName('Стержень 2. Диски снизу вверх: 1. Верхний диск: 1.');
  await page.keyboard.press('Tab'); // Third rod
  await page.keyboard.press('Tab'); // Undo
  await page.keyboard.press('Enter');
  await expectStep(page, 0, 1);
  await page.getByRole('button', { name: 'Повторить', exact: true }).focus();
  await page.keyboard.press('Space');
  await expectStep(page, 1, 1);
});

async function freezeClock(page: Page) {
  await page.clock.install({ time: new Date('2026-10-07T12:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-07T12:00:10Z'));
}

test('timer pauses in settings, preserves time through history, and resets for a new game', async ({ page }, testInfo) => {
  await freezeClock(page);
  const timer = page.getByRole('timer', { name: 'Время партии' });
  await page.clock.fastForward(5000);
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await expect(timer).toHaveText('00:00');
  await page.clock.runFor(1500);
  await expect(timer).toHaveText('00:01');
  await menuAction(page, 'Настройки');
  await page.clock.fastForward(60_000);
  await page.getByRole('button', { name: 'Назад к игре', exact: true }).click();
  await expect(timer).toHaveText('00:01');
  await page.clock.runFor(500);
  await expect(timer).toHaveText('00:02');
  await move(page, 1, 2);
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(timer).toHaveText('00:02');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(timer).toHaveText('00:02');
  await page.clock.fastForward(65_000);
  await expect(timer).toHaveText('01:07');
  await page.clock.fastForward(3_600_000);
  await expect(timer).toHaveText('01:01:07');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('timer.png'), fullPage: true });
  await menuAction(page, 'Начать заново');
  await expect(timer).toHaveText('00:00');
  await page.clock.runFor(1000);
  await expect(timer).toHaveText('00:01');
  await menuAction(page, 'Настройки');
  await page.getByRole('radio', { name: '4', exact: true }).check();
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await expect(timer).toHaveText('00:00');
  await page.clock.runFor(1000);
  await expect(timer).toHaveText('00:01');
});

test('timer stops on victory, resumes after undo, and stops again on redo', async ({ page }) => {
  await freezeClock(page);
  const timer = page.getByRole('timer', { name: 'Время партии' });
  await page.getByRole('slider', { name: 'Количество дисков' }).fill('3');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await page.clock.runFor(3000);
  for (const [from, to] of [[1, 3], [1, 2], [3, 2], [1, 3], [2, 1], [2, 3], [1, 3]]) await move(page, from, to);
  await expect(page.getByRole('status')).toContainText('Время: 00:03');
  await page.clock.fastForward(60_000);
  await expect(timer).toHaveText('00:03');
  await menuAction(page, 'Настройки');
  await page.getByRole('button', { name: 'Назад к игре', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(timer).toHaveText('00:03');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(timer).toHaveText('00:05');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.clock.fastForward(60_000);
  await expect(timer).toHaveText('00:05');
  await expect(page.getByRole('status')).toContainText('Время: 00:05');
  await menuAction(page, 'Начать заново');
  await expect(timer).toHaveText('00:00');
  await page.clock.runFor(1000);
  await expect(timer).toHaveText('00:01');
});

for (const mode of ['Обычный', 'Хардкор']) {
  test(`manual pause hides the board, preserves time and history: ${mode}`, async ({ page }, testInfo) => {
    await freezeClock(page);
    await page.getByRole('radio', { name: mode, exact: true }).check();
    await page.getByRole('slider').fill('10');
    await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
    await page.getByRole('button', { name: 'Играть', exact: true }).click();
    await move(page, 1, 2);
    await move(page, 2, 3);
    await page.getByRole('button', { name: 'Отменить', exact: true }).click();
    await move(page, 1, 2); // An error and selection must both clear on pause.
    await expect(page.getByRole('status')).toContainText('Большой диск');
    const board = await page.locator('button.rod').evaluateAll(rods => rods.map(rod => rod.getAttribute('aria-label')));
    const height = await page.locator('.play-area').evaluate(el => el.getBoundingClientRect().height);
    await page.clock.runFor(1500);
    await page.getByRole('button', { name: 'Пауза', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Игра на паузе' })).toBeVisible();
    await expect(page.locator('.disk, .rod')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Игровое поле' })).toHaveCount(0);
    await expect(page.getByRole('status')).not.toContainText('Выбран диск');
    await expect(page.getByRole('status')).not.toContainText('Большой диск');
    expect(await page.locator('.play-area').evaluate(el => el.getBoundingClientRect().height)).toBe(height);
    await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled();
    await expect(page.locator('.pause-button')).toBeFocused();
    await page.clock.fastForward(60_000);
    await expect(page.getByRole('timer')).toHaveText('00:01');
    await page.screenshot({ path: testInfo.outputPath('paused.png'), fullPage: true });
    await menuAction(page, 'Настройки');
    const otherMode = mode === 'Обычный' ? 'Хардкор' : 'Обычный';
    await page.getByRole('radio', { name: otherMode, exact: true }).check();
    await page.getByRole('button', { name: 'Назад к игре', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Игра на паузе' })).toBeVisible();
    await expect(page.locator('.mode-badge')).toContainText(mode);
    await page.clock.runFor(2000);
    await expect(page.getByRole('timer')).toHaveText('00:01');
    await page.locator('.pause-panel').getByRole('button', { name: 'Продолжить', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeFocused();
    expect(await page.locator('button.rod').evaluateAll(rods => rods.map(rod => rod.getAttribute('aria-label')))).toEqual(board);
    await expect(page.locator('button.rod[aria-pressed="true"]')).toHaveCount(0);
    await page.clock.runFor(500);
    await expect(page.getByRole('timer')).toHaveText('00:02');
    await page.getByRole('button', { name: 'Повторить', exact: true }).click();
    await expectStep(page, 2, 2);
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
    await menuAction(page, 'Начать заново');
    await expect(page.getByRole('timer')).toHaveText('00:00');
    await expectStep(page, 0, 0);
    await expect(page.locator('button.rod')).toHaveCount(3);
    await expect(page.locator('.mode-badge')).toContainText(mode);
    await page.clock.runFor(1000);
    await expect(page.getByRole('timer')).toHaveText('00:01');
    await page.getByRole('button', { name: 'Пауза', exact: true }).click();
    await menuAction(page, 'Настройки');
    await page.getByRole('radio', { name: otherMode, exact: true }).check();
    await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
    await page.getByRole('button', { name: 'Играть', exact: true }).click();
    await expect(page.locator('.mode-badge')).toContainText(otherMode);
    await expect(page.locator('button.rod')).toHaveCount(3);
    await expect(page.getByRole('timer')).toHaveText('00:00');
    await page.clock.runFor(1000);
    await expect(page.getByRole('timer')).toHaveText('00:01');
  });
}

test('hardcore settings, neighbour highlighting and invalid history branches', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('radio', { name: 'Обычный', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await page.getByRole('radio', { name: '6', exact: true }).check();
  await page.getByRole('slider').fill('10');
  await expect(page.getByText('Диски можно переносить только на соседний стержень.')).toBeVisible();
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await expect(page.locator('.mode-badge')).toContainText('Хардкор');
  await rod(page, 1).click();
  await expect(rod(page, 2)).toHaveClass(/rod-available/);
  await expect(rod(page, 3)).not.toHaveClass(/rod-available/);
  await rod(page, 6).click();
  await expect(page.getByRole('status')).toContainText('только на соседний');
  await expect(rod(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await rod(page, 2).click();
  await move(page, 2, 3);
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await move(page, 1, 3);
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeEnabled();
  await rod(page, 1).click();
  await move(page, 2, 1);
  await expect(page.getByRole('button', { name: 'Повторить', exact: true })).toBeDisabled();
  await expectStep(page, 2, 2);
  await rod(page, 1).click();
  await page.screenshot({ path: testInfo.outputPath('hardcore.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('hardcore victory in 26 moves, pause unavailable until undo', async ({ page }) => {
  await freezeClock(page);
  await page.getByRole('radio', { name: 'Хардкор', exact: true }).check();
  await page.getByRole('slider').fill('3');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await page.clock.runFor(3000);
  async function solveAdjacent(n: number, from: number, to: number): Promise<void> {
    if (!n) return;
    await solveAdjacent(n - 1, from, to);
    await move(page, from, 2);
    await solveAdjacent(n - 1, to, from);
    await move(page, 2, to);
    await solveAdjacent(n - 1, from, to);
  }
  await solveAdjacent(3, 1, 3);
  await expect(page.getByRole('heading', { name: 'Всё получилось!' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Количество ходов: 26');
  await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeDisabled();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('timer')).toHaveText('00:03');
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeEnabled();
  await page.clock.runFor(1000);
  await expect(page.getByRole('timer')).toHaveText('00:04');
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('timer')).toHaveText('00:04');
  await page.locator('.pause-button').click();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Всё получилось!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeDisabled();
});
