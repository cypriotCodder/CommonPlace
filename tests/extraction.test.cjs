const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const fixture = name => readFile(join(__dirname, 'fixtures', name));

test('PDF extraction keeps page locations and metadata', async () => {
  const { extractBook } = await import('../scripts/book-extraction.mjs');
  const progress = [];
  const result = await extractBook(await fixture('indexes.pdf'), 'pdf', (current, total) => progress.push([current, total]));
  assert.equal(result.title, 'A small guide to indexes');
  assert.equal(result.author, 'Commonplace fixtures');
  assert.deepEqual(result.units.map(unit => unit.location), ['PDF page 1', 'PDF page 2']);
  assert.equal(result.units[0].text, 'An index helps locate matching rows.');
  assert.deepEqual(progress, [[1, 2], [2, 2]]);
});

test('EPUB extraction follows the spine and decodes plain text without executable content', async () => {
  const { extractBook } = await import('../scripts/book-extraction.mjs');
  const result = await extractBook(await fixture('indexes.epub'), 'epub');
  assert.equal(result.title, 'Indexing & tradeoffs');
  assert.equal(result.units.length, 2);
  assert.equal(result.units[0].location, 'Section 1 · Finding rows');
  assert.match(result.units[0].text, /Read & measure — then choose\./);
  assert.doesNotMatch(result.units[0].text, /Do not index|Not body text/);
  assert.match(result.units[1].text, /Indexes use storage/);
});

test('unsupported, unreadable, image-only, unsafe, and oversized inputs fail explicitly', async () => {
  const { extractBook, limits } = await import('../scripts/book-extraction.mjs');
  await assert.rejects(extractBook(Buffer.from('not a book'), 'pdf'), /not a PDF/);
  await assert.rejects(extractBook(Buffer.from('%PDF-broken'), 'pdf'));
  await assert.rejects(extractBook(await fixture('image-only.pdf'), 'pdf'), /No readable text/);
  await assert.rejects(extractBook(await fixture('unsafe.epub'), 'epub'), /invalid relative path/);
  await assert.rejects(extractBook(Buffer.alloc(limits.fileBytes + 1), 'pdf'), /25 MB/);
});
