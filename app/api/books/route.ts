import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, boundedBody, InputError, privateJson, requireLocal } from '../../../lib/local-api';
import { bookList, createBook, extractInBackground, MAX_FILE_BYTES, recoverBooks, reserveImport } from '../../../lib/books';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { requireLocal(request); await recoverBooks(); return privateJson(await bookList()); }
  catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  let release: (() => void) | undefined;
  try {
    requireLocal(request, true); await recoverBooks(); release = reserveImport();
    const bytes = await boundedBody(request, MAX_FILE_BYTES + 16_384);
    let form: FormData;
    try { form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData(); }
    catch { throw new InputError('Choose a PDF or EPUB file.'); }
    const file = form.get('file');
    if (!(file instanceof File)) throw new InputError('Choose a PDF or EPUB file.');
    const extension = file.name.split('.').at(-1)?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'epub') throw new InputError('Only PDF and EPUB files are supported.');
    const fields = z.object({ title: z.string().trim().max(500), author: z.string().trim().max(500) }).safeParse({ title: form.get('title') ?? '', author: form.get('author') ?? '' });
    if (!fields.success) throw new InputError('Title and author must be at most 500 characters.');
    const book = await createBook(Buffer.from(await file.arrayBuffer()), extension,
      fields.data.title || file.name.replace(/\.[^.]+$/, '').slice(0, 500) || 'Untitled book', fields.data.author);
    extractInBackground(book.id, extension, !!fields.data.title, !!fields.data.author, release);
    release = undefined;
    return privateJson({ id: book.id }, 202);
  } catch (error) { return apiError(error); }
  finally { release?.(); }
}
