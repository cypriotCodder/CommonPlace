import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../lib/db';
import { approvalSchema, generationLimits } from '../../../../../lib/ai/contracts';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../../../lib/local-api';
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireLocal(request, true); const { id } = await context.params;
    const raw = await jsonBody(request);
    const reject = z.object({ action: z.literal('reject') }).strict().safeParse(raw);
    if (reject.success) {
      const changed = await db.aiSuggestion.updateMany({ where: { id, status: 'draft' }, data: { status: 'rejected' } });
      if (!changed.count) throw new InputError('This draft is no longer available.', 409);
      return privateJson({ ok: true });
    }
    const parsed = approvalSchema.safeParse(raw);
    if (!parsed.success) throw new InputError('Review the material and supply valid question, answer, choices, and explanation.');
    if (parsed.data.verifiedSource && !['http:', 'https:'].includes(new URL(parsed.data.verifiedSource).protocol)) throw new InputError('Use an HTTP or HTTPS source URL.');
    const materialId = await db.$transaction(async tx => {
      const draft = await tx.aiSuggestion.findUnique({ where: { id }, include: { unit: { include: { book: true } } } });
      if (!draft) throw new InputError('Draft not found.', 404);
      if (draft.status === 'accepted' && draft.materialId) return draft.materialId;
      if (draft.status !== 'draft' || draft.unit.book.status !== 'ready') throw new InputError('This draft is no longer available.', 409);
      if (draft.unit.text.slice(draft.start, draft.end) !== draft.quote) throw new InputError('The source quotation changed. Generate a new draft.', 409);
      if (await tx.studyMaterial.count() >= generationLimits.approved) throw new InputError('The study library is limited to 200 accepted materials.', 409);
      const passage = await tx.passage.create({ data: { conceptId: 'book-study', bookId: draft.unit.bookId, unitId: draft.unitId, start: draft.start, end: draft.end,
        quote: draft.quote, title: draft.unit.book.title, author: draft.unit.book.author, location: draft.unit.location } });
      const material = await tx.studyMaterial.create({ data: { passageId: passage.id, topic: parsed.data.material.title, ...parsed.data.material,
        timeSensitive: draft.timeSensitive, freshnessNote: draft.freshnessNote, verifiedSource: parsed.data.verifiedSource ?? null, checkedAt: parsed.data.verifiedSource ? new Date() : null } });
      await tx.aiSuggestion.update({ where: { id }, data: { status: 'accepted', materialId: material.id } });
      return material.id;
    });
    return privateJson({ materialId });
  } catch (error) { return apiError(error); }
}
