import { NextRequest } from 'next/server';
import { publicGenerationConfig } from '../../../../lib/ai/config';
import { apiError, privateJson, requireLocal } from '../../../../lib/local-api';
export async function GET(request: NextRequest) {
  try { requireLocal(request); return privateJson(publicGenerationConfig()); }
  catch (error) { return apiError(error); }
}
