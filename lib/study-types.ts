export type PracticeChoice = 'a' | 'b' | 'c';
export type ReviewOutcome = 'again' | 'confident';

export interface StudyCard {
  id: string;
  q: string;
  a: string;
  kind: 'curated' | 'book';
  due: boolean;
  dueAt: number | null;
  confident: boolean;
  source: null | {
    title: string;
    author: string;
    location: string;
    quote: string;
    topic: string;
    freshnessNote: string;
    verifiedSource: string | null;
    checkedAt: string | null;
  };
}

export interface StudySnapshot {
  prototypeImported: boolean;
  notes: string;
  read: boolean;
  practice: boolean;
  cards: StudyCard[];
}

export type StudyAction =
  | { type: 'import'; data: unknown }
  | { type: 'notes'; notes: string }
  | { type: 'read' }
  | { type: 'practice'; choice: PracticeChoice }
  | { type: 'review'; cardId: string; outcome: ReviewOutcome };
