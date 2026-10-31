'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { AiConfig, AiDraft, AiPage, AiPreview, AiRunInfo } from '../../lib/ai/types';
import { bookApi, errorMessage, jsonOptions } from './book-api';

function DraftEditor({ draft, bookTitle, onDone, onInspect }: { draft: AiDraft; bookTitle: string; onDone: () => Promise<void>; onInspect: (id: string) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget); setBusy(true); setError('');
    const text = (name: string) => String(fields.get(name) ?? '');
    try {
      await bookApi(`/api/ai/suggestions/${draft.id}`, jsonOptions('POST', { reviewed: fields.get('reviewed') === 'on',
        ...(text('verifiedSource') ? { verifiedSource: text('verifiedSource') } : {}),
        material: { title: text('title'), question: text('question'), answer: text('answer'), prompt: text('prompt'),
          choices: draft.choices.map(choice => ({ id: choice.id, text: text(`choice-${choice.id}`) })), correctChoice: text('correctChoice'), explanation: text('explanation') } }));
      window.dispatchEvent(new Event('commonplace:materials-changed')); await onDone();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function reject() {
    setBusy(true); setError('');
    try { await bookApi(`/api/ai/suggestions/${draft.id}`, jsonOptions('POST', { action: 'reject' })); await onDone(); }
    catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <article className="ai-draft">
    <div className="ai-draft-heading"><h4>{draft.title}</h4><span className="tag">{draft.status === 'accepted' ? 'Accepted' : draft.status === 'rejected' ? 'Discarded' : 'AI draft'}</span></div>
    <p>{draft.reason}</p><blockquote>{draft.quote}</blockquote><p className="field-hint">{bookTitle} · {draft.unit.location}</p>
    <button type="button" className="text-btn" onClick={() => onInspect(draft.unitId)}>Inspect the original context →</button>
    {draft.status === 'draft' && <details><summary>Review and edit learning material</summary>
      <form onSubmit={accept}>
        {error && <p role="alert" className="storage-error">{error}</p>}
        <fieldset disabled={busy} className="ai-editor-fields"><legend>Learning material</legend>
          <label>Lesson title<input name="title" defaultValue={draft.title} maxLength={180} required /></label>
          <label>Review question<textarea name="question" defaultValue={draft.question} maxLength={1000} required rows={2} /></label>
          <label>Review answer<textarea name="answer" defaultValue={draft.answer} maxLength={3000} required rows={4} /></label>
          <label>Practice scenario and question<textarea name="prompt" defaultValue={draft.prompt} maxLength={2000} required rows={4} /></label>
          {draft.choices.map(choice => <label key={choice.id}>Choice {choice.id.toUpperCase()}<textarea name={`choice-${choice.id}`} defaultValue={choice.text} maxLength={1000} required rows={2} /></label>)}
          <label>Correct choice<select name="correctChoice" defaultValue={draft.correctChoice}>{draft.choices.map(choice => <option key={choice.id} value={choice.id}>{choice.id.toUpperCase()}</option>)}</select></label>
          <label>Practice explanation<textarea name="explanation" defaultValue={draft.explanation} maxLength={3000} required rows={4} /></label>
          <label className="checkbox-label"><input type="checkbox" name="reviewed" required />I reviewed this material against the source passage.</label>
        </fieldset>
        <div className="actions"><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Accept practice and review material'}</button><button type="button" className="btn secondary" disabled={busy} onClick={reject}>Discard draft</button></div>
      </form>
    </details>}
    {draft.status === 'accepted' && <p className="field-hint">Available in Practice and the Review queue.</p>}
  </article>;
}

export function BookAi({ bookId, bookTitle, onInspect }: { bookId: string; bookTitle: string; onInspect: (id: string) => void }) {
  const [config, setConfig] = useState<AiConfig | null>(null), [preview, setPreview] = useState<AiPreview | null>(null);
  const [runs, setRuns] = useState<AiRunInfo[]>([]), [page, setPage] = useState<AiPage | null>(null);
  const [selected, setSelected] = useState(''), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const selectedRef = useRef('');
  const loadPage = useCallback(async (id: string, more?: string) => {
    const response = await bookApi<AiPage>(`/api/ai/runs/${id}${more ? `?before=${encodeURIComponent(more)}` : ''}`);
    if (selectedRef.current !== id) return;
    setRuns(old => old.map(item => item.id === id ? { ...item, ...response.run } : item));
    setPage(old => more && old ? { ...response, items: [...old.items, ...response.items] } : response);
  }, []);
  const refresh = useCallback(async () => {
    const list = await bookApi<AiRunInfo[]>(`/api/ai/runs?bookId=${bookId}`); setRuns(list);
    const id = selectedRef.current || list[0]?.id;
    if (id) { selectedRef.current = id; setSelected(id); await loadPage(id); }
  }, [bookId, loadPage]);
  useEffect(() => {
    let mounted = true;
    Promise.all([bookApi<AiConfig>('/api/ai/config'), bookApi<AiPreview>(`/api/ai/preview?bookId=${bookId}`)]).then(([settings, plan]) => { if (mounted) { setConfig(settings); setPreview(plan); } }).catch(error => { if (mounted) setError(errorMessage(error)); });
    refresh().catch(error => { if (mounted) setError(errorMessage(error)); });
    return () => { mounted = false; };
  }, [bookId, refresh]);
  const running = page?.run.status === 'running';
  useEffect(() => {
    if (!running || !selected) return;
    let cancelled = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { await loadPage(selected); } catch (error) { if (!cancelled) setError(errorMessage(error)); }
      if (!cancelled) timer = setTimeout(poll, 1500);
    }
    timer = setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [running, selected, loadPage]);
  async function action(kind: 'start' | 'continue' | 'pause') {
    setBusy(true); setError('');
    try {
      if (kind === 'start') {
        const run = await bookApi<{ id: string }>('/api/ai/runs', jsonOptions('POST', { bookId, consent }));
        selectedRef.current = run.id; setSelected(run.id);
      } else await bookApi(`/api/ai/runs/${selected}`, jsonOptions('POST', { action: kind, ...(kind === 'continue' ? { consent } : {}) }));
      setConsent(false); await refresh();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="book-ai" aria-labelledby={`ai-title-${bookId}`}>
    <p className="eyebrow">Learn from this book</p><h3 id={`ai-title-${bookId}`}>Find the ideas worth keeping.</h3>
    <p>Analyse the book in reading order, find useful passages, and prepare practice questions and review cards. You decide which drafts become study material.</p>
    {error && <p className="storage-error" role="alert">{error}</p>}
    {!config && !error && <p role="status">Loading AI workflow settings…</p>}
    {config && !config.configured && <p className="freshness-note"><strong>AI provider not connected yet.</strong> {config.message}</p>}
    {preview && <p className="field-hint">{preview.totalChunks} text chunks · approximately {preview.totalCalls} model calls for the complete book. Each step sends up to 12 chunks (60,000 characters) in at most 6 calls, then pauses for your decision. The first step is estimated at {preview.charactersPerStep.toLocaleString()} characters.</p>}
    {config?.configured && <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy || running} />Send this step’s book text and attribution to {config.destination} and its configured provider, {config.provider}. Provider charges may apply.</label>}
    <div className="actions"><button className="btn" disabled={!config?.configured || !consent || busy || running} onClick={() => action('start')}>{busy ? 'Working…' : 'Start new book analysis'}</button>
      {page && ['paused', 'failed'].includes(page.run.status) && <button className="btn secondary" disabled={!config?.configured || !consent || busy} onClick={() => action('continue')}>Continue analysis</button>}
      {running && <button className="btn secondary" disabled={busy} onClick={() => action('pause')}>Pause analysis</button>}
    </div>
    {runs.length > 0 && <label className="ai-run-picker">Analysis history<select value={selected} onChange={event => { selectedRef.current = event.target.value; setSelected(event.target.value); setPage(null); loadPage(event.target.value).catch(error => setError(errorMessage(error))); }} disabled={busy || running}>{runs.map(run => <option key={run.id} value={run.id}>{new Date(run.createdAt).toLocaleString()} · {run.status}</option>)}</select></label>}
    {page && <>
      <div className="ai-progress" role="status"><p><strong>{page.run.status === 'running' ? 'Analysing' : page.run.status === 'completed' ? 'Analysis complete' : page.run.status === 'failed' ? 'Analysis needs attention' : 'Analysis paused'}</strong> · {page.run.nextChunk} / {page.run.totalChunks} chunks checked</p>
        <progress max={page.run.totalChunks || 1} value={page.run.nextChunk} aria-label="Book analysis progress" />
        {page.run.error && <p>{page.run.error}</p>}{page.run.skipped > 0 && <p className="field-hint">{page.run.skipped} suggestions were not retained because the quote/format was invalid or the draft limit was reached.</p>}
      </div>
      <p className="field-hint">Freshness checks are off. These drafts are based on the book’s content.</p>
      {page.items.length === 0 && !running && <p>No usable drafts in the completed portion yet. Continue the analysis if text remains.</p>}
      {page.items.map(draft => <DraftEditor key={`${draft.id}:${draft.status}`} draft={draft} bookTitle={bookTitle} onDone={refresh} onInspect={onInspect} />)}
      {page.nextCursor && <button className="btn secondary" disabled={busy || running} onClick={() => loadPage(selected, page.nextCursor!).catch(error => setError(errorMessage(error)))}>Load more drafts</button>}
    </>}
  </section>;
}
