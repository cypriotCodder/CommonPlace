import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../lib/db';
import { pauseGeneration, recoverGeneration, startGeneration } from '../../../../../lib/ai/jobs';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../../../lib/local-api';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    requireLocal(request); await recoverGeneration();
    const { id } = await context.params;
    const before = request.nextUrl.searchParams.get('before');
    if (before && !/^c[a-z0-9]{10,40}$/.test(before)) throw new InputError('Invalid draft cursor.');
    const run = await db.aiRun.findUnique({ where: { id } });
    if (!run) throw new InputError('Analysis not found.', 404);
    const drafts = await db.aiSuggestion.findMany({ where: { runId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 21,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}), include: { unit: { select: { location: true, bookId: true } } } });
    const items = drafts.slice(0, 20);
    return privateJson({ run, items, nextCursor: drafts.length > 20 ? items.at(-1)!.id : null });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    requireLocal(request, true); const { id } = await context.params;
    const parsed = z.discriminatedUnion('action', [z.object({ action: z.literal('pause') }), z.object({ action: z.literal('continue'), consent: z.literal(true) })]).safeParse(await jsonBody(request));
    if (!parsed.success) throw new InputError('Choose pause or confirm continuation.');
    if (parsed.data.action === 'pause') await pauseGeneration(id);
    else {
      const run = await db.aiRun.findUnique({ where: { id } });
      if (!run) throw new InputError('Analysis not found.', 404);
      await startGeneration(run.bookId, id);
    }
    return privateJson({ ok: true });
  } catch (error) { return apiError(error); }
}
