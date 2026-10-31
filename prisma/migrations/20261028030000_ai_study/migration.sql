CREATE TABLE "AiRun" (
  "id" TEXT NOT NULL PRIMARY KEY, "bookId" TEXT NOT NULL, "topic" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running', "batches" INTEGER NOT NULL DEFAULT 0,
  "completed" INTEGER NOT NULL DEFAULT 0, "totalChunks" INTEGER NOT NULL DEFAULT 0, "nextChunk" INTEGER NOT NULL DEFAULT 0, "skipped" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiRun_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AiRun_bookId_createdAt_idx" ON "AiRun"("bookId", "createdAt");
CREATE TABLE "StudyMaterial" (
  "id" TEXT NOT NULL PRIMARY KEY, "passageId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL, "timeSensitive" BOOLEAN NOT NULL DEFAULT false, "freshnessNote" TEXT NOT NULL DEFAULT '', "verifiedSource" TEXT, "checkedAt" DATETIME, "question" TEXT NOT NULL, "answer" TEXT NOT NULL,
  "prompt" TEXT NOT NULL, "choices" JSONB NOT NULL, "correctChoice" TEXT NOT NULL,
  "explanation" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyMaterial_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StudyMaterial_passageId_key" ON "StudyMaterial"("passageId");
CREATE TABLE "AiSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY, "runId" TEXT NOT NULL, "unitId" TEXT NOT NULL,
  "start" INTEGER NOT NULL, "end" INTEGER NOT NULL, "quote" TEXT NOT NULL,
  "reason" TEXT NOT NULL, "timeSensitive" BOOLEAN NOT NULL DEFAULT false, "freshnessNote" TEXT NOT NULL DEFAULT '', "title" TEXT NOT NULL, "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL, "prompt" TEXT NOT NULL, "choices" JSONB NOT NULL,
  "correctChoice" TEXT NOT NULL, "explanation" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft', "materialId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiSuggestion_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiSuggestion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "TextUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiSuggestion_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "StudyMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiSuggestion_materialId_key" ON "AiSuggestion"("materialId");
CREATE UNIQUE INDEX "AiSuggestion_runId_unitId_start_end_key" ON "AiSuggestion"("runId", "unitId", "start", "end");
