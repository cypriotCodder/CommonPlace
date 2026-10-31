'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useStudy, viewLabels, type StudyView } from './StudyProvider';

const destinations: { view: StudyView; icon: string }[] = [
  { view: 'home', icon: '⌂' }, { view: 'read', icon: '▤' },
  { view: 'practice', icon: '⌘' }, { view: 'review', icon: '▧' }, { view: 'books', icon: '▥' },
];

export function Shell({ children }: { children: ReactNode }) {
  const { view, navigation, navigate, dueCards } = useStudy();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.title = `Commonplace | ${viewLabels[view]}`;
    if (navigation > 0) {
      content.current?.querySelector<HTMLElement>(`#${view} h1`)?.focus();
      window.scrollTo(0, 0);
    }
  }, [view, navigation]);

  return <>
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brandmark">c</span> commonplace</div>
        <p className="side-label">Your workspace</p>
        <nav className="nav" aria-label="Main navigation">
          {destinations.map(destination => <button key={destination.view}
            className={view === destination.view ? 'active' : undefined}
            aria-current={view === destination.view ? 'page' : undefined}
            onClick={() => navigate(destination.view)}>
            <span className="nav-icon" aria-hidden="true">{destination.icon}</span> {viewLabels[destination.view]}
            {destination.view === 'review' && <span id="nav-count">({dueCards.length})</span>}
          </button>)}
        </nav>
        <div className="sidebar-bottom"><strong>A little, often.</strong>Make space for ideas to stick.</div>
      </aside>
      <main className="main" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb">Your workspace <span aria-hidden="true"> / </span> <strong id="crumb">{viewLabels[view]}</strong></div>
          <div className="top-right"><span>Personal study space</span><div className="avatar" aria-label="Learner">S</div></div>
        </header>
        <div className="content" ref={content}>{children}</div>
      </main>
    </div>
  </>;
}
