'use client';

import { useState } from 'react';
import { useStudy } from './StudyProvider';

const forthcoming = [
  { title: 'Separation of concerns', description: 'Give each part a clear responsibility', category: 'Engineering', message: 'Software design' },
  { title: 'Principle of least privilege', description: 'Give access only where it is needed', category: 'Security', message: 'Security' },
  { title: 'Time complexity', description: 'Reason about work as inputs grow', category: 'Programming', message: 'Programming' },
];

export function StudyDesk() {
  const { data, view, navigate, confidentCount, completedCount, dueCards } = useStudy();
  const [conceptMessage, setConceptMessage] = useState('');
  return <section className={`view${view === 'home' ? ' active' : ''}`} id="home">
    <div className="home-head">
      <div><p className="eyebrow">Your study desk</p><h1 tabIndex={-1}>Good to see you.</h1><p className="sub">Make a little room for your next good idea.</p></div>
      <div className="date">A place to learn, at your pace</div>
    </div>
    <div className="dashboard">
      <div>
        <div className="continue">
          <span className="kicker">Pick up where you left off</span><h2>Understanding indexes</h2>
          <p>Learn how a small data structure can make a big difference to a query.</p>
          <button className="btn" onClick={() => navigate('read')}>Continue studying <span className="arrow">↗</span></button>
        </div>
        <div className="section-title"><h2>Explore concepts</h2><span>Four ideas to build on</span></div>
        <div className="concept-list">
          <button className="concept-row" onClick={() => navigate('read')}><span className="concept-num">01</span><span><strong>Database indexing</strong><small>Find data without looking everywhere</small></span><span className="tag">Databases</span></button>
          {forthcoming.map((concept, index) => <button key={concept.title} className="concept-row" onClick={() => setConceptMessage(`${concept.message} is on the reading list. Database indexing is the complete demo concept.`)}>
            <span className="concept-num">0{index + 2}</span><span><strong>{concept.title}</strong><small>{concept.description}</small></span><span className="tag">{concept.category}</span>
          </button>)}
        </div>
        <p id="concept-message" className="saved" role="status">{conceptMessage}</p>
      </div>
      <aside className="right-col">
        <div className="side-section">
          <h3>Your indexing progress</h3><p>Small steps add up.</p>
          <div className="progress-big"><span id="completed">{completedCount}</span><span> / 5 activities completed</span></div>
          <div className="progress-line" role="progressbar" aria-label="Activities completed" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completedCount}><i id="progress-bar" style={{ width: `${completedCount / 5 * 100}%` }} /></div>
          <div className="mini-row"><span>Reading</span><b id="reading-status">{data.read ? 'Complete' : 'Not yet'}</b></div>
          <div className="mini-row"><span>Practice</span><b id="practice-status">{data.practice ? 'Complete' : 'Not yet'}</b></div>
          <div className="mini-row"><span>Indexing review cards</span><b id="review-status">{confidentCount} / 3 confident</b></div>
        </div>
        <div className="side-section"><h3>Ready to revisit?</h3><p>A quick review helps ideas stay with you.</p>
          <div className="review-box"><div className="count"><span id="queue">{dueCards.length}</span> cards</div><p>ready for your review</p><button className="text-btn" onClick={() => navigate('review')}>Open review queue ↗</button></div>
        </div>
        <div className="side-section"><p className="small-label">A note for your desk</p><p>Understanding grows when you connect what you read with what you try.</p></div>
      </aside>
    </div>
  </section>;
}
