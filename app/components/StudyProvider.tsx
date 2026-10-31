'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { StudyAction, StudySnapshot } from '../../lib/study-types';

export const viewLabels = { home: 'Study desk', read: 'Reading', practice: 'Practice', review: 'Review', books: 'Books' };
export type StudyView = keyof typeof viewLabels;

interface StudyContextValue {
  data: StudySnapshot;
  view: StudyView;
  navigation: number;
  navigate: (view: StudyView) => void;
  dueCards: StudySnapshot['cards'];
  confidentCount: number;
  completedCount: number;
  act: (action: StudyAction) => Promise<boolean>;
  saveNotes: (notes: string) => Promise<void>;
}

const StudyContext = createContext<StudyContextValue | null>(null);

async function requestStudy(action?: StudyAction): Promise<StudySnapshot> {
  const response = await fetch('/api/study', action ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
  } : { cache: 'no-store' });
  if (!response.ok) throw new Error('Study data could not be saved or loaded.');
  return response.json();
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudySnapshot | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<StudyView>('home');
  const [navigation, setNavigation] = useState(0);
  const [now, setNow] = useState(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // Reads triggered by accepted/deleted book material share the write queue so an
  // older snapshot cannot replace the result of a more recent study action.
  const enqueue = useCallback((action?: StudyAction) => {
    const result = queue.current.then(async () => {
      const snapshot = await requestStudy(action);
      setData(snapshot);
      setNow(Date.now());
    });
    queue.current = result.catch(() => {});
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let snapshot = await requestStudy();
        const raw = snapshot.prototypeImported ? null : localStorage.getItem('commonplace-study-v1');
        if (cancelled) return;
        if (raw !== null) {
          const old: unknown = JSON.parse(raw);
          if (!old || typeof old !== 'object' || Array.isArray(old)) throw new Error('Invalid previous browser data.');
          snapshot = await requestStudy({ type: 'import', data: old });
        }
        if (!cancelled) { setData(snapshot); setNow(Date.now()); }
      } catch {
        if (!cancelled) setError('Could not load or import your study data. Your browser data has not been deleted. Check the server and reload this page.');
      }
    }
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    const refresh = () => { void enqueue().catch(() => setError('Could not refresh the study queue. Reload to try again.')); };
    window.addEventListener('commonplace:materials-changed', refresh);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('commonplace:materials-changed', refresh); };
  }, [enqueue]);

  const navigate = useCallback((next: StudyView) => {
    setView(next); setNavigation(value => value + 1); setNow(Date.now());
  }, []);
  const act = useCallback(async (action: StudyAction) => {
    try { await enqueue(action); setError(''); return true; }
    catch { setError('Could not save your progress. Please try again.'); return false; }
  }, [enqueue]);
  const saveNotes = useCallback((notes: string) => enqueue({ type: 'notes', notes }), [enqueue]);

  if (!data) return <main id="main-content" tabIndex={-1}>{error ? <div className="storage-error" role="alert">{error}</div> : <p role="status">Loading your study data…</p>}</main>;
  const dueCards = data.cards.filter(card => card.dueAt === null || card.dueAt <= now);
  const confidentCount = data.cards.filter(card => card.kind === 'curated' && card.confident).length;
  const completedCount = Number(data.read) + Number(data.practice) + confidentCount;

  return <StudyContext.Provider value={{ data, view, navigation, navigate, dueCards, confidentCount, completedCount, act, saveNotes }}>
    {error && <div className="storage-error" role="alert">{error}</div>}
    {children}
  </StudyContext.Provider>;
}

export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error('Study components must be inside StudyProvider.');
  return value;
}
