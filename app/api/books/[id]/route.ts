import { NextRequest } from 'next/server';
import { z } from 'zod';
import { recoverGeneration } from '../../../../lib/ai/jobs';
import { db } from '../../../../lib/db';
import { finishDeletion, metadataSchema, recoverBooks } from '../../../../lib/books';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../../lib/local-api';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireLocal(request, true); await recoverBooks();
    const { id } = await context.params;
    const parsed = metadataSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new InputError('Enter a title and an author of at most 500 characters.');
    const book = await db.book.findUnique({ where: { id } });
    if (!book) throw new InputError('Book not found.', 404);
    if (book.status !== 'ready' && book.status !== 'failed') throw new InputError('Wait for the import to finish.', 409);
    await db.book.update({ where: { id }, data: parsed.data });
    return privateJson({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireLocal(request, true); await recoverBooks();
    const { id } = await context.params;
    const parsed = z.object({ keepPassages: z.boolean() }).safeParse(await jsonBody(request));
    if (!parsed.success) throw new InputError('Choose whether to keep saved passages.');
    const book = await db.book.findUnique({ where: { id } });
    if (!book) throw new InputError('Book not found.', 404);
    await recoverGeneration();
    if (await db.aiRun.count({ where: { bookId: id, status: 'running' } })) throw new InputError('Pause the AI analysis before deleting this book.', 409);
    if (book.status === 'extracting') throw new InputError('Wait for the import to finish before deleting.', 409);
    await db.book.update({ where: { id }, data: { status: 'deleting', keepPassages: parsed.data.keepPassages } });
    try { await finishDeletion(id, parsed.data.keepPassages); }
    catch (error) {
      await db.book.updateMany({ where: { id }, data: { status: 'failed', error: 'Deletion could not finish. Please try deleting this book again.' } });
      throw error;
    }
    return privateJson({ ok: true });
  } catch (error) { return apiError(error); }
}
