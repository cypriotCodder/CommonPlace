import { NextRequest } from 'next/server';
import { db } from '../../../lib/db';
import { apiError, privateJson, requireLocal } from '../../../lib/local-api';
export async function GET(request: NextRequest) {
  try {
    requireLocal(request);
    const rows = await db.studyMaterial.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { passage: true } });
    return privateJson(rows.map(({ correctChoice: _correctChoice, explanation: _explanation, ...item }) => item));
  } catch (error) { return apiError(error); }
}
