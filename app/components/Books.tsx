'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { LibraryBook, SourceUnit } from '../../lib/book-types';
import { BookAi } from './BookAi';
import { useStudy } from './StudyProvider';
import { bookApi, errorMessage, jsonOptions, passagesChanged } from './book-api';

type SearchResult = { id: string; location: string; snippet: string };
type Selection = { start: number; end: number; quote: string };

export function Books() {
  const { view } = useStudy();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [more, setMore] = useState(false);
  const [source, setSource] = useState<SourceUnit | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [keepPassages, setKeepPassages] = useState(true);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const requestVersion = useRef(0);
  const trackedImport = useRef<string | null>(null);
  const book = books.find(item => item.id === selectedId);
  const importing = books.some(item => item.status === 'extracting' || item.status === 'deleting');
  const refresh = useCallback(async () => {
    const list = await bookApi<LibraryBook[]>('/api/books');
    setBooks(list); setLoaded(true);
  }, []);
  useEffect(() => { refresh().catch(error => setError(errorMessage(error))); }, [refresh]);
  useEffect(() => {
    if (!importing) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { if (!cancelled) await refresh(); } catch (error) { if (!cancelled) setError(errorMessage(error)); }
      if (!cancelled) timer = setTimeout(poll, 1000);
    }
    timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [importing, refresh]);

  useEffect(() => {
    const imported = books.find(item => item.id === trackedImport.current);
    if (imported?.status === 'ready' || imported?.status === 'failed') {
      setNotice(imported.status === 'ready' ? 'Import complete. Choose the book and search its text.' : 'Import failed. Review the book entry for details.');
      trackedImport.current = null;
    }
  }, [books]);

  function choose(id: string) {
    requestVersion.current++;
    setSelectedId(id); setSource(null); setSelection(null); setResults([]); setSearched(false);
    setMore(false); setDeleting(false); setError(''); setNotice(''); setQuery(''); setBusy(false);
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) { setError('Choose a nonempty PDF or EPUB up to 25 MB.'); return; }
    setUploading(true); setError(''); setNotice('Uploading the original to your local library…');
    try {
      const result = await bookApi<{ id: string }>('/api/books', { method: 'POST', body });
      form.reset(); trackedImport.current = result.id; await refresh(); choose(result.id); setNotice('File received. Extracting text locally…');
    } catch (error) { setError(errorMessage(error)); setNotice(''); }
    finally { setUploading(false); }
  }
  async function search(event: FormEvent) {
    event.preventDefault(); if (!book) return;
    const version = ++requestVersion.current;
    setBusy(true); setError(''); setSource(null); setSelection(null);
    try {
      const response = await bookApi<{ results: SearchResult[]; more: boolean }>(`/api/books/${book.id}/search?q=${encodeURIComponent(query.trim())}`);
      if (version !== requestVersion.current) return;
      setResults(response.results); setMore(response.more); setSearched(true);
    } catch (error) { if (version === requestVersion.current) setError(errorMessage(error)); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  async function openSource(unitId: string) {
    if (!book) return;
    const version = ++requestVersion.current;
    setBusy(true); setError(''); setSelection(null);
    try {
      const unit = await bookApi<SourceUnit>(`/api/books/${book.id}/units/${unitId}`);
      if (version !== requestVersion.current) return;
      setSource(unit);
      requestAnimationFrame(() => {
        const field = sourceRef.current;
        if (field) {
          field.scrollIntoView({ block: 'center' }); field.focus();
          const index = unit.text.toLowerCase().indexOf(query.trim().toLowerCase());
          if (index >= 0) field.setSelectionRange(index, index + query.trim().length);
        }
      });
    } catch (error) { if (version === requestVersion.current) setError(errorMessage(error)); }
    finally { if (version === requestVersion.current) setBusy(false); }
  }
  function useSelection() {
    const field = sourceRef.current;
    if (!source || !field || field.selectionEnd <= field.selectionStart) { setError('Select text in the source field first. You can use Shift and the arrow keys.'); return; }
    const start = field.selectionStart, end = field.selectionEnd;
    const quote = source.text.slice(start, end);
    if (!quote.trim() || quote.length > 20_000) { setError('Select a nonempty passage of at most 20,000 characters.'); return; }
    setSelection({ start, end, quote }); setError(''); setNotice('Review the exact passage and its source details below.');
    requestAnimationFrame(() => document.getElementById('selected-quote')?.focus());
  }
  async function savePassage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!source || !selection) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await bookApi('/api/passages', jsonOptions('POST', { ...selection, unitId: source.id, title: fields.get('title'), author: fields.get('author'), location: fields.get('location') }));
      setSelection(null); setNotice('Passage saved to Understanding indexes.'); passagesChanged(); await refresh();
      sourceRef.current?.focus();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function editMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!book) return;
    const fields = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      await bookApi(`/api/books/${book.id}`, jsonOptions('PATCH', { title: fields.get('title'), author: fields.get('author') }));
      await refresh(); setNotice('Book details saved. Existing passages retain their saved attribution.');
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function deleteBook() {
    if (!book) return;
    setBusy(true); setError('');
    try {
      await bookApi(`/api/books/${book.id}`, jsonOptions('DELETE', { keepPassages }));
      setSelectedId(null); setSource(null); setSelection(null); setDeleting(false);
      await refresh(); passagesChanged(); window.dispatchEvent(new Event('commonplace:materials-changed')); setNotice(keepPassages ? 'Book deleted. Saved passages and attribution were kept.' : 'Book and its saved passages deleted.');
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <section className={`view${view === 'books' ? ' active' : ''}`} id="books" aria-labelledby="books-title">
      <p className="eyebrow">Your own reading</p>
      <h1 id="books-title" tabIndex={-1}>A shelf of connections.</h1>
      <p className="sub">Find a passage in your books and bring it back to the concept.</p>
      <div className="book-feedback" role="status">{notice}</div>
      {error && <div className="storage-error" role="alert">{error} <button className="text-btn" onClick={() => refresh().catch(error => setError(errorMessage(error)))}>Refresh library</button></div>}
      <form className="book-import" onSubmit={upload} aria-busy={uploading}>
        <h2>Bring a book</h2>
        <p>Text-based PDF or EPUB, up to 25 MB. Extraction happens on this computer. Scans and DRM are not supported.</p>
        <div className="book-fields">
          <label>File<input type="file" name="file" accept=".pdf,.epub,application/pdf,application/epub+zip" required disabled={uploading || importing} /></label>
          <label>Title <span className="field-hint">(optional)</span><input name="title" maxLength={500} disabled={uploading} /></label>
          <label>Author <span className="field-hint">(optional)</span><input name="author" maxLength={500} disabled={uploading} /></label>
        </div>
        <button className="btn" disabled={uploading || importing}>{uploading ? 'Uploading…' : importing ? 'Import in progress…' : 'Import book'}</button>
        <p className="field-hint">When available, title and author are read from the file. You can correct them after import.</p>
      </form>
      <div className="book-workspace">
        <aside className="book-shelf" aria-label="Imported books">
          <div className="section-title"><h2>Your library</h2><span>{books.length} / 200</span></div>
          {!loaded && !error && <p role="status">Loading your library…</p>}
          {loaded && !books.length && <p className="muted-copy">Your shelf is empty. Import a book to start making connections.</p>}
          <ul className="book-list">{books.map(item => <li key={item.id}>
            <button className={`book-row${item.id === selectedId ? ' selected' : ''}`} aria-pressed={item.id === selectedId} disabled={busy || uploading} onClick={() => choose(item.id)}>
              <span className="small-label">{item.format.toUpperCase()}</span><strong>{item.title}</strong>
              <span>{item.author || 'Author unavailable'}</span>
              <small>{item.status === 'ready' ? `${item._count.units} text sections · ${item._count.passages} saved` : item.status === 'extracting' ? (item.total ? `Extracting ${item.progress} of ${item.total}` : 'Reading file…') : item.status === 'deleting' ? 'Finishing deletion…' : 'Import failed'}</small>
            </button>
          </li>)}</ul>
        </aside>
        <div className="book-detail">
          {!book && <div className="book-empty"><h2>Read with a question in mind.</h2><p>Choose a book, search for an idea, and keep a passage with its source.</p></div>}
          {book && <>
            <h2>{book.title}</h2><p className="muted-copy">{book.author || 'Author unavailable'} · {book.format.toUpperCase()}</p>
            {book.status === 'extracting' && <div className="book-extraction" role="status"><p>{book.total ? `Extracting ${book.progress} of ${book.total} pages or sections…` : 'Opening the book and locating its text…'}</p><progress aria-label="Text extraction" max={book.total || 1} value={book.total ? book.progress : undefined} /><p className="field-hint">You can study while this runs. Keep the local server running until it finishes.</p></div>}
            {book.status === 'failed' && <p className="storage-error" role="alert">{book.error} The original is retained locally; delete this entry to remove it or re-import.</p>}
            {['ready', 'failed'].includes(book.status) && <>
              <details className="book-settings"><summary>Book details and deletion</summary>
                <form onSubmit={editMetadata} key={`${book.id}:${book.title}:${book.author}`}>
                  <div className="book-fields"><label>Title<input name="title" defaultValue={book.title} maxLength={500} required disabled={busy} /></label><label>Author<input name="author" defaultValue={book.author} maxLength={500} disabled={busy} /></label></div>
                  <button className="btn secondary" disabled={busy}>Save book details</button>
                </form>
                {!deleting ? <button className="text-btn delete-action" onClick={() => { setDeleting(true); setKeepPassages(true); }}>Delete this book…</button> : <div className="delete-confirm">
                  <p>Delete the original file and all extracted text for <strong>{book.title}</strong>?</p>
                  <label className="checkbox-label"><input type="checkbox" checked={keepPassages} onChange={event => setKeepPassages(event.target.checked)} disabled={busy} />Keep saved passages and their attribution</label>
                  <p className="field-hint">{keepPassages ? 'Kept passages remain in the concept, without the surrounding book text.' : 'Saved passages from this book will also be deleted.'}</p>
                  <div className="actions"><button className="btn secondary" disabled={busy} onClick={() => setDeleting(false)}>Cancel</button><button className="btn" disabled={busy} onClick={deleteBook}>{busy ? 'Deleting…' : 'Delete book'}</button></div>
                </div>}
              </details>
            </>}
            {book.status === 'ready' && <>
              <form className="book-search" onSubmit={search}><label htmlFor="book-query">Search this book</label><div className="search-controls"><input id="book-query" type="search" value={query} onChange={event => setQuery(event.target.value)} minLength={2} maxLength={200} placeholder="Try indexing or query planner" required /><button className="btn" disabled={busy}>{busy ? 'Working…' : 'Search'}</button></div></form>
              {searched && <div className="search-results" aria-live="polite"><p className="field-hint">{results.length ? `${results.length} matching sections${more ? ' shown. Refine your search for more specific results.' : '.'}` : 'No matching text. Try another word or phrase.'}</p>
                {results.map(result => <button className="search-result" key={result.id} disabled={busy} onClick={() => openSource(result.id)}><strong>{result.location}</strong><span>{result.snippet}</span><span className="text-btn">Inspect context →</span></button>)}
              </div>}
              {source && <section className="source-context" aria-labelledby="source-title"><h3 id="source-title">{source.location}</h3>
                <p id="selection-help">Select the words you want to keep, then choose “Use selected passage”. With a keyboard, use Shift and the arrow keys in the text field.</p>
                <p className="field-hint">This is extracted text. PDF layout and printed page numbers may differ from the original; section numbers follow the EPUB reading order.</p>
                <label htmlFor="source-text">Source text and surrounding context</label><textarea id="source-text" ref={sourceRef} value={source.text} readOnly rows={14} aria-describedby="selection-help" />
                <button className="btn secondary" onClick={useSelection} disabled={busy}>Use selected passage</button>
              </section>}
              {source && selection && <form className="passage-compose" onSubmit={savePassage} key={`${source.id}:${selection.start}:${selection.end}`}>
                <h3>Keep this connection</h3><p className="field-hint">Saved to Understanding indexes. The quotation is preserved exactly as selected.</p>
                <label htmlFor="selected-quote">Selected passage</label><textarea id="selected-quote" value={selection.quote} readOnly rows={5} />
                <div className="book-fields"><label>Book title<input name="title" defaultValue={book.title} required maxLength={500} disabled={busy} /></label><label>Author<input name="author" defaultValue={book.author} maxLength={500} disabled={busy} /></label><label>Source location<input name="location" defaultValue={source.location} required maxLength={250} disabled={busy} /></label></div>
                <div className="actions"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save passage to concept'}</button><button className="btn secondary" type="button" disabled={busy} onClick={() => setSelection(null)}>Cancel</button></div>
              </form>}
            </>}
            {book.status === 'ready' && <BookAi key={book.id} bookId={book.id} bookTitle={book.title} onInspect={openSource} />}
          </>}
        </div>
      </div>
    </section>
  );
}
