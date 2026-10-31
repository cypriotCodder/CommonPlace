'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStudy } from './StudyProvider';

export function useNotes() {
  const { data, saveNotes } = useStudy();
  const [notes, setNotes] = useState(data.notes);
  const [status, setStatus] = useState('Saved on this device');
  const latest = useRef({ notes: data.notes, version: 0, savedVersion: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const save = useCallback(async () => {
    const { notes, version, savedVersion } = latest.current;
    if (version === savedVersion) return;
    setStatus('Saving…');
    try {
      await saveNotes(notes);
      latest.current.savedVersion = version;
      if (version === latest.current.version) setStatus('Saved on this device');
    } catch {
      if (version === latest.current.version) setStatus('Could not save. Your text is still here; edit it or select Retry save.');
    }
  }, [saveNotes]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (latest.current.version !== latest.current.savedVersion) { event.preventDefault(); event.returnValue = ''; }
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => { clearTimeout(timer.current); window.removeEventListener('beforeunload', warnBeforeUnload); };
  }, []);

  function changeNotes(value: string) {
    setNotes(value);
    latest.current.notes = value;
    latest.current.version++;
    setStatus('Saving…');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, 350);
  }
  function retrySave() { clearTimeout(timer.current); void save(); }
  return { notes, status, changeNotes, retrySave };
}
