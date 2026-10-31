import { test, expect, type Page } from '@playwright/test';
import { cards } from '../../lib/content';
import type { StudyAction, StudySnapshot } from '../../lib/study-types';

function snapshot(): StudySnapshot {
  return { prototypeImported: true, notes: '', read: false, practice: false,
    cards: cards.map(card => ({ ...card, kind: 'curated', source: null, due: true, dueAt: null, confident: false })) };
}
async function open(page: Page) {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('.shell')).toBeVisible();
}
async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
  await expect(page.locator('.view.active h1')).toBeFocused();
}

test('prototype data imports once and its browser copy stays available', async ({ page }) => {
  let state = { ...snapshot(), prototypeImported: false };
  const imported: StudyAction[] = [];
  const legacy = { notes: 'A prototype note', read: true, confident: [0] };
  await page.addInitScript(value => localStorage.setItem('commonplace-study-v1', JSON.stringify(value)), legacy);
  await page.route('**/api/study', async route => {
    if (route.request().method() === 'POST') {
      const action = route.request().postDataJSON() as StudyAction;
      imported.push(action);
      expect(action).toEqual({ type: 'import', data: legacy });
      state = { ...state, prototypeImported: true, notes: legacy.notes, read: true };
    }
    await route.fulfill({ json: state });
  });
  await open(page); await navigate(page, 'Reading');
  await expect(page.getByLabel('Your notes on indexing')).toHaveValue(legacy.notes);
  expect(await page.evaluate(() => localStorage.getItem('commonplace-study-v1'))).toBe(JSON.stringify(legacy));
  await page.reload(); await expect(page.locator('.shell')).toBeVisible();
  expect(imported).toHaveLength(1);
});

test('load failure preserves browser data and blocks study actions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('commonplace-study-v1', 'browser copy to recover'));
  await page.route('**/api/study', route => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Could not' })).toContainText('Could not load or import your study data.');
  await expect(page.locator('.shell')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('commonplace-study-v1'))).toBe('browser copy to recover');
});

test('late note saves preserve newer edits, navigation state, and unload protection', async ({ page }) => {
  const state = snapshot();
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const writes: string[] = [];
  await page.route('**/api/study', async route => {
    const action = route.request().postDataJSON() as StudyAction | null;
    if (action?.type === 'notes') {
      writes.push(action.notes);
      if (writes.length === 1) await held;
      state.notes = action.notes;
    }
    if (action?.type === 'read') state.read = true;
    await route.fulfill({ json: state });
  });
  await open(page); await navigate(page, 'Reading');
  const notes = page.getByLabel('Your notes on indexing');
  await notes.fill('First edit');
  await expect.poll(() => writes.length).toBe(1);
  await notes.fill('Newer edit');
  await navigate(page, 'Study desk'); await navigate(page, 'Reading');
  await expect(notes).toHaveValue('Newer edit');
  await expect(page.locator('#save-status')).toHaveText('Saving…');
  expect(await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
  release();
  await expect(page.locator('#save-status')).toHaveText('Saved on this device');
  expect(writes).toEqual(['First edit', 'Newer edit']);
  await expect(notes).toHaveValue('Newer edit');
  expect(await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(false);
  await page.getByRole('button', { name: 'Mark read & try the challenge' }).click();
  await expect(page.locator('.view.active h1')).toHaveText('Think it through.');
  await navigate(page, 'Study desk'); await expect(page.locator('#reading-status')).toHaveText('Complete');
});

test('failed practice and review saves can retry without advancing', async ({ page }) => {
  const state = snapshot();
  let failPractice = true, failReview = true;
  await page.route('**/api/study', async route => {
    const action = route.request().postDataJSON() as StudyAction | null;
    if (action?.type === 'practice') {
      if (failPractice) { await route.fulfill({ status: 500, json: {} }); return; }
      state.practice = true;
    }
    if (action?.type === 'review') {
      if (failReview) { await route.fulfill({ status: 500, json: {} }); return; }
      state.cards = state.cards.map(card => card.id === action.cardId ? { ...card, dueAt: Date.now() + 86_400_000, confident: true } : card);
    }
    await route.fulfill({ json: state });
  });
  await open(page); await navigate(page, 'Practice');
  const options = page.getByRole('radiogroup', { name: 'Choose a query' }).getByRole('radio');
  await options.nth(1).click(); await page.getByRole('button', { name: 'Check my thinking' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not' })).toHaveText('Could not save your progress. Please try again.');
  await expect(options.nth(1)).toBeEnabled(); await expect(options.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#feedback')).toBeEmpty();
  failPractice = false;
  await page.getByRole('button', { name: 'Check my thinking' }).click();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(options.first()).toBeFocused(); await expect(page.getByRole('button', { name: 'Check my thinking' })).toBeDisabled();
  await navigate(page, 'Review (3)');
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await page.getByRole('button', { name: 'I feel confident' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not' })).toBeVisible();
  await expect(page.locator('.answer')).toContainText(cards[0].a);
  await expect(page.getByRole('button', { name: 'I feel confident' })).toBeEnabled();
  failReview = false;
  await page.getByRole('button', { name: 'I feel confident' }).click();
  await expect(page.getByRole('button', { name: 'Reveal answer' })).toBeFocused();
  await expect(page.locator('#review-content h2')).toHaveText(cards[1].q);
  await expect(page.getByRole('alert').filter({ hasText: 'Could not' })).toHaveCount(0);
  await navigate(page, 'Study desk');
  await expect(page.getByRole('progressbar', { name: 'Activities completed' })).toHaveAttribute('aria-valuenow', '2');
});
