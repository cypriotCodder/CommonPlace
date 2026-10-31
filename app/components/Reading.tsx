'use client';

import { useState } from 'react';
import { SavedPassages } from './SavedPassages';
import { FlowNavigation } from './FlowNavigation';
import { useStudy } from './StudyProvider';
import { useNotes } from './useNotes';

export function Reading() {
  const { view, navigate, act } = useStudy();
  const { notes, status, changeNotes, retrySave } = useNotes();
  const [busy, setBusy] = useState(false);
  async function finish() {
    if (busy) return;
    setBusy(true);
    if (await act({ type: 'read' })) navigate('practice');
    setBusy(false);
  }
  return <section className={`view${view === 'read' ? ' active' : ''}`} id="read">
    <FlowNavigation />
    <div className="reading-layout">
      <article className="article">
        <p className="eyebrow">Databases · Concept 01</p><h1 tabIndex={-1}>Understanding indexes</h1>
        <p className="lead">A way to find the rows you need without searching through every row you have.</p>
        <div className="meta"><span>◷  8 min read</span><span>○  Foundations</span><span>◎  Read, practice, review</span></div>
        <h2 id="idea">The idea</h2>
        <p>Imagine looking for a name in a book with no index. You might have to turn every page. A database faces a similar problem when it searches a table: without a useful index, it may need to examine many rows.</p>
        <p>An index is a separate data structure that helps the database locate rows by the values in one or more columns. It gives the query planner another route to the data, but it does not guarantee that the planner will take it.</p>
        <div className="callout"><strong>Think of it this way.</strong> An index is a shortcut to possible locations, not a copy of the whole table and not a promise that every query will be faster.</div>
        <h2 id="works">How it helps</h2>
        <p>Suppose an application often looks up orders for one customer. An index on <code>customer_id</code> can help find matching entries without scanning the entire orders table.</p>
        <div className="codeblock"><code>SELECT * FROM orders<br />WHERE customer_id = 42;</code></div>
        <p>Common B-tree indexes keep values in an ordered structure. That can help with equality and range conditions, depending on the query and the data. If a query needs most of the table anyway, a scan may be cheaper.</p>
        <h2 id="tradeoffs">The tradeoff</h2>
        <p>Indexes take space, and the database must maintain them as rows are inserted, updated, or deleted. More indexes can make reads faster while adding work to writes. Choose them for queries that matter, then measure the result with the database’s query plan.</p>
        <h2>Keep exploring</h2>
        <div className="sources">Original explanation informed by:<br />
          <a href="https://www.postgresql.org/docs/current/indexes-intro.html" target="_blank" rel="noreferrer">PostgreSQL documentation: Introduction to indexes ↗</a><br />
          <a href="https://www.postgresql.org/docs/current/using-explain.html" target="_blank" rel="noreferrer">PostgreSQL documentation: Using EXPLAIN ↗</a>
        </div>
        <SavedPassages />
        <div className="callout"><strong>Ready to put it to work?</strong><br />Try a short scenario and reason through the tradeoff.</div>
        <button className="btn" id="finish-read" disabled={busy} onClick={finish}>Mark read & try the challenge <span className="arrow">→</span></button>
      </article>
      <aside className="reading-aside">
        <div className="aside-block"><h3>On this page</h3><ul className="toc"><li><a href="#idea">The idea</a></li><li><a href="#works">How it helps</a></li><li><a href="#tradeoffs">The tradeoff</a></li></ul></div>
        <div className="aside-block">
          <h3>Your notes</h3><p className="saved">What would you explain in your own words?</p>
          <label className="hidden" htmlFor="notes">Your notes on indexing</label>
          <textarea id="notes" placeholder="Write an insight here..." value={notes} onChange={event => changeNotes(event.target.value)} />
          <div className="saved" id="save-status" role="status">{status}</div>
          <button type="button" className="text-btn" onClick={retrySave}>Retry save</button>
        </div>
      </aside>
    </div>
  </section>;
}
