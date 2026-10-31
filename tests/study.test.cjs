const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync, existsSync, cpSync, mkdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const net = require('node:net');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const { startN8nFixture } = require('./helpers/n8n.cjs');

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('study data, book imports, exact passages, backup/restore and deletion persist safely', { timeout: 120000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'commonplace-test-'));
  const dbPath = join(dir, 'test.db');
  const n8n = await startN8nFixture();
  const env = { ...process.env, N8N_WEBHOOK_URL: n8n.url, N8N_WEBHOOK_TOKEN: n8n.token, N8N_AI_PROVIDER: 'Fixture model; no AI service', DATABASE_URL: `file:${dbPath}`, NEXT_TELEMETRY_DISABLED: '1', COMMONPLACE_DIST_DIR: '.next-api-tests' };
  const migrate = spawnSync(process.execPath, [join(__dirname, '../scripts/prepare-db.cjs')], { env, encoding: 'utf8' });
  assert.equal(migrate.status, 0, migrate.stderr);
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let server;
  const client = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  async function start() {
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: 'ignore' });
    for (let i = 0; i < 120; i++) {
      try { const res = await fetch(`${origin}/api/study`); if (res.ok) return; } catch { /* Wait until the isolated server is accepting requests. */ }
      if (server.exitCode !== null) throw new Error('Test server exited');
      await delay(500);
    }
    throw new Error('Test server did not start');
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM'); await exited;
  }
  async function post(body, requestOrigin = origin) {
    return fetch(`${origin}/api/study`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin }, body: JSON.stringify(body) });
  }
  try {
    await start();
    let res = await post({ type: 'import', data: { notes: 'Original note', read: true, practice: false, confident: [0] } });
    assert.equal(res.status, 200); let state = await res.json();
    assert.equal(state.notes, 'Original note'); assert.equal(state.read, true);
    assert.equal(state.cards[0].confident, true); assert.equal(state.cards[0].due, false);
    assert.ok(state.cards[0].dueAt > Date.now() + 23 * 60 * 60 * 1000);
    await post({ type: 'notes', notes: 'Edited note' });
    await post({ type: 'import', data: { notes: 'Old note', read: false, practice: false, confident: [] } });
    res = await post({ type: 'practice', choice: 'b' }); state = await res.json();
    assert.equal(state.notes, 'Edited note'); assert.equal(state.practice, true);
    assert.equal(await client.practiceAttempt.count(), 1);
    res = await post({ type: 'review', cardId: 'index-vs-scan', outcome: 'again' }); state = await res.json();
    assert.equal(state.cards[1].due, true);
    res = await post({ type: 'review', cardId: 'index-vs-scan', outcome: 'confident' }); state = await res.json();
    assert.equal(state.cards[1].due, false);
    assert.equal(await client.reviewEvent.count({ where: { cardId: 'index-vs-scan' } }), 2);
    assert.equal((await post({ type: 'review', cardId: 'unknown', outcome: 'confident' })).status, 400);
    assert.equal((await post({ type: 'notes', notes: 'bad' }, 'http://evil.example')).status, 403);
    await client.reviewCard.update({ where: { cardId: 'index-vs-scan' }, data: { dueAt: new Date(Date.now() - 1000) } });
    await stop(); await start();
    state = await (await fetch(`${origin}/api/study`)).json();
    assert.equal(state.notes, 'Edited note'); assert.equal(state.read, true); assert.equal(state.practice, true); assert.equal(state.cards[1].due, true);
    await client.migrationMarker.delete({ where: { id: 'prototype-v1' } });
    await client.conceptProgress.update({ where: { conceptId: 'database-indexing' }, data: { notes: '' } });
    state = await (await post({ type: 'import', data: { notes: 'Stale browser note' } })).json();
    assert.equal(state.notes, '', 'an existing empty database note must not be overwritten');

    async function send(url, method, body, requestOrigin = origin) {
      return fetch(`${origin}${url}`, { method, headers: { 'Content-Type': 'application/json', Origin: requestOrigin }, body: JSON.stringify(body) });
    }
    async function upload(name, title = '', author = '') {
      const body = new FormData();
      body.append('file', new Blob([readFileSync(join(__dirname, 'fixtures', name))]), name);
      body.append('title', title); body.append('author', author);
      return fetch(`${origin}/api/books`, { method: 'POST', headers: { Origin: origin }, body });
    }
    async function waitForBook(id) {
      for (let i = 0; i < 120; i++) {
        const list = await (await fetch(`${origin}/api/books`)).json();
        const book = list.find(book => book.id === id);
        if (book && book.status !== 'extracting') return book;
        await delay(250);
      }
      throw new Error('Book extraction did not finish');
    }
    res = await upload('indexes.pdf'); assert.equal(res.status, 202, await res.clone().text());
    const pdfId = (await res.json()).id;
    const pdfBook = await waitForBook(pdfId);
    assert.equal(pdfBook.status, 'ready', pdfBook.error);
    assert.equal(pdfBook.title, 'A small guide to indexes');
    assert.equal(pdfBook._count.units, 2);
    assert.equal(existsSync(join(dir, 'books', `${pdfId}.original`)), true);
    assert.equal((await upload('indexes.pdf')).status, 409, 'duplicate file must not be stored twice');
    const pdfSearch = await (await fetch(`${origin}/api/books/${pdfId}/search?q=index`)).json();
    assert.equal(pdfSearch.results.length, 2);
    const pdfUnit = await (await fetch(`${origin}/api/books/${pdfId}/units/${pdfSearch.results[0].id}`)).json();
    const pdfPayload = { unitId: pdfUnit.id, start: 0, end: pdfUnit.text.length, quote: pdfUnit.text, title: pdfBook.title, author: pdfBook.author, location: pdfUnit.location };
    res = await send('/api/passages', 'POST', { ...pdfPayload, quote: 'forged text' }); assert.equal(res.status, 400);
    res = await send('/api/passages', 'POST', pdfPayload); assert.equal(res.status, 201);
    const pdfPassage = await res.json();
    res = await upload('indexes.epub', 'My EPUB', 'A reader'); assert.equal(res.status, 202);
    const epubId = (await res.json()).id;
    const epubBook = await waitForBook(epubId);
    assert.equal(epubBook.status, 'ready', epubBook.error); assert.equal(epubBook.title, 'My EPUB'); assert.equal(epubBook.author, 'A reader');
    const epubSearch = await (await fetch(`${origin}/api/books/${epubId}/search?q=measure`)).json();
    assert.equal(epubSearch.results.length, 1);
    assert.equal((await (await fetch(`${origin}/api/books/${epubId}/search?q=%25%25`)).json()).results.length, 0, 'percent is literal text, not a wildcard');
    const unit = await (await fetch(`${origin}/api/books/${epubId}/units/${epubSearch.results[0].id}`)).json();
    const selectionStart = unit.text.indexOf('Read & measure');
    const quote = unit.text.slice(selectionStart);
    assert.match(quote, /—/); assert.match(quote, /\n/);
    res = await send('/api/passages', 'POST', { unitId: unit.id, start: selectionStart, end: unit.text.length, quote, title: epubBook.title, author: epubBook.author, location: unit.location });
    assert.equal(res.status, 201); const epubPassage = await res.json(); assert.equal(epubPassage.quote, quote);
    assert.equal((await send(`/api/books/${epubId}`, 'PATCH', { title: 'Corrected book title', author: 'Corrected author' })).status, 200);
    assert.equal((await send(`/api/passages/${epubPassage.id}`, 'PATCH', { title: 'Saved attribution', author: 'A reader', location: 'Section 1 · reviewed location' })).status, 200);
    assert.equal((await send(`/api/passages/${epubPassage.id}`, 'PATCH', { title: 'X', author: '', location: 'X', quote: 'changed' })).status, 400, 'quotation is immutable');
    assert.equal((await send(`/api/books/${epubId}`, 'DELETE', {})).status, 400, 'deletion must specify a passage policy');
    assert.equal((await send('/api/passages', 'POST', pdfPayload, 'http://evil.example')).status, 403);
    const broken = new FormData(); broken.append('file', new Blob(['%PDF-broken']), 'broken.pdf');
    res = await fetch(`${origin}/api/books`, { method: 'POST', headers: { Origin: origin }, body: broken }); assert.equal(res.status, 202);
    const failedId = (await res.json()).id;
    assert.equal((await waitForBook(failedId)).status, 'failed');
    assert.equal(await client.passage.count(), 2, 'failed extraction must not lose existing passages');
    const unsupported = new FormData(); unsupported.append('file', new Blob(['test']), 'file.txt');
    assert.equal((await fetch(`${origin}/api/books`, { method: 'POST', headers: { Origin: origin }, body: unsupported })).status, 400);

    const config = await (await fetch(`${origin}/api/ai/config`)).json();
    assert.equal(config.configured, true); assert.equal(JSON.stringify(config).includes(n8n.token), false);
    assert.equal((await send('/api/ai/runs', 'POST', { bookId: epubId, consent: false })).status, 400);
    async function startAi() {
      const res = await send('/api/ai/runs', 'POST', { bookId: epubId, consent: true });
      assert.equal(res.status, 202, await res.clone().text()); return (await res.json()).id;
    }
    async function waitForAi(id) {
      for (let attempt = 0; attempt < 160; attempt++) {
        const page = await (await fetch(`${origin}/api/ai/runs/${id}`)).json();
        if (page.run?.status !== 'running') return page;
        await delay(50);
      }
      throw new Error('AI fixture run did not finish');
    }
    const aiId = await startAi(); let ai = await waitForAi(aiId);
    assert.equal(ai.run.status, 'completed'); assert.equal(ai.run.nextChunk, ai.run.totalChunks);
    assert.equal(ai.items.length, 1); assert.equal(await client.studyMaterial.count(), 0, 'unreviewed drafts cannot enter study');
    const draft = ai.items[0];
    const edits = Object.fromEntries(['title', 'question', 'answer', 'prompt', 'choices', 'correctChoice', 'explanation'].map(key => [key, draft[key]]));
    const approve = { material: edits, reviewed: true };
    assert.equal((await send(`/api/ai/suggestions/${draft.id}`, 'POST', { ...approve, reviewed: false })).status, 400);
    res = await send(`/api/ai/suggestions/${draft.id}`, 'POST', approve); assert.equal(res.status, 200); const materialId = (await res.json()).materialId;
    assert.equal((await send(`/api/ai/suggestions/${draft.id}`, 'POST', approve)).status, 200); assert.equal(await client.studyMaterial.count(), 1, 'acceptance is idempotent');
    res = await send(`/api/materials/${materialId}/attempts`, 'POST', { choice: 'a' }); assert.equal(res.status, 200); assert.equal((await res.json()).correct, true);
    assert.equal(await client.practiceAttempt.count({ where: { challengeId: `book-practice:${materialId}` } }), 1);
    state = await (await fetch(`${origin}/api/study`)).json();
    assert.equal(state.cards.find(card => card.id === `book-review:${materialId}`).source.quote, draft.quote);
    assert.equal((await post({ type: 'review', cardId: `book-review:${materialId}`, outcome: 'confident' })).status, 200);
    n8n.setMode('invalid'); ai = await waitForAi(await startAi());
    assert.equal(ai.items.length, 0); assert.equal(ai.run.skipped, 1, 'invented quotes must be discarded');
    n8n.setMode('wrong-batch'); ai = await waitForAi(await startAi());
    assert.equal(ai.run.status, 'failed'); assert.equal(ai.items.length, 0);
    // Add synthetic test chapters to exercise full-book coverage and the bounded continuation budget.
    for (let number = 0; number < 13; number++) await client.textUnit.create({ data: { id: randomUUID(), bookId: epubId, ordinal: 100 + number, location: `Synthetic test section ${number}`, text: `Synthetic test chapter ${number}. ` + 'x'.repeat(3900) } });
    n8n.setMode('valid'); const budgetId = await startAi(); ai = await waitForAi(budgetId);
    assert.equal(ai.run.status, 'paused'); assert.equal(ai.run.nextChunk, 12); assert.equal(ai.run.totalChunks, 15);
    assert.equal((await send(`/api/ai/runs/${budgetId}`, 'POST', { action: 'continue', consent: true })).status, 200);
    ai = await waitForAi(budgetId); assert.equal(ai.run.status, 'completed'); assert.equal(ai.run.nextChunk, 15);
    assert.ok(n8n.calls.every(call => call.chunks.length <= 2 && call.chunks.every(chunk => chunk.text.length <= 5000)));
    assert.ok(n8n.calls.every(call => !('notes' in call) && !('token' in call)), 'only selected-book input belongs in payloads');

    // Simulate a process stopping during an import, then back up and restore the complete data directory.
    await client.book.update({ where: { id: failedId }, data: { status: 'extracting' } });
    await stop(); await client.$disconnect();
    const backup = mkdtempSync(join(tmpdir(), 'commonplace-backup-'));
    try {
      cpSync(dir, backup, { recursive: true }); rmSync(dir, { recursive: true }); mkdirSync(dir); cpSync(backup, dir, { recursive: true });
    } finally { rmSync(backup, { recursive: true, force: true }); }
    await start();
    let passages = await (await fetch(`${origin}/api/passages`)).json();
    assert.equal(passages.items.length, 2);
    assert.equal(await client.passage.count(), 3);
    const restoredMaterials = await (await fetch(`${origin}/api/materials`)).json();
    assert.equal(restoredMaterials.length, 1); assert.equal(restoredMaterials[0].passage.quote, draft.quote);
    const restoredStudy = await (await fetch(`${origin}/api/study`)).json();
    assert.equal(restoredStudy.cards.find(card => card.id === `book-review:${materialId}`).due, false);
    assert.equal(passages.items.find(item => item.id === epubPassage.id).quote, quote);
    assert.equal(passages.items.find(item => item.id === epubPassage.id).title, 'Saved attribution');
    assert.equal(passages.items.find(item => item.id === epubPassage.id).location, 'Section 1 · reviewed location');
    const restoredBooks = await (await fetch(`${origin}/api/books`)).json();
    assert.equal(restoredBooks.find(item => item.id === failedId).status, 'failed');
    assert.equal(existsSync(join(dir, 'books', `${epubId}.original`)), true);
    assert.equal((await send(`/api/books/${pdfId}`, 'DELETE', { keepPassages: true })).status, 200);
    passages = await (await fetch(`${origin}/api/passages`)).json();
    const retained = passages.items.find(item => item.id === pdfPassage.id);
    assert.equal(retained.quote, pdfPayload.quote); assert.equal(retained.bookId, null); assert.equal(retained.unitId, null);
    assert.equal(existsSync(join(dir, 'books', `${pdfId}.original`)), false);
    assert.equal(await client.textUnit.count({ where: { bookId: pdfId } }), 0);
    assert.equal((await send(`/api/books/${epubId}`, 'DELETE', { keepPassages: false })).status, 200);
    passages = await (await fetch(`${origin}/api/passages`)).json();
    assert.equal(passages.items.length, 1); assert.equal(passages.items[0].id, pdfPassage.id);
    assert.equal(existsSync(join(dir, 'books', `${epubId}.original`)), false);
    assert.equal(await client.studyMaterial.count(), 0, 'removing book passages removes their derived study material');
    state = await (await fetch(`${origin}/api/study`)).json();
    assert.equal(state.notes, ''); assert.equal(state.read, true); assert.equal(state.practice, true);

  } finally {
    await stop(); await client.$disconnect(); await n8n.close(); rmSync(dir, { recursive: true, force: true });
  }
});
