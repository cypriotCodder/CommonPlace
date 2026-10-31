import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../lib/db';
import { conceptId } from '../../../../lib/content';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../../lib/local-api';
const metadata = z.object({ title: z.string().trim().min(1).max(500), author: z.string().trim().max(500), location: z.string().trim().min(1).max(250) }).strict();
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireLocal(request, true);
    const { id } = await context.params;
    const parsed = metadata.safeParse(await jsonBody(request));
    if (!parsed.success) throw new InputError('Enter a title and source location; keep title and author within 500 characters.');
    if (!(await db.passage.updateMany({ where: { id, conceptId }, data: parsed.data })).count) throw new InputError('Passage not found.', 404);
    return privateJson({ ok: true });
  } catch (error) { return apiError(error); }
}
