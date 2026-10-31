import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../../lib/db';
import { choiceSchema } from '../../../../../lib/ai/contracts';
import { apiError, InputError, jsonBody, privateJson, requireLocal } from '../../../../../lib/local-api';
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireLocal(request, true); const { id } = await context.params;
    const parsed = z.object({ choice: z.enum(['a', 'b', 'c', 'd']) }).strict().safeParse(await jsonBody(request));
    if (!parsed.success) throw new InputError('Choose an answer.');
    const feedback = await db.$transaction(async tx => {
      const material = await tx.studyMaterial.findUnique({ where: { id } });
      if (!material) throw new InputError('This material is no longer available.', 404);
      const choices = z.array(choiceSchema).parse(material.choices);
      if (!choices.some(choice => choice.id === parsed.data.choice)) throw new InputError('This answer is not an available choice.');
      await tx.practiceAttempt.create({ data: { conceptId: 'book-study', challengeId: `book-practice:${id}`, choice: parsed.data.choice } });
      return { correct: parsed.data.choice === material.correctChoice, correctChoice: material.correctChoice, explanation: material.explanation };
    });
    return privateJson(feedback);
  } catch (error) { return apiError(error); }
}
