import { db } from '../db';
import { InputError } from '../local-api';
import { generationConfig } from './config';
import { batchResponseSchema, generationLimits, suggestionSchema, type GenerationBatch } from './contracts';
import { bookChunks, locateQuote } from './sources';

type GenerationJobs = { active: Map<string, AbortController>; recovery?: Promise<void> };
const globalJobs = globalThis as typeof globalThis & { generationJobs?: GenerationJobs };
const jobs: GenerationJobs = globalJobs.generationJobs ??= { active: new Map<string, AbortController>() };
export async function recoverGeneration() {
  if (!jobs.recovery) jobs.recovery = db.aiRun.updateMany({ where: { status: 'running' }, data: { status: 'paused', error: 'The server restarted. Continue from the last completed batch.' } }).then(() => {}).catch(error => { jobs.recovery = undefined; throw error; });
  await jobs.recovery;
}
async function limitedJson(response: Response) {
  if (!response.ok) throw new Error('n8n did not return a successful response. Check the webhook and provider settings.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('n8n returned an empty response.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 500_000) { await reader.cancel(); throw new Error('n8n returned more data than this batch supports.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('n8n returned invalid JSON. Configure a structured JSON response.'); }
}

export async function startGeneration(bookId: string, runId?: string) {
  await recoverGeneration();
  const config = generationConfig();
  if (!config) throw new InputError('Configure the n8n webhook, token, and AI provider before starting.', 503);
  if (jobs.active.size) throw new InputError('Another AI analysis is running. Wait for it to finish or pause it.', 409);
  // Reserve before any await so two requests cannot dispatch overlapping segments.
  const controller = new AbortController(); const reservation = runId ?? 'starting'; jobs.active.set(reservation, controller);
  let id: string | undefined;
  try {
    const book = await db.book.findUnique({ where: { id: bookId }, include: { units: { orderBy: { ordinal: 'asc' } } } });
    if (!book || book.status !== 'ready') throw new InputError('Choose a book that has finished extracting.');
    const chunks = bookChunks(book.units);
    if (!chunks.length) throw new InputError('This book has no readable text.');
    let run = runId ? await db.aiRun.findFirst({ where: { id: runId, bookId, status: { in: ['paused', 'failed'] } } }) : null;
    if (runId && !run) throw new InputError('This analysis cannot be continued.', 409);
    if (!run) {
      if (await db.aiRun.count({ where: { bookId } }) >= generationLimits.runsPerBook) throw new InputError('This book has reached its 100-analysis history limit.', 409);
      run = await db.aiRun.create({ data: { bookId, topic: 'Valuable concepts from this book', totalChunks: chunks.length, batches: Math.ceil(chunks.length / generationLimits.batchChunks) } });
    } else run = await db.aiRun.update({ where: { id: run.id }, data: { status: 'running', error: null } });
    id = run.id; jobs.active.delete(reservation); jobs.active.set(id, controller);
    const end = Math.min(chunks.length, run.nextChunk + generationLimits.segmentChunks);
    // Only the selected book's text and attribution leave the server, in small authenticated batches.
    void (async () => {
      try {
        for (let at = run.nextChunk; at < end; at += generationLimits.batchChunks) {
          if (controller.signal.aborted) break;
          const batch: GenerationBatch = { version: 1, runId: run.id, batchId: `${run.id}:${at}`, topic: run.topic,
            book: { title: book.title, author: book.author }, chunks: chunks.slice(at, Math.min(at + generationLimits.batchChunks, end)) };
          const response = await fetch(config.endpoint, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'X-Commonplace-Token': config.token },
            body: JSON.stringify(batch), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]) });
          const parsed = batchResponseSchema.safeParse(await limitedJson(response));
          if (!parsed.success || parsed.data.runId !== run.id || parsed.data.batchId !== batch.batchId) throw new Error('n8n returned data for the wrong batch or an invalid response.');
          if (controller.signal.aborted) break;
          await db.$transaction(async tx => {
            const stillRunning = await tx.aiRun.findFirst({ where: { id: run.id, status: 'running' } });
            if (!stillRunning) return;
            let skipped = 0;
            for (const raw of parsed.data.suggestions) {
              const candidate = suggestionSchema.safeParse(raw);
              if (!candidate.success) { skipped++; continue; }
              const value = candidate.data;
              const chunk = batch.chunks.find(item => item.id === value.chunkId);
              const range = chunk ? locateQuote(chunk, value.quote) : null;
              if (!chunk || !range || await tx.aiSuggestion.count({ where: { runId: run.id } }) >= generationLimits.drafts) { skipped++; continue; }
              const unit = await tx.textUnit.findUnique({ where: { id: chunk.unitId } });
              if (!unit || unit.bookId !== bookId || unit.text.slice(range.start, range.end) !== value.quote) { skipped++; continue; }
              if (await tx.aiSuggestion.findFirst({ where: { runId: run.id, unitId: chunk.unitId, start: range.start, end: range.end } })) continue;
              await tx.aiSuggestion.create({ data: { runId: run.id, unitId: chunk.unitId, ...range, quote: value.quote, reason: value.reason,
                timeSensitive: false, freshnessNote: 'Freshness not checked; based on the book content.', ...value.material } });
            }
            await tx.aiRun.update({ where: { id: run.id }, data: { nextChunk: at + batch.chunks.length, completed: { increment: 1 }, skipped: { increment: skipped } } });
          }, { timeout: 15_000 });
        }
        await db.aiRun.updateMany({ where: { id: run.id, status: 'running' }, data: { status: end >= chunks.length && !controller.signal.aborted ? 'completed' : 'paused' } });
      } catch (error) {
        await db.aiRun.updateMany({ where: { id: run.id, status: 'running' }, data: { status: controller.signal.aborted ? 'paused' : 'failed',
          error: controller.signal.aborted ? 'Paused. The current model call may still finish in n8n.' : (error instanceof Error && error.message.startsWith('n8n') ? error.message : 'The AI request did not finish. Check n8n, then continue from the last completed batch.') } }).catch(() => {});
      } finally { jobs.active.delete(run.id); }
    })();
    return run.id;
  } catch (error) { jobs.active.delete(reservation); if (id) jobs.active.delete(id); throw error; }
}
export async function pauseGeneration(id: string) {
  await recoverGeneration();
  const run = await db.aiRun.findUnique({ where: { id } });
  if (!run) throw new InputError('Analysis not found.', 404);
  await db.aiRun.updateMany({ where: { id, status: 'running' }, data: { status: 'paused', error: 'Paused. The current model call may still finish in n8n.' } });
  jobs.active.get(id)?.abort();
}
