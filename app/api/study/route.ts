import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { cards, conceptId, challengeId } from '../../../lib/content';
import { apiError, InputError, jsonBody, requireLocal } from '../../../lib/local-api';
import type { StudySnapshot } from '../../../lib/study-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const ids = cards.map(card => card.id);
const legacy = z.object({
  notes: z.string().max(5_000_000).optional(),
  read: z.boolean().optional(),
  practice: z.boolean().optional(),
  confident: z.array(z.number().int().min(0).max(2)).max(3).optional(),
}).strict();
const action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('import'), data: legacy }),
  z.object({ type: z.literal('notes'), notes: z.string().max(5_000_000) }),
  z.object({ type: z.literal('read') }),
  z.object({ type: z.literal('practice'), choice: z.enum(['a', 'b', 'c']) }),
  z.object({ type: z.literal('review'), cardId: z.string().min(1).max(100), outcome: z.enum(['again', 'confident']) }),
]);

async function snapshot(): Promise<StudySnapshot> {
  const materials = await db.studyMaterial.findMany({ orderBy: { createdAt: 'asc' }, take: 200, include: { passage: true } });
  const studyCards = [...cards.map(card => ({ ...card, kind: 'curated' as const, source: null })), ...materials.map(item => ({
    id: `book-review:${item.id}`, q: item.question, a: item.answer, kind: 'book' as const,
    source: { title: item.passage.title, author: item.passage.author, location: item.passage.location, quote: item.passage.quote,
      topic: item.title, freshnessNote: item.freshnessNote, verifiedSource: item.verifiedSource, checkedAt: item.checkedAt?.toISOString() ?? null },
  }))];
  const ids = studyCards.map(card => card.id);
  const [progress, schedule, events, imported] = await Promise.all([
    db.conceptProgress.findUnique({ where: { conceptId } }),
    db.reviewCard.findMany({ where: { cardId: { in: ids } } }),
    db.reviewEvent.groupBy({ by: ['cardId'], where: { outcome: 'confident', cardId: { in: ids } } }),
    db.migrationMarker.findUnique({ where: { id: 'prototype-v1' } }),
  ]);
  const due = new Map(schedule.map(item => [item.cardId, item.dueAt.getTime()]));
  const now = Date.now();
  return { prototypeImported: !!imported, notes: progress?.notes ?? '', read: progress?.read ?? false, practice: progress?.practice ?? false,
    cards: studyCards.map(card => ({ ...card, due: (due.get(card.id) ?? 0) <= now, dueAt: due.get(card.id) ?? null, confident: events.some(event => event.cardId === card.id) })) };
}

export async function GET(request: NextRequest) {
  try { requireLocal(request); return NextResponse.json(await snapshot(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    requireLocal(request, true);
    const parsed = action.safeParse(await jsonBody(request, 5_500_000));
    if (!parsed.success) throw new InputError('Invalid study data.');
    const value = parsed.data;
    await db.$transaction(async tx => {
      if (value.type === 'import') {
        if (await tx.migrationMarker.findUnique({ where: { id: 'prototype-v1' } })) return;
        const old = await tx.conceptProgress.findUnique({ where: { conceptId } });
        await tx.conceptProgress.upsert({ where: { conceptId }, create: { conceptId, notes: value.data.notes ?? '', read: value.data.read ?? false, practice: value.data.practice ?? false },
          update: { notes: old ? old.notes : (value.data.notes ?? ''), read: !!old?.read || !!value.data.read, practice: !!old?.practice || !!value.data.practice } });
        for (const index of new Set(value.data.confident ?? [])) {
          const cardId = cards[index].id;
          if (!await tx.reviewCard.findUnique({ where: { cardId } })) {
            await tx.reviewCard.create({ data: { cardId, dueAt: new Date(Date.now() + 86_400_000) } });
            await tx.reviewEvent.create({ data: { cardId, outcome: 'confident' } });
          }
        }
        await tx.migrationMarker.create({ data: { id: 'prototype-v1' } });
      } else if (value.type === 'notes') {
        await tx.conceptProgress.upsert({ where: { conceptId }, create: { conceptId, notes: value.notes }, update: { notes: value.notes } });
      } else if (value.type === 'read') {
        await tx.conceptProgress.upsert({ where: { conceptId }, create: { conceptId, read: true }, update: { read: true } });
      } else if (value.type === 'practice') {
        await tx.practiceAttempt.create({ data: { conceptId, challengeId, choice: value.choice } });
        await tx.conceptProgress.upsert({ where: { conceptId }, create: { conceptId, practice: true }, update: { practice: true } });
      } else {
        if (!ids.includes(value.cardId as typeof ids[number])) {
          const materialId = value.cardId.startsWith('book-review:') ? value.cardId.slice('book-review:'.length) : '';
          if (!materialId) throw new InputError('Invalid review card.');
          if (!await tx.studyMaterial.findUnique({ where: { id: materialId } })) throw new InputError('This review card is no longer available.', 404);
        }
        const dueAt = new Date(Date.now() + (value.outcome === 'confident' ? 86_400_000 : 0));
        await tx.reviewEvent.create({ data: { cardId: value.cardId, outcome: value.outcome } });
        await tx.reviewCard.upsert({ where: { cardId: value.cardId }, create: { cardId: value.cardId, dueAt }, update: { dueAt } });
      }
    });
    return NextResponse.json(await snapshot(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
