import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

async function open(page: Page) {
  // No external font requests are needed for the local workflow.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.shell')).toBeVisible();
}
async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: name === 'Review' ? /^Review/ : name, exact: name !== 'Review' }).click();
  await expect(page.locator('.view.active h1')).toBeFocused();
}
async function accessibility(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ html: node.html, summary: node.failureSummary })) }))).toEqual([]);
}

// Run each project against its own browser storage. The server's database is disposable.
test('keyboard study journey, save failure recovery, and review scheduling', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const note = `A ${test.info().project.name} note that must survive an error.`;
  await open(page);
  for (const cardId of ['index-purpose', 'index-vs-scan', 'index-cost']) {
    await page.request.post('/api/study', { headers: { Origin: new URL(page.url()).origin }, data: { type: 'review', cardId, outcome: 'again' } });
  }
  await page.reload(); await expect(page.locator('.shell')).toBeVisible();
  await navigate(page, 'Reading');
  const notes = page.getByRole('textbox', { name: 'Your notes on indexing' });
  await page.route('**/api/study', route => {
    const body = route.request().postDataJSON();
    if (body?.type === 'notes') return route.fulfill({ status: 500, json: { error: 'Test save failure' } });
    return route.continue();
  });
  await notes.fill(note);
  await expect(page.getByRole('status').filter({ hasText: 'Could not save.' })).toBeVisible();
  await expect(notes).toHaveValue(note);
  await page.unroute('**/api/study');
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.locator('#save-status')).toHaveText('Saved on this device');
  await page.reload(); await expect(page.locator('.shell')).toBeVisible();
  await navigate(page, 'Reading'); await expect(notes).toHaveValue(note);
  await page.getByRole('button', { name: 'Mark read & try the challenge' }).click();
  await expect(page.getByRole('heading', { name: 'Think it through.' })).toBeFocused();
  const first = page.getByRole('radio').nth(0), second = page.getByRole('radio').nth(1);
  await first.focus(); await first.press('ArrowRight');
  await expect(second).toBeFocused(); await expect(second).toHaveAttribute('aria-checked', 'true');
  await second.press(test.info().project.name === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'); await expect(page.getByRole('button', { name: 'Check my thinking' })).toBeFocused();
  // Hold the save briefly so selection cannot change while the answer is submitted.
  let releaseSave!: () => void;
  const held = new Promise<void>(resolve => { releaseSave = resolve; });
  await page.route('**/api/study', async route => {
    if (route.request().postDataJSON()?.type === 'practice') await held;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Check my thinking' }).press('Space');
  await expect(first).toBeDisabled(); await expect(second).toBeDisabled(); releaseSave();
  await expect(page.getByText('That’s a strong candidate.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  await page.unroute('**/api/study');
  await page.getByRole('button', { name: 'Continue to review' }).click();
  // Exercise recall, rotating the queue, and expressing confidence.
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByRole('button', { name: 'Review again' })).toBeFocused();
  await page.getByRole('button', { name: 'Review again' }).press('Space');
  await expect(page.getByRole('button', { name: 'Reveal answer' })).toBeFocused();
  await page.getByRole('button', { name: 'Reveal answer' }).press('Space');
  await page.getByRole('button', { name: 'I feel confident' }).click();
  await expect(page.getByRole('button', { name: 'Reveal answer' })).toBeFocused();
  for (let index = 0; index < 3; index++) {
    if (!await page.getByRole('button', { name: 'Reveal answer' }).count()) break;
    await page.getByRole('button', { name: 'Reveal answer' }).click();
    await page.getByRole('button', { name: 'I feel confident' }).click();
    await expect(page.getByRole('button', { name: 'I feel confident' })).toHaveCount(0);
  }
  await expect(page.getByRole('heading', { name: 'Your review queue is clear.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to concept', exact: true })).toBeFocused();
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Review (0)', exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator('.shell')).toBeVisible(); await navigate(page, 'Review');
  await expect(page.getByRole('heading', { name: 'Your review queue is clear.' })).toBeVisible();
  await accessibility(page);
  expect(errors).toEqual([]);
});

test('book import, keyboard selection, exact saved passage, errors, and narrow reflow', async ({ page }) => {
  await open(page); await navigate(page, 'Books');
  const title = `Browser fixture ${test.info().project.name}`;
  // Avoid importing the same bytes twice across projects by clearing only this disposable library.
  const existing = await page.request.get('/api/books');
  for (const book of await existing.json()) {
    await page.request.delete(`/api/books/${book.id}`, { headers: { Origin: new URL(page.url()).origin }, data: { keepPassages: false } });
  }
  await page.getByLabel('File', { exact: true }).setInputFiles(path.join(__dirname, '../fixtures/indexes.epub'));
  await page.getByLabel('Title (optional)', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Import book', exact: true }).click();
  const row = page.getByRole('button', { name: new RegExp(`EPUB ${title}`) });
  await expect(row).toContainText('2 text sections');
  await expect(page.getByRole('searchbox', { name: 'Search this book' })).toBeVisible();
  await page.getByRole('searchbox').fill('index'); await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: /Section 1.*Inspect context/ }).click();
  const source = page.getByRole('textbox', { name: 'Source text and surrounding context' });
  await expect(source).toBeFocused();
  // The search match starts selected. Extend it using only Shift and the arrow keys.
  await expect.poll(() => source.evaluate(element => { const field = element as HTMLTextAreaElement; return field.value.slice(field.selectionStart, field.selectionEnd); })).toBe('index');
  for (let index = 0; index < 5; index++) await source.press('Shift+ArrowRight');
  await source.press(test.info().project.name === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('button', { name: 'Use selected passage' })).toBeFocused();
  await page.getByRole('button', { name: 'Use selected passage' }).press('Space');
  await expect(page.getByRole('textbox', { name: 'Selected passage', exact: true })).toHaveValue('index help');
  await expect(page.getByRole('textbox', { name: 'Selected passage', exact: true })).toBeFocused();
  await page.getByLabel('Book title', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Save passage to concept' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Passage saved to Understanding indexes.' })).toBeVisible();
  await expect(source).toBeFocused();
  await navigate(page, 'Reading');
  const saved = page.locator('figure').filter({ hasText: title });
  await expect(saved.locator('blockquote')).toHaveText('index help');
  await expect(saved).toContainText('Section 1 · Finding rows');
  await page.reload(); await expect(page.locator('.shell')).toBeVisible(); await navigate(page, 'Reading');
  await expect(saved.locator('blockquote')).toHaveText('index help');
  await accessibility(page);
  await navigate(page, 'Books'); await row.click();
  await page.getByRole('searchbox').fill('zz-no-match'); await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No matching text. Try another word or phrase.')).toBeVisible();
  await accessibility(page);
  // Reflow at 320 CSS px also exercises the available width at 400% zoom on a 1280px display.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [900, 650, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const destination of ['Study desk', 'Reading', 'Practice', 'Review', 'Books']) {
      await navigate(page, destination);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `${destination} overflows at ${width}px`).toBe(false);
    }
  }
  await page.screenshot({ path: `test-results/books-${test.info().project.name}-320.png`, fullPage: true });
  await accessibility(page);
  const transition = await page.locator('.btn').first().evaluate(element => getComputedStyle(element).transitionDuration);
  expect(transition.split(',').every(value => parseFloat(value) === 0)).toBe(true);
});

