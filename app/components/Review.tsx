'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReviewOutcome } from '../../lib/study-types';
import { FlowNavigation } from './FlowNavigation';
import { useStudy } from './StudyProvider';

export function Review() {
  const { data, view, navigate, dueCards, act } = useStudy();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const card = dueCards.find(item => item.id === currentId) ?? dueCards[0];
  const revealed = !!card && revealedId === card.id;
  const revealRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLButtonElement>(null);
  const focus = useRef<'again' | 'next' | null>(null);
  useLayoutEffect(() => {
    if (view === 'review') {
      if (focus.current === 'again') againRef.current?.focus();
      if (focus.current === 'next') (revealRef.current ?? returnRef.current)?.focus();
    }
    focus.current = null;
  });

  async function review(outcome: ReviewOutcome) {
    if (!card || busy) return;
    setBusy(true);
    if (await act({ type: 'review', cardId: card.id, outcome })) {
      if (outcome === 'again') setCurrentId(dueCards[(dueCards.findIndex(item => item.id === card.id) + 1) % dueCards.length].id);
      setRevealedId(null); focus.current = 'next';
    }
    setBusy(false);
  }

  return <section className={`view${view === 'review' ? ' active' : ''}`} id="review"><div className="focus-wrap">
    <FlowNavigation /><p className="eyebrow">Review · Your study queue</p><h1 tabIndex={-1}>Make it stick.</h1>
    <p className="intro">Take a moment to recall the idea before revealing the answer.</p>
    <div id="review-content">{!card ? <div className="flash empty"><div>
      <p className="small-label">All caught up</p><h2>Your review queue is clear.</h2><p>Cards marked confident return after one day.</p>
      <button className="btn secondary" ref={returnRef} onClick={() => navigate('read')}>Back to concept</button>
    </div></div> : <div className="flash">
      <div>
        <div className="flash-top"><span>QUESTION {data.cards.findIndex(item => item.id === card.id) + 1} OF {data.cards.length}</span>
          <button className="text-btn" onClick={() => navigate(card.source ? 'books' : 'read')}>{card.source ? 'Back to books' : '↗ Back to concept'}</button>
        </div>
        {card.source && <p className="small-label">From your books · {card.source.topic}</p>}
        <h2>{card.q}</h2>
        {revealed && <div className="answer"><span className="small-label">Answer</span><p>{card.a}</p>
          {card.source && <div className="review-source">
            <blockquote>{card.source.quote}</blockquote>
            <p className="field-hint">{card.source.title} · {card.source.author || 'Author unavailable'} · {card.source.location}</p>
            <p className="field-hint">{card.source.freshnessNote}</p>
          </div>}
        </div>}
      </div>
      <div className="flash-footer"><span className="saved">{dueCards.length} {dueCards.length === 1 ? 'card' : 'cards'} ready</span>
        {revealed ? <div className="actions">
          <button className="btn secondary" id="again" ref={againRef} disabled={busy} onClick={() => review('again')}>Review again</button>
          <button className="btn" id="confident" disabled={busy} onClick={() => review('confident')}>I feel confident</button>
        </div> : <button className="btn" id="reveal" ref={revealRef} onClick={() => { setCurrentId(card.id); setRevealedId(card.id); focus.current = 'again'; }}>Reveal answer →</button>}
      </div>
    </div>}</div>
  </div></section>;
}
