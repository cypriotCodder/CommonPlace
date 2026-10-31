import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { conceptId } from '../../../lib/content';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../lib/local-api';

const passageMetadata = z.object({ title: z.string().trim().min(1).max(500), author: z.string().trim().max(500), location: z.string().trim().min(1).max(250) });
const selection = passageMetadata.extend({ unitId: z.string().uuid(), start: z.number().int().min(0), end: z.number().int().min(1), quote: z.string().min(1).max(20_000) });
export async function GET(request: NextRequest) {
  try {
    requireLocal(request);
    const cursor = request.nextUrl.searchParams.get('before');
    if (cursor && !/^c[a-z0-9]{10,40}$/.test(cursor)) throw new InputError('Invalid passage cursor.');
    const rows = await db.passage.findMany({ where: { conceptId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, 20);
    return privateJson({ items, nextCursor: rows.length > 20 ? items.at(-1)!.id : null });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    requireLocal(request, true);
    const parsed = selection.safeParse(await jsonBody(request, 150_000));
    if (!parsed.success) throw new InputError('Select a passage of at most 20,000 characters and review its source details.');
    const { unitId, start, end, quote, ...metadata } = parsed.data;
    const passage = await db.$transaction(async tx => {
      const unit = await tx.textUnit.findUnique({ where: { id: unitId }, include: { book: { select: { status: true } } } });
      if (!unit || unit.book.status !== 'ready') throw new InputError('The source text is no longer available.', 409);
      if (end <= start || end > unit.text.length || unit.text.slice(start, end) !== quote || !quote.trim()) throw new InputError('The selection does not match the source text. Select it again.');
      return tx.passage.create({ data: { conceptId, bookId: unit.bookId, unitId, start, end, quote, ...metadata } });
    });
    return privateJson(passage, 201);
  } catch (error) { return apiError(error); }
}
