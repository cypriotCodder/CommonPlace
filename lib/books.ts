import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';
import { db } from './db';
import { InputError } from './local-api';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const metadataSchema = z.object({ title: z.string().trim().min(1).max(500), author: z.string().trim().max(500) });
const resultSchema = z.object({
  title: z.string().max(500), author: z.string().max(500),
  units: z.array(z.object({ text: z.string().min(1).max(120_000), location: z.string().min(1).max(250) })).min(1).max(1500),
});
const stateGlobal = globalThis as typeof globalThis & { bookJobs?: { busy: boolean; recovery?: Promise<void> } };
const jobs = stateGlobal.bookJobs ??= { busy: false };

function bookDirectory() {
  const url = process.env.DATABASE_URL ?? 'file:../data/commonplace.db';
  if (!url.startsWith('file:')) throw new Error('A local SQLite database is required.');
  const dbPath = path.resolve(process.cwd(), 'prisma', decodeURIComponent(url.slice(5).split('?')[0]));
  return path.join(path.dirname(dbPath), 'books');
}
export function originalPath(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new InputError('Book not found.', 404);
  return path.join(bookDirectory(), `${id}.original`);
}

export async function finishDeletion(id: string, keepPassages: boolean) {
  await rm(originalPath(id), { force: true });
  await db.$transaction(async tx => {
    if (!keepPassages) await tx.passage.deleteMany({ where: { bookId: id } });
    // SetNull retains quotation and attribution snapshots when passages are kept.
    await tx.book.delete({ where: { id } });
  });
}
export async function recoverBooks() {
  if (!jobs.recovery) jobs.recovery = (async () => {
    await db.book.updateMany({ where: { status: 'extracting' }, data: { status: 'failed', error: 'Import was interrupted. Delete this entry and import the file again.' } });
    const deleting = await db.book.findMany({ where: { status: 'deleting' } });
    for (const book of deleting) {
      try { await finishDeletion(book.id, book.keepPassages ?? true); }
      catch { await db.book.update({ where: { id: book.id }, data: { status: 'failed', error: 'Deletion was interrupted. Please try deleting this book again.' } }); }
    }
    // A crash between writing an original and creating its database row can leave an orphan.
    const known = new Set((await db.book.findMany({ select: { id: true } })).map(book => `${book.id}.original`));
    let files: string[] = [];
    try { files = await readdir(bookDirectory()); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    for (const name of files) {
      if (/^[0-9a-f-]{36}\.original$/.test(name) && !known.has(name)) await rm(path.join(bookDirectory(), name), { force: true });
    }
  })().catch(error => { jobs.recovery = undefined; throw error; });
  await jobs.recovery;
}
export function reserveImport() {
  if (jobs.busy) throw new InputError('Another book is importing. Please wait for it to finish.', 409);
  jobs.busy = true;
  return () => { jobs.busy = false; };
}

export async function createBook(bytes: Buffer, format: 'pdf' | 'epub', title: string, author: string) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new InputError('Choose a nonempty PDF or EPUB up to 25 MB.');
  if ((format === 'pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') ||
      (format === 'epub' && bytes.subarray(0, 2).toString() !== 'PK')) throw new InputError('The file contents do not match the selected format.');
  if (await db.book.count() >= 200) throw new InputError('The local library is limited to 200 books. Delete a book before importing another.', 409);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (await db.book.findUnique({ where: { checksum } })) throw new InputError('This file is already in your library. Delete its entry first if you need to re-import it.', 409);
  const id = randomUUID();
  await mkdir(bookDirectory(), { recursive: true, mode: 0o700 });
  await writeFile(originalPath(id), bytes, { flag: 'wx', mode: 0o600 });
  try { return await db.book.create({ data: { id, title, author, format, checksum } }); }
  catch (error) { await rm(originalPath(id), { force: true }); throw error; }
}

export function extractInBackground(id: string, format: string, titleProvided: boolean, authorProvided: boolean, release: () => void) {
  const child = spawn(process.execPath, ['--max-old-space-size=384', path.join(process.cwd(), 'scripts/book-extraction.mjs'), originalPath(id), format], { stdio: ['ignore', 'pipe', 'ignore'], env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, NODE_ENV: process.env.NODE_ENV } });
  let result: z.infer<typeof resultSchema> | undefined;
  let message = 'This book could not be extracted. It may be damaged, encrypted, or unsupported.';
  let bytes = 0, lastProgress = 0;
  let updates = Promise.resolve();
  const timer = setTimeout(() => { message = 'Extraction exceeded the two-minute limit. Try a smaller book.'; child.kill('SIGKILL'); }, 120_000);
  const lines = createInterface({ input: child.stdout });
  child.stdout.on('data', chunk => { bytes += chunk.length; if (bytes > 48 * 1024 * 1024) { message = 'Extracted text exceeds the supported size.'; child.kill('SIGKILL'); } });
  lines.on('line', line => {
    try {
      const item = JSON.parse(line);
      if (item.type === 'result') result = resultSchema.parse(item.result);
      else if (item.type === 'error') {
        // Worker parser messages contain no original book text; suppress filesystem paths.
        if (typeof item.error === 'string' && !item.error.includes(process.cwd()) && !item.error.includes('ENOENT')) message = item.error.slice(0, 500);
      } else if (item.type === 'progress' && Number.isInteger(item.current) && Number.isInteger(item.total) && item.current <= item.total && item.total <= 1500 && item.current > 0 &&
        (Date.now() - lastProgress > 300 || item.current === item.total)) {
        lastProgress = Date.now();
        updates = updates.then(async () => { await db.book.update({ where: { id }, data: { progress: item.current, total: item.total } }); }).catch(() => {});
      }
    } catch { message = 'The extracted book data was invalid.'; }
  });
  child.on('error', () => { message = 'The extraction process could not start. Please try again.'; });
  child.on('close', code => {
    clearTimeout(timer); lines.close();
    void (async () => {
      await updates;
      if (code !== 0 || !result || result.units.reduce((sum, unit) => sum + unit.text.length, 0) > 8_000_000) {
        await db.book.update({ where: { id }, data: { status: 'failed', error: message } });
        return;
      }
      await db.$transaction(async tx => {
        await tx.textUnit.createMany({ data: result!.units.map((unit, ordinal) => ({ ...unit, id: randomUUID(), bookId: id, ordinal })) });
        await tx.book.update({ where: { id }, data: { status: 'ready', error: null,
          ...(!titleProvided && result!.title.trim() ? { title: result!.title.trim() } : {}),
          ...(!authorProvided && result!.author.trim() ? { author: result!.author.trim() } : {}),
        } });
      }, { timeout: 30_000 });
    })().catch(async () => {
      await db.book.updateMany({ where: { id }, data: { status: 'failed', error: 'Could not store the extracted text. Delete this entry and try again.' } }).catch(() => {});
    }).finally(release);
  });
}

export async function bookList() {
  return db.book.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: {
    id: true, title: true, author: true, format: true, status: true, progress: true, total: true, error: true,
    _count: { select: { units: true, passages: true } },
  } });
}
