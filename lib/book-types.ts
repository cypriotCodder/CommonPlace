export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  format: string;
  status: string;
  progress: number;
  total: number;
  error: string | null;
  _count: { units: number; passages: number };
}
export interface SourceUnit { id: string; bookId: string; location: string; text: string }
export interface SavedPassage {
  id: string; quote: string; title: string; author: string; location: string;
  bookId: string | null; unitId: string | null;
}
export interface PassagePage { items: SavedPassage[]; nextCursor: string | null }
