import { NextRequest } from 'next/server';
import { db } from '../../../../lib/db';
import { generationLimits } from '../../../../lib/ai/contracts';
import { bookChunks } from '../../../../lib/ai/sources';
import { apiError, InputError, privateJson, requireLocal } from '../../../../lib/local-api';
export async function GET(request: NextRequest) {
  try {
    requireLocal(request);
    const bookId = request.nextUrl.searchParams.get('bookId');
    if (!bookId) throw new InputError('Choose a book.');
    const book = await db.book.findUnique({ where: { id: bookId }, include: { units: { orderBy: { ordinal: 'asc' } } } });
    if (!book || book.status !== 'ready') throw new InputError('This book is not ready.', 409);
    const chunks = bookChunks(book.units);
    return privateJson({ totalChunks: chunks.length, totalCalls: Math.ceil(chunks.length / generationLimits.batchChunks),
      callsPerStep: Math.ceil(Math.min(chunks.length, generationLimits.segmentChunks) / generationLimits.batchChunks),
      charactersPerStep: chunks.slice(0, generationLimits.segmentChunks).reduce((sum, chunk) => sum + chunk.text.length, 0) });
  } catch (error) { return apiError(error); }
}
