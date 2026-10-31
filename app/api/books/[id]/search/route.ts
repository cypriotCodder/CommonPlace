import { NextRequest } from 'next/server';
import { db } from '../../../../../lib/db';
import { apiError, InputError, privateJson, requireLocal } from '../../../../../lib/local-api';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireLocal(request);
    const { id } = await context.params;
    const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (query.length < 2 || query.length > 200) throw new InputError('Search with 2–200 characters.');
    const book = await db.book.findUnique({ where: { id } });
    if (!book) throw new InputError('Book not found.', 404);
    if (book.status !== 'ready') throw new InputError('This book is not ready to search.', 409);
    const units = await db.$queryRaw<{ id: string; location: string; text: string }[]>`
      SELECT id, location, text FROM TextUnit WHERE bookId = ${id} AND instr(lower(text), lower(${query})) > 0 ORDER BY ordinal LIMIT 21`;
    return privateJson({ more: units.length > 20, results: units.slice(0, 20).map(unit => {
      const match = unit.text.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, match - 120);
      return { id: unit.id, location: unit.location, snippet: `${start ? '…' : ''}${unit.text.slice(start, start + 420)}${start + 420 < unit.text.length ? '…' : ''}` };
    }) });
  } catch (error) { return apiError(error); }
}
