import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../lib/db';
import { recoverGeneration, startGeneration } from '../../../../lib/ai/jobs';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../../lib/local-api';
export async function GET(request: NextRequest) {
  try {
    requireLocal(request); await recoverGeneration();
    const bookId = request.nextUrl.searchParams.get('bookId');
    if (!bookId) throw new InputError('Choose a book.');
    return privateJson(await db.aiRun.findMany({ where: { bookId }, orderBy: { createdAt: 'desc' }, take: 20, include: { _count: { select: { suggestions: true } } } }));
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    requireLocal(request, true);
    const parsed = z.object({ bookId: z.string().uuid(), consent: z.literal(true) }).strict().safeParse(await jsonBody(request));
    if (!parsed.success) throw new InputError('Choose a book and confirm the data-sharing details.');
    return privateJson({ id: await startGeneration(parsed.data.bookId) }, 202);
  } catch (error) { return apiError(error); }
}
