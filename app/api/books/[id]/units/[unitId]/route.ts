import { NextRequest } from 'next/server';
import { db } from '../../../../../../lib/db';
import { apiError, InputError, privateJson, requireLocal } from '../../../../../../lib/local-api';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; unitId: string }> }) {
  try {
    requireLocal(request);
    const { id, unitId } = await context.params;
    const unit = await db.textUnit.findFirst({ where: { id: unitId, bookId: id, book: { status: 'ready' } }, select: { id: true, bookId: true, text: true, location: true } });
    if (!unit) throw new InputError('This text section is no longer available.', 404);
    return privateJson(unit);
  } catch (error) { return apiError(error); }
}
