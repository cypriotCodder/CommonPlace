'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ApprovedMaterial } from '../../lib/ai/types';
import { useStudy } from './StudyProvider';
import { bookApi, errorMessage, jsonOptions } from './book-api';

export function BookPractice() {
  const { navigate } = useStudy();
  const [items, setItems] = useState<ApprovedMaterial[]>([]), [selected, setSelected] = useState('');
  const [choice, setChoice] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctChoice: string; explanation: string } | null>(null);
  const load = useCallback(async () => {
    try { setItems(await bookApi<ApprovedMaterial[]>('/api/materials')); setError(''); }
    catch (error) { setError(errorMessage(error)); }
  }, []);
  useEffect(() => { void load(); const refresh = () => { void load(); }; window.addEventListener('commonplace:materials-changed', refresh); return () => window.removeEventListener('commonplace:materials-changed', refresh); }, [load]);
  const item = items.find(item => item.id === selected) ?? items[0];
  function choose(id: string) { setSelected(id); setChoice(''); setFeedback(null); setError(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!item || !choice) return; setBusy(true); setError('');
    try { setFeedback(await bookApi(`/api/materials/${item.id}/attempts`, jsonOptions('POST', { choice }))); }
    catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="book-practice" aria-labelledby="book-practice-title">
    <h2 id="book-practice-title">Practice from your books</h2><p>Material you reviewed and accepted from the AI drafts.</p>
    {error && <p role="alert" className="storage-error">{error}</p>}
    {!item && <p className="field-hint">No accepted material yet. <button className="text-btn" onClick={() => navigate('books')}>Find useful passages in your books →</button></p>}
    {item && <>
      <label className="ai-run-picker">Practice material<select value={item.id} disabled={busy} onChange={event => choose(event.target.value)}>{items.map(value => <option key={value.id} value={value.id}>{value.title}</option>)}</select></label>
      <h3>{item.title}</h3><p>{item.prompt}</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy || !!feedback} className="book-practice-options"><legend>Choose an answer</legend>{item.choices.map(option => <label className={`option${choice === option.id ? ' selected' : ''}`} key={option.id}><input type="radio" name={`book-choice-${item.id}`} value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} /><span><strong>{option.id.toUpperCase()}</strong> {option.text}</span></label>)}</fieldset>
        {!feedback && <button className="btn" disabled={busy || !choice}>{busy ? 'Saving…' : 'Check this answer'}</button>}
      </form>
      {feedback && <div className={`feedback${feedback.correct ? '' : ' incorrect'}`} role="status"><strong>{feedback.correct ? 'That matches the reviewed explanation.' : `Consider choice ${feedback.correctChoice.toUpperCase()}.`}</strong>{feedback.explanation}<div className="actions"><button className="btn secondary" onClick={() => { setFeedback(null); setChoice(''); }}>Retry this question</button><button className="btn secondary" onClick={() => navigate('review')}>Review these ideas →</button></div></div>}
      <details className="book-practice-source"><summary>Source passage and freshness check</summary><blockquote>{item.passage.quote}</blockquote><p className="field-hint">{item.passage.title} · {item.passage.author || 'Author unavailable'} · {item.passage.location}</p><p className="field-hint">{item.freshnessNote}</p>{item.verifiedSource && <p className="field-hint">User checked on {item.checkedAt ? new Date(item.checkedAt).toLocaleDateString() : 'an unspecified date'}: <a href={item.verifiedSource} target="_blank" rel="noreferrer">Current reference ↗</a></p>}</details>
    </>}
  </section>;
}
