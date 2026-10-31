'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useStudy } from './StudyProvider';
import type { PassagePage, SavedPassage } from '../../lib/book-types';
import { bookApi, errorMessage, jsonOptions } from './book-api';

export function SavedPassages() {
  const { navigate } = useStudy();
  const [items, setItems] = useState<SavedPassage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const editButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const load = useCallback(async () => {
    try {
      const page = await bookApi<PassagePage>('/api/passages');
      setItems(page.items); setNextCursor(page.nextCursor); setLoaded(true); setError('');
    } catch (error) { setError(errorMessage(error)); }
  }, []);
  useEffect(() => {
    void load();
    const changed = () => { void load(); };
    window.addEventListener('commonplace:passages-changed', changed);
    return () => window.removeEventListener('commonplace:passages-changed', changed);
  }, [load]);
  async function more() {
    if (!nextCursor) return;
    setBusy(true);
    try {
      const page = await bookApi<PassagePage>(`/api/passages?before=${encodeURIComponent(nextCursor)}`);
      setItems(old => [...old, ...page.items.filter(item => !old.some(existing => existing.id === item.id))]); setNextCursor(page.nextCursor); setError('');
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      await bookApi(`/api/passages/${id}`, jsonOptions('PATCH', { title: fields.get('title'), author: fields.get('author'), location: fields.get('location') }));
      setEditing(null); await load(); setNotice('Source details saved.'); editButtons.current[id]?.focus();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="saved-passages" aria-labelledby="saved-passages-title">
    <h2 id="saved-passages-title">From your books</h2>
    <p className="passage-intro">Connections you chose to keep alongside this idea.</p>
    {error && <p role="alert">{error} <button className="text-btn" onClick={load}>Try again</button></p>}
    {!loaded && !error && <p role="status">Loading saved passages…</p>}
    {loaded && !items.length && <p>No passages yet. <button className="text-btn" onClick={() => navigate('books')}>Find one in your books →</button></p>}
    <div role="status" className="field-hint">{notice}</div>
    {items.map(item => <figure className="saved-passage" key={item.id}>
      <blockquote>{item.quote}</blockquote>
      <figcaption><cite>{item.title}</cite>{item.author ? ` · ${item.author}` : ' · Author unavailable'}<span>{item.location}</span>{!item.bookId && <small>Original book removed; quotation and attribution retained.</small>}</figcaption>
      <button className="text-btn" ref={element => { editButtons.current[item.id] = element; }} onClick={() => setEditing(editing === item.id ? null : item.id)} aria-expanded={editing === item.id}>Edit source details</button>
      {editing === item.id && <form className="passage-metadata" onSubmit={event => save(event, item.id)}>
        <label>Book title<input name="title" defaultValue={item.title} required maxLength={500} disabled={busy} /></label>
        <label>Author<input name="author" defaultValue={item.author} maxLength={500} disabled={busy} /></label>
        <label>Source location<input name="location" defaultValue={item.location} required maxLength={250} disabled={busy} /></label>
        <button className="btn secondary" disabled={busy}>{busy ? 'Saving…' : 'Save source details'}</button>
      </form>}
    </figure>)}
    {nextCursor && <button className="btn secondary" onClick={more} disabled={busy}>{busy ? 'Loading…' : 'Load more passages'}</button>}
  </section>;
}