test('all views expose accessible controls and keep local data requests local', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) external.push(request.url());
  });
  await open(page);
  await page.keyboard.press(test.info().project.name === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  await expect(page.getByRole('link', { name: 'Skip to study content' })).toBeFocused();
  await page.getByRole('link', { name: 'Skip to study content' }).press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  for (const name of ['Study desk', 'Reading', 'Practice', 'Review', 'Books']) {
    // The Review button includes a changing count.
    const button = page.getByRole('navigation').getByRole('button', { name: name === 'Review' ? /^Review/ : name, exact: name !== 'Review' });
    await button.click();
    await expect(page.locator('.view.active h1')).toBeFocused();
    await accessibility(page);
  }
  expect(external).toEqual([]);
});

test('n8n drafts require review and accepted material enters practice and review', async ({ page }) => {
  await open(page); await navigate(page, 'Books');
  const shelf = page.locator('.book-row').first(); await expect(shelf).toBeVisible(); await shelf.click();
  const analysis = page.getByRole('region', { name: 'Find the ideas worth keeping.' });
  await expect(analysis.getByRole('button', { name: 'Start new book analysis' })).toBeDisabled();
  await analysis.getByRole('checkbox', { name: /Send this step/ }).check();
  await analysis.getByRole('button', { name: 'Start new book analysis' }).click();
  await expect(analysis.getByText('Analysis complete', { exact: true })).toBeVisible();
  await expect(analysis.getByText('An index helps locate matching rows.', { exact: true })).toBeVisible();
  const draft = analysis.locator('.ai-draft').first();
  await draft.getByText('Review and edit learning material', { exact: true }).click();
  await draft.getByLabel('Lesson title', { exact: true }).fill('A reviewed book lesson');
  await draft.getByRole('checkbox', { name: 'I reviewed this material against the source passage.' }).check();
  await draft.getByRole('button', { name: 'Accept practice and review material' }).click();
  await expect(analysis.getByText('Available in Practice and the Review queue.')).toBeVisible();
  await navigate(page, 'Practice');
  const practice = page.getByRole('region', { name: 'Practice from your books' });
  await expect(practice.getByRole('heading', { name: 'A reviewed book lesson' })).toBeVisible();
  await practice.getByRole('radio').first().check();
  await practice.getByRole('button', { name: 'Check this answer' }).click();
  await expect(practice.getByText('That matches the reviewed explanation.')).toBeVisible();
  await accessibility(page);
  await navigate(page, 'Review');
  await expect(page.getByRole('heading', { name: 'What can an index help a query do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.locator('.review-source blockquote')).toHaveText('An index helps locate matching rows.');
  await accessibility(page);
  await navigate(page, 'Books'); await accessibility(page);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await accessibility(page);
});
