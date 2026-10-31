import { z } from 'zod';

export const choiceSchema = z.object({ id: z.enum(['a', 'b', 'c', 'd']), text: z.string().trim().min(1).max(1000) }).strict();
export const materialSchema = z.object({
  title: z.string().trim().min(1).max(180),
  question: z.string().trim().min(1).max(1000),
  answer: z.string().trim().min(1).max(3000),
  prompt: z.string().trim().min(1).max(2000),
  choices: z.array(choiceSchema).min(2).max(4),
  correctChoice: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string().trim().min(1).max(3000),
}).strict().refine(value => new Set(value.choices.map(choice => choice.id)).size === value.choices.length && value.choices.some(choice => choice.id === value.correctChoice), { message: 'Use unique choice IDs and identify an existing correct choice.' });

export const suggestionSchema = z.object({
  chunkId: z.string().max(100),
  quote: z.string().min(20).max(4000),
  reason: z.string().trim().min(1).max(1000),
  timeSensitive: z.boolean().optional().default(false),
  freshnessNote: z.string().trim().min(1).max(1000).optional().default('Freshness not checked; based on the book content.'),
  material: materialSchema,
}).strict();
export const batchResponseSchema = z.object({
  version: z.literal(1), runId: z.string(), batchId: z.string(),
  suggestions: z.array(z.unknown()).max(6),
}).strict();
export type MaterialDraft = z.infer<typeof materialSchema>;
export interface SourceChunk { id: string; unitId: string; start: number; location: string; text: string }
export interface GenerationBatch {
  version: 1; runId: string; batchId: string; topic: string;
  book: { title: string; author: string };
  chunks: SourceChunk[];
}
export const approvalSchema = z.object({ material: materialSchema, reviewed: z.literal(true), verifiedSource: z.string().url().max(2000).optional() }).strict();
export const generationLimits = { segmentChunks: 12, chunkChars: 5000, overlap: 250, batchChunks: 2, drafts: 200, approved: 200, runsPerBook: 100 } as const;
