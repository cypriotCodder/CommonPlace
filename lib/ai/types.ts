import type { MaterialDraft } from './contracts';
export interface AiConfig { configured: boolean; destination: string | null; provider: string | null; message: string | null }
export interface AiPreview { totalChunks: number; totalCalls: number; callsPerStep: number; charactersPerStep: number }
export interface AiRunInfo { id: string; status: string; totalChunks: number; nextChunk: number; completed: number; batches: number; skipped: number; error: string | null; createdAt: string; _count?: { suggestions: number } }
export interface AiDraft extends MaterialDraft { id: string; unitId: string; quote: string; reason: string; timeSensitive: boolean; freshnessNote: string; status: string; unit: { bookId: string; location: string } }
export interface AiPage { run: AiRunInfo; items: AiDraft[]; nextCursor: string | null }
export interface ApprovedMaterial { id: string; title: string; topic: string; question: string; answer: string; prompt: string; choices: { id: string; text: string }[];
  timeSensitive: boolean; freshnessNote: string; verifiedSource: string | null; checkedAt: string | null;
  passage: { id: string; title: string; author: string; location: string; quote: string; bookId: string | null } }
