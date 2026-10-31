import { PrismaClient } from '@prisma/client';

const globalDb = globalThis as typeof globalThis & { commonplaceDb?: PrismaClient };
export const db = globalDb.commonplaceDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.commonplaceDb = db;
