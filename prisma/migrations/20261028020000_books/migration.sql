CREATE TABLE "Book" (
  "id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "author" TEXT NOT NULL DEFAULT '',
  "format" TEXT NOT NULL, "checksum" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'extracting',
  "progress" INTEGER NOT NULL DEFAULT 0, "total" INTEGER NOT NULL DEFAULT 0, "error" TEXT,
  "keepPassages" BOOLEAN, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Book_checksum_key" ON "Book"("checksum");
CREATE TABLE "TextUnit" (
  "id" TEXT NOT NULL PRIMARY KEY, "bookId" TEXT NOT NULL, "ordinal" INTEGER NOT NULL,
  "location" TEXT NOT NULL, "text" TEXT NOT NULL,
  CONSTRAINT "TextUnit_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TextUnit_bookId_ordinal_key" ON "TextUnit"("bookId", "ordinal");
CREATE TABLE "Passage" (
  "id" TEXT NOT NULL PRIMARY KEY, "conceptId" TEXT NOT NULL, "bookId" TEXT, "unitId" TEXT,
  "start" INTEGER NOT NULL, "end" INTEGER NOT NULL, "quote" TEXT NOT NULL, "title" TEXT NOT NULL,
  "author" TEXT NOT NULL DEFAULT '', "location" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Passage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Passage_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "TextUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Passage_conceptId_createdAt_idx" ON "Passage"("conceptId", "createdAt");
