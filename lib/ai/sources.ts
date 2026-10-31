import { generationLimits, type SourceChunk } from './contracts';

/** Cover every extracted section in reading order. Progress is resumable in bounded segments. */
export function bookChunks(units: { id: string; location: string; text: string }[]): SourceChunk[] {
  const chunks: SourceChunk[] = [];
  for (const unit of units) {
    for (let start = 0; start < unit.text.length; start += generationLimits.chunkChars - generationLimits.overlap) {
      const text = unit.text.slice(start, start + generationLimits.chunkChars);
      if (text.trim()) chunks.push({ id: `${unit.id}:${start}`, unitId: unit.id, start, location: unit.location, text });
      if (start + generationLimits.chunkChars >= unit.text.length) break;
    }
  }
  return chunks;
}

export function locateQuote(chunk: SourceChunk, quote: string) {
  const offset = chunk.text.indexOf(quote);
  if (offset < 0 || chunk.text.indexOf(quote, offset + 1) >= 0) return null;
  return { start: chunk.start + offset, end: chunk.start + offset + quote.length };
}
