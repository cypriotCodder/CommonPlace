'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { PracticeChoice } from '../../lib/study-types';
import { BookPractice } from './BookPractice';
import { FlowNavigation } from './FlowNavigation';
import { useStudy } from './StudyProvider';

const choices: { id: PracticeChoice; query: string }[] = [
  { id: 'a', query: 'SELECT * FROM orders;' },
  { id: 'b', query: 'SELECT * FROM orders WHERE customer_id = 42;' },
  { id: 'c', query: 'SELECT * FROM orders WHERE total > 0;' },
];

export function Practice() {
  const { view, navigate, act } = useStudy();
  const [choice, setChoice] = useState<PracticeChoice | null>(null);
  const [submitted, setSubmitted] = useState<PracticeChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const retryRef = useRef<HTMLButtonElement>(null);
  const focus = useRef<'retry' | 'first' | null>(null);
  useLayoutEffect(() => {
    if (view === 'practice') {
      if (focus.current === 'retry') retryRef.current?.focus();
      if (focus.current === 'first') optionRefs.current[0]?.focus();
    }
    focus.current = null;
  });

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (submitted || busy || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const next = (index + direction + choices.length) % choices.length;
    setChoice(choices[next].id); optionRefs.current[next]?.focus();
  }
  async function submit() {
    if (!choice || busy || submitted) return;
    setBusy(true);
    if (await act({ type: 'practice', choice })) { setSubmitted(choice); focus.current = 'retry'; }
    setBusy(false);
  }
  function retry() { setChoice(null); setSubmitted(null); focus.current = 'first'; }

  return <section className={`view${view === 'practice' ? ' active' : ''}`} id="practice"><div className="focus-wrap">
    <FlowNavigation /><p className="eyebrow">Practice · Your learning</p><h1 tabIndex={-1}>Think it through.</h1>
    <p className="intro">Put the idea to work before checking the explanation. There’s room to change your mind.</p>
    <div className="challenge">
      <p className="small-label">Database indexing · A practical scenario</p><h2>Which query is the strongest candidate?</h2>
      <div className="scenario">An orders table has millions of rows. The app frequently retrieves a small number of orders for one customer. You are considering an index on <code>customer_id</code>.</div>
      <p>Which query is most likely to benefit from that index?</p>
      <div className="options" role="radiogroup" aria-label="Choose a query">
        {choices.map((option, index) => <button key={option.id} className={`option${choice === option.id ? ' selected' : ''}`}
          ref={element => { optionRefs.current[index] = element; }} role="radio" aria-checked={choice === option.id}
          tabIndex={choice === option.id || (!choice && index === 0) ? 0 : -1} disabled={busy || !!submitted}
          onClick={() => setChoice(option.id)} onKeyDown={event => move(event, index)}>
          <span className="letter">{option.id.toUpperCase()}</span><code>{option.query}</code>
        </button>)}
      </div>
      <div id="feedback" aria-live="polite">{submitted && <div className={`feedback${submitted === 'b' ? '' : ' incorrect'}`}>
        <strong>{submitted === 'b' ? 'That’s a strong candidate.' : 'Good thought. Consider which column the query filters.'}</strong>
        Query B filters by customer_id and returns a small subset, so the index can help locate those rows. Query A requests the whole table, while C filters on a different column. The planner still weighs the data and costs. Remember: maintaining this index adds storage and write work.
      </div>}</div>
      <div className="actions">
        {!submitted ? <button className="btn" id="check" disabled={!choice || busy} onClick={submit}>Check my thinking</button> : <>
          <button className="btn secondary" id="retry" ref={retryRef} onClick={retry}>Try again</button>
          <button className="btn" id="to-review" onClick={() => navigate('review')}>Continue to review →</button>
        </>}
      </div>
    </div>
    <BookPractice />
  </div></section>;
}
