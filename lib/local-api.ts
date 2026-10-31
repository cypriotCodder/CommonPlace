import { NextRequest, NextResponse } from 'next/server';

export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function requireLocal(request: NextRequest, mutation = false) {
  const host = request.headers.get('host') ?? '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(host) ||
      (mutation && request.headers.get('origin') !== `http://${host}`)) {
    throw new InputError('Forbidden.', 403);
  }
}

export async function boundedBody(request: NextRequest, limit: number) {
  if (Number(request.headers.get('content-length') ?? 0) > limit) throw new InputError('The upload is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('A request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new InputError('The upload is too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function jsonBody(request: NextRequest, limit = 100_000) {
  try { return JSON.parse((await boundedBody(request, limit)).toString('utf8')); }
  catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('The request is not valid JSON.');
  }
}

export function apiError(error: unknown) {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status });
  // Do not log imported book text, metadata, or local paths.
  console.error('Local book operation failed.');
  return NextResponse.json({ error: 'The operation could not be completed. Please try again.' }, { status: 500 });
}

export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
