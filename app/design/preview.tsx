'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { books, discoveries as initialDiscoveries, downloadText, previewImportSchema, sourceText, type Discovery } from './sample';
import s from './preview.module.css';

type Screen = 'library' | 'workspace' | 'study';
type Step = 'passage' | 'challenge' | 'practice';
type IconName = 'library' | 'workspace' | 'study' | 'arrow' | 'upload' | 'search' | 'check' | 'download' | 'close' | 'back';
const screenLabels = { library: 'Library', workspace: 'AI Workspace', study: 'Study' };
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    library: <><path d="M4 4v16h4V4H4Zm7 0v16h4V4h-4Zm6 1 3-1 4 15-3 1-4-15Z" /></>,
    workspace: <><path d="M4 4h16v16H4zM4 10h16M10 10v10" /><path d="M7 7h1m3 0h1" /></>,
    study: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14" /></>,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />,
    download: <path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />, close: <path d="m6 6 12 12M6 18 18 6" />,
    back: <path d="M20 12H5m6-6-6 6 6 6" />,
  };
  return <svg viewBox="0 0 26 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Button({ children, onClick, secondary = false, disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return <button type="button" className={`${s.button} ${secondary ? s.secondary : ''}`} disabled={disabled} onClick={onClick}>{children}</button>;
}
function BookMark({ book, small = false }: { book: typeof books[number]; small?: boolean }) {
  return <span aria-hidden="true" className={`${s.bookMark} ${s[book.color]} ${small ? s.bookSmall : ''}`}><span>{book.initials}</span><span className={s.bookRule} /></span>;
}

export function LayoutPreview({ variant = 'desk' }: { variant?: 'desk' | 'folio' }) {
  const isFolio = variant === 'folio';
  const [screen, setScreen] = useState<Screen>('library');
  const [activeBook, setActiveBook] = useState<string>(books[0].id);
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('All books');
  const [showUpload, setShowUpload] = useState(false); const [uploadName, setUploadName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [ideas, setIdeas] = useState<Discovery[]>(initialDiscoveries);
  const [selectedId, setSelectedId] = useState(initialDiscoveries[0].id);
  const [accepted, setAccepted] = useState<string[]>([initialDiscoveries[0].id]);
  const [detailTab, setDetailTab] = useState<'source' | 'material'>('source');
  const [reviewed, setReviewed] = useState(false);
  const [importOpen, setImportOpen] = useState(false); const [json, setJson] = useState('');
  const [importError, setImportError] = useState(''); const [pending, setPending] = useState<Discovery[] | null>(null);
  const [step, setStep] = useState<Step>('passage'); const [choice, setChoice] = useState('');
  const [submitted, setSubmitted] = useState(false); const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false); const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState(''); const heading = useRef<HTMLHeadingElement>(null);
  const answerHeading = useRef<HTMLHeadingElement>(null);
  const completionHeading = useRef<HTMLHeadingElement>(null);
  const revealButton = useRef<HTMLButtonElement>(null);
  const book = books.find(item => item.id === activeBook) ?? books[0];
  const selected = ideas.find(item => item.id === selectedId) ?? ideas[0];
  const [studyId, setStudyId] = useState(initialDiscoveries[0].id);
  const study = ideas.find(item => item.id === studyId) ?? initialDiscoveries[0];
  const filteredBooks = books.filter(item => `${item.title} ${item.author} ${item.subject}`.toLowerCase().includes(query.toLowerCase()) &&
    (filter === 'All books' || (filter === 'Ready to study' ? item.status === filter : ['Needs attention', 'Discovery incomplete'].includes(item.status))));
  const materialCount = accepted.length;

  useEffect(() => { document.title = `Commonplace | ${screenLabels[screen]} · ${isFolio ? 'Folio' : 'Desk'} preview`; }, [screen, isFolio]);
  function navigate(next: Screen) {
    setScreen(next); setNotice('');
    window.setTimeout(() => { heading.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }, 0);
  }
  function viewSourceBook() { setActiveBook('database-notes'); navigate('library'); }
  function revealAnswer() {
    setRevealed(true); window.setTimeout(() => answerHeading.current?.focus(), 0);
  }
  function practiceAgain() {
    setRevealed(false); setNotice('The sample card is ready to try again.');
    window.setTimeout(() => revealButton.current?.focus(), 0);
  }
  function completeSession() {
    setCompleted(true); window.setTimeout(() => completionHeading.current?.focus(), 0);
  }
  function startStudy(id = initialDiscoveries[0].id) {
    setStudyId(id); setStep('passage'); setChoice(''); setSubmitted(false); setRevealed(false); setCompleted(false); navigate('study');
  }
  function changeStep(next: Step) { setStep(next); setCompleted(false); heading.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function showMobileDetail(id: string) {
    if (window.matchMedia('(max-width: 650px)').matches) window.setTimeout(() => document.getElementById(id)?.focus(), 0);
  }
  function sampleExport() {
    downloadText('commonplace-sample-study-pack.txt', `COMMONPLACE — DESIGN PREVIEW SAMPLE\nThis is authored demonstration text, not an export of your library.\n\nDiscover useful ideas across all the text below. Preserve exact quotations and distinguish source text from your explanations.\n\nDatabase field notes\nAuthor: Commonplace\nSource: sample-section-1\n\n${sourceText}`);
    setNotice('Sample study pack downloaded. Real whole-book export is part of the implementation plan.');
  }
  function downloadExample() { downloadText('commonplace-sample-response.json', JSON.stringify({ version: 1, bookId: 'database-notes', discoveries: initialDiscoveries }, null, 2), 'application/json'); }
  async function readResponse(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setPending(null); setImportError('');
    if (file.size > 100_000) { setImportError('This preview supports JSON files up to 100 KB. Try the sample response.'); return; }
    try { setJson(await file.text()); } catch { setImportError('Could not read this file. Paste the response below or choose it again.'); }
  }
  function inspectResponse() {
    setPending(null); setImportError('');
    if (new TextEncoder().encode(json).length > 100_000) { setImportError('This response exceeds the preview’s 100 KB limit. Try the sample response.'); return; }
    try {
      const parsed = previewImportSchema.safeParse(JSON.parse(json.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1')));
      if (!parsed.success) { setImportError('The response does not match the preview format. Download the sample JSON to try this layout.'); return; }
      const ids = new Set<string>();
      for (const idea of parsed.data.discoveries) {
        if (ids.has(idea.id)) throw new Error('Duplicate idea IDs found. Give each idea a unique ID.'); ids.add(idea.id);
        const position = sourceText.indexOf(idea.quote);
        if (position < 0 || sourceText.indexOf(idea.quote, position + 1) >= 0) throw new Error(`The quotation for “${idea.title}” must match one exact passage in the sample source.`);
      }
      setPending(parsed.data.discoveries);
    } catch (error) { setImportError(error instanceof SyntaxError ? 'This is not complete JSON. Check that the entire response was copied, including the closing braces.' : error instanceof Error ? error.message : 'Could not read this response.'); }
  }
  function confirmImport() {
    if (!pending) return;
    const fresh = pending.filter(item => !ideas.some(existing => existing.id === item.id || existing.quote === item.quote));
    setIdeas(old => [...old, ...fresh]); if (fresh[0]) setSelectedId(fresh[0].id);
    setNotice(`${fresh.length} sample discoveries added; ${pending.length - fresh.length} existing items kept unchanged. Changes last until reload.`);
    setPending(null); setImportOpen(false); setJson('');
  }
  function acceptIdea() {
    if (!accepted.includes(selected.id)) setAccepted(old => [...old, selected.id]);
    setNotice('Added to your preview study queue. Nothing has been saved to your real library.');
  }
  function selectUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; setUploadName(''); setUploadError(''); if (!file) return;
    if (!/\.(pdf|epub)$/i.test(file.name)) { setUploadError('Choose a PDF or EPUB file.'); return; }
    if (file.size > 25 * 1024 * 1024) { setUploadError('Choose a file smaller than 25 MB.'); return; }
    setUploadName(file.name);
  }

  return <div className={`${s.preview} ${isFolio ? s.folio : ''}`}>
    <a className={s.skip} href="#preview-main">Skip to content</a>
    <aside className={s.sidebar} aria-label="Workspace navigation">
      <Link className={s.brand} href={isFolio ? '/design/folio' : '/design'}><span className={s.brandmark} aria-hidden="true">c</span>commonplace</Link>
      <nav className={s.navigation} aria-label="Main navigation">
        {(Object.keys(screenLabels) as Screen[]).map(name => <button key={name} type="button" aria-current={screen === name ? 'page' : undefined} onClick={() => navigate(name)}><Icon name={name} /><span>{screenLabels[name]}</span>{name === 'study' && <span className={s.navCount}>{materialCount}</span>}</button>)}
      </nav>
      <div className={s.sidebarNote}><Icon name="study" /><p>A place for ideas<br />to become understanding.</p><Link href="/">Back to the current app <Icon name="arrow" /></Link></div>
    </aside>
    <main className={s.main} id="preview-main" tabIndex={-1}>
      <header className={s.topbar}><span>Your workspace <span className={s.slash}>/</span> <strong>{screenLabels[screen]}</strong></span><div className={s.previewSwitcher}><span className={s.previewLabel}>Sample data · {isFolio ? 'B / Folio' : 'A / Desk'}</span><Link href={isFolio ? '/design' : '/design/folio'}>{isFolio ? 'Compare with layout A' : 'Explore layout B'}<Icon name="arrow" /></Link></div></header>
      <div className={s.content}>
        {notice && <div className={s.notice} role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><Icon name="close" /></button></div>}
        {screen === 'library' && <>
          <div className={s.pageHead}><div><h1 ref={heading} tabIndex={-1}>Your library.</h1><p>The books you read. The ideas you keep.</p></div><Button onClick={() => setShowUpload(!showUpload)}><Icon name="upload" /> Add a book</Button></div>
          {showUpload && <section className={s.importPanel} aria-label="Add a book"><div className={s.sectionHeading}><h2>A new place to start.</h2><button className={s.iconButton} aria-label="Close upload" onClick={() => setShowUpload(false)}><Icon name="close" /></button></div><p>Choose a text-based PDF or EPUB, up to 25 MB.</p><label className={s.fileLabel}>Book file<input type="file" accept=".pdf,.epub" onChange={selectUpload} /></label>{uploadError && <p role="alert" className={s.error}>{uploadError}</p>}{uploadName && <p role="status"><strong>{uploadName}</strong> selected. This preview does not upload or extract your file.</p>}<Link className={s.textLink} href="/">Use the current app to import a real book <Icon name="arrow" /></Link></section>}
          <div className={s.libraryTools}><label className={s.search}><Icon name="search" /><input aria-label="Search library" placeholder="Find a book, author, or subject…" value={query} onChange={event => setQuery(event.target.value)} /></label><span className={s.count}>{books.length} sample books</span></div>
          <div className={s.filters} aria-label="Filter library">{['All books', 'Ready to study', 'Needs attention'].map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
          <div className={s.libraryLayout}><section aria-label="Book library"><div className={s.listHeader}><span>Book</span><span>Next step</span></div><div className={s.bookList}>
            {filteredBooks.map(item => <button key={item.id} className={`${s.bookRow} ${activeBook === item.id ? s.selectedBook : ''}`} aria-pressed={activeBook === item.id} onClick={() => { setActiveBook(item.id); showMobileDetail("selected-book"); }}>{isFolio ? <span className={`${s.folioCover} ${s[item.color]}`} aria-hidden="true"><span className={s.coverSubject}>{item.subject}</span><span className={s.coverTitle}>{item.title}</span><span className={s.coverFooter}>Commonplace<span>{item.format}</span></span></span> : <BookMark book={item} />}<span className={s.bookInfo}><strong>{item.title}</strong><span>{item.author}</span><small>{item.format} <span aria-hidden="true">·</span> {item.subject}</small></span><span className={s.bookStatus}><span className={`${s.status} ${item.status === 'Needs attention' || item.status === 'Discovery incomplete' ? s.warmStatus : ''}`}>{item.status}</span><span className={s.rowArrow}><Icon name="arrow" /></span></span></button>)}
            {filteredBooks.length === 0 && <div className={s.empty}><h2>No books match.</h2><p>Try another title or clear your filters.</p><Button secondary onClick={() => { setQuery(''); setFilter('All books'); }}>Clear search and filters</Button></div>}
          </div><p className={s.libraryFoot}>Your originals, passages, and progress stay together.</p></section>
          <aside className={s.bookDetail} id="selected-book" tabIndex={-1} aria-label="Selected book details"><div className={s.detailBookHeader}><BookMark book={book} small /><span>{book.format}<br />{book.subject}</span></div><h2>{book.title}</h2><p>{book.description}</p><dl className={s.facts}><div><dt>Source</dt><dd>Authored sample</dd></div><div><dt>Learning stage</dt><dd>{book.stage}</dd></div></dl><div className={s.nextAction}><strong>{book.detail}</strong><p>{book.id === 'database-notes' ? 'Start with an idea, follow its source, then put it to work.' : book.id === 'scanned-notes' ? 'Use a text-based copy to prepare this book for discovery.' : 'The whole book stays in scope. The app prepares the text for you.'}</p>
            {book.id === 'database-notes' ? <><Button onClick={() => startStudy()}>Continue studying <Icon name="arrow" /></Button><button className={s.textLink} onClick={() => navigate('workspace')}>View AI discoveries</button></> : <Button secondary onClick={() => setNotice(book.id === 'scanned-notes' ? 'In the full app, this action will let you replace an unreadable source. This is a sample error state.' : 'This book illustrates a workflow state. Use Database field notes to explore the working sample export and import.')}>{book.id === 'scanned-notes' ? 'Choose another file' : book.id === 'systems-notes' ? 'Prepare remaining text' : 'Prepare AI export'}<Icon name="arrow" /></Button>}
          </div><details className={s.details}><summary>Book details</summary><p>{book.author}. These records illustrate library states and are not your saved books.</p>{book.id === 'database-notes' && <button className={s.textLink} onClick={sampleExport}><Icon name="download" /> Download sample text</button>}</details></aside></div>
        </>}

        {screen === 'workspace' && <>
          <div className={s.pageHead}><div><h1 ref={heading} tabIndex={-1}>From text to understanding.</h1><p>Bring back the discoveries. Keep what is worth learning.</p></div><Button onClick={() => setImportOpen(!importOpen)}><Icon name="upload" /> Import AI response</Button></div>
          <div className={s.workspaceBook}><BookMark book={books[0]} small /><div><strong>Database field notes</strong><span>Commonplace · Authored sample</span></div><button className={s.textLink} onClick={viewSourceBook}>View in library <Icon name="arrow" /></button></div>
          <ol className={s.pipeline}><li><span><Icon name="check" /></span>Export book</li><li className={s.pipelineActive}><span>2</span>Review discoveries</li><li><span>3</span>Prepare material</li><li><span>4</span>Study</li></ol>
          {importOpen && <section className={s.importPanel} aria-label="Import AI response"><div className={s.sectionHeading}><h2>Bring your response here.</h2><button className={s.iconButton} aria-label="Close import" onClick={() => setImportOpen(false)}><Icon name="close" /></button></div><p>Try the sample file or paste its JSON. This preview checks quotations against the authored sample.</p><div className={s.importControls}><label className={s.fileLabel}>JSON response<input type="file" accept=".json,application/json" onChange={readResponse} /></label><button className={s.textLink} onClick={downloadExample}><Icon name="download" /> Download sample JSON</button></div><label className={s.inputLabel}>Or paste a response<textarea rows={5} value={json} onChange={event => { setJson(event.target.value); setPending(null); setImportError(''); }} placeholder={'{ "version": 1, "bookId": "database-notes", … }'} /></label>{importError && <p role="alert" className={s.error}>{importError}</p>}{pending ? <div className={s.importSummary}><p><strong>{pending.length} valid sample discoveries.</strong> Existing IDs and passages will be kept unchanged.</p><Button onClick={confirmImport}>Confirm preview import <Icon name="check" /></Button></div> : <Button disabled={!json.trim()} onClick={inspectResponse}>Check response <Icon name="arrow" /></Button>}</section>}
          <div className={s.workspaceSummary}><p><Icon name="check" /><strong>{ideas.length} source-verified sample ideas</strong><span>AI reported on 1 of 1 sample sections</span></p><button className={s.textLink} onClick={sampleExport}><Icon name="download" /> Export sample pack</button></div>
          <div className={s.workspaceLayout}><section className={s.ideaList} aria-label="Discoveries"><div className={s.sectionHeading}><h2>Discoveries</h2><span className={s.count}>{ideas.length}</span></div>{ideas.map((idea, index) => <button key={idea.id} className={`${s.ideaRow} ${selected.id === idea.id ? s.selectedIdea : ''}`} aria-pressed={selected.id === idea.id} onClick={() => { setSelectedId(idea.id); setDetailTab('source'); setReviewed(false); showMobileDetail('selected-discovery'); }}><span className={s.ideaNumber}>{String(index + 1).padStart(2, '0')}</span><span><span className={s.priority}>{idea.priority}</span><strong>{idea.title}</strong><small>{accepted.includes(idea.id) ? 'In your study queue' : 'Ready to review'}</small></span><Icon name={accepted.includes(idea.id) ? 'check' : 'arrow'} /></button>)}<p className={s.listHint}>A verified quotation confirms the source. Review the explanation before keeping it.</p></section>
          <section className={s.ideaDetail} id="selected-discovery" tabIndex={-1} aria-label="Selected discovery"><div className={s.sectionHeading}><span className={s.status}>{selected.priority}</span><span className={s.count}>Source matched</span></div><h2>{selected.title}</h2><p className={s.rationale}>{selected.reason}</p><div className={s.detailTabs} aria-label="Discovery details"><button aria-pressed={detailTab === 'source'} onClick={() => setDetailTab('source')}>Source passage</button><button aria-pressed={detailTab === 'material'} onClick={() => setDetailTab('material')}>Study material</button></div>
            {detailTab === 'source' ? <><blockquote className={s.quote}>{selected.quote}</blockquote><p className={s.sourceCredit}>Database field notes · Section 1<br />Authored by Commonplace for this preview</p><details className={s.context}><summary>Read the surrounding context</summary><p>{sourceText}</p></details></> : <div className={s.materialPreview}><h3>Recall question</h3><p>{selected.material.question}</p><h3>Applied challenge</h3><p>{selected.material.prompt}</p><details className={s.context}><summary>Inspect the proposed answers</summary><p>{selected.material.answer}</p><p>{selected.material.explanation}</p></details></div>}
            <div className={s.detailFooter}><p>{accepted.includes(selected.id) ? 'This sample is available in Study.' : 'Read the source and inspect both proposed answers before accepting.'}</p>{accepted.includes(selected.id) ? <Button onClick={() => startStudy(selected.id)}>Study this idea <Icon name="arrow" /></Button> : <><label className={s.reviewConfirmation}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I reviewed this material against the source.</label><Button disabled={!reviewed} onClick={acceptIdea}>Accept sample material <Icon name="check" /></Button></>}</div>
          </section></div>
        </>}

        {screen === 'study' && <>
          <div className={s.studyTop}><button className={s.textLink} onClick={() => navigate('workspace')}><Icon name="back" /> All discoveries</button><span className={s.count}>{materialCount} {materialCount === 1 ? 'idea' : 'ideas'} in your sample queue</span></div>
          <div className={s.studyHead}><h1 ref={heading} tabIndex={-1}>{study.title}</h1><p>Database field notes <span aria-hidden="true">·</span> Databases</p></div>
          <nav className={s.studySteps} aria-label="Study steps">{(['passage', 'challenge', 'practice'] as Step[]).map((item, index) => <button key={item} aria-current={step === item ? 'step' : undefined} onClick={() => changeStep(item)}><span>{index + 1}</span>{item === 'passage' ? 'Read the passage' : item === 'challenge' ? 'Apply the idea' : 'Recall & practice'}{index < 2 && <Icon name="arrow" />}</button>)}</nav>
          <div className={s.studyLayout}><section className={s.studyPaper} aria-label={step === 'passage' ? 'Reading passage' : step === 'challenge' ? 'Applied challenge' : 'Recall practice'}>
            {completed ? <div className={s.complete}><span className={s.completeMark}><Icon name="check" /></span><h2 ref={completionHeading} tabIndex={-1}>Sample session complete.</h2><p>You’ve finished this sample session. In the full app, your review choice will be saved with this idea.</p><Button onClick={() => navigate('workspace')}>Back to discoveries <Icon name="arrow" /></Button><button className={s.textLink} onClick={() => startStudy(study.id)}>Revisit this idea</button></div> : step === 'passage' ? <><div className={s.sectionHeading}><h2>A closer reading</h2><span className={s.count}>Source passage</span></div><blockquote className={s.readQuote}>{study.quote}</blockquote><p className={s.sourceCredit}>Commonplace · Database field notes · Section 1<br />Authored sample text</p><div className={s.explanation}><h3>Why this is worth keeping</h3><p>{study.reason}</p><p>Read the passage once more. What decision could this idea help you make in your own work?</p></div><details className={s.context}><summary>Read the full sample section</summary><p>{sourceText}</p></details><div className={s.studyBottom}><span>Next: try an applied problem.</span><Button onClick={() => changeStep('challenge')}>Apply this idea <Icon name="arrow" /></Button></div></> : step === 'challenge' ? <><div className={s.sectionHeading}><h2>Put the idea to work.</h2><span className={s.count}>Applied problem</span></div><p className={s.scenario}>{study.material.prompt}</p><fieldset className={s.choices} disabled={submitted}><legend>Choose your approach</legend>{study.material.choices.map(option => <label key={option.id} className={choice === option.id ? s.chosen : ''}><input type="radio" name="preview-challenge" value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} /><span className={s.choiceLetter}>{option.id.toUpperCase()}</span><span>{option.text}</span></label>)}</fieldset>{submitted && <div className={s.feedback} role="status"><strong>{choice === study.material.correctChoice ? 'That follows the tradeoff.' : 'Consider the tradeoff again.'}</strong><p>{study.material.explanation}</p><button className={s.textLink} onClick={() => { setChoice(''); setSubmitted(false); }}>Try another answer</button></div>}<div className={s.studyBottom}><button className={s.textLink} onClick={() => changeStep('passage')}>Revisit the passage</button><Button disabled={!choice} onClick={() => submitted ? changeStep('practice') : setSubmitted(true)}>{submitted ? 'Continue to recall' : 'Check my reasoning'}<Icon name="arrow" /></Button></div></> : <><div className={s.sectionHeading}><h2>Make it your own.</h2><span className={s.count}>Recall practice</span></div><p className={s.recallHint}>Try answering from memory before revealing the explanation.</p><h3 className={s.recallQuestion}>{study.material.question}</h3>{revealed ? <div className={s.recallAnswer}><h3 ref={answerHeading} tabIndex={-1}>A useful answer</h3><p>{study.material.answer}</p></div> : <button ref={revealButton} type="button" className={`${s.button} ${s.secondary}`} onClick={revealAnswer}>Reveal answer</button>}{revealed && <div className={s.practiceActions}><p>How did that feel? Confidence is a reflection, not a score.</p><div><Button secondary onClick={practiceAgain}>Practice again</Button><Button onClick={completeSession}>I feel confident <Icon name="check" /></Button></div><small>Preview only. No review dates are saved.</small></div>}</>}
          </section><aside className={s.studyAside} aria-label="Study context and notes"><section><h2>From your library</h2><div className={s.asideBook}><BookMark book={books[0]} small /><div><strong>Database field notes</strong><span>Commonplace · Section 1</span></div></div><button className={s.textLink} onClick={viewSourceBook}>View book details <Icon name="arrow" /></button></section><section><label htmlFor="preview-notes">Your thinking</label><p>A connection, a question, something to try.</p><textarea id="preview-notes" rows={5} value={notes[studyId] ?? ''} onChange={event => setNotes(old => ({ ...old, [studyId]: event.target.value }))} placeholder="This reminds me of…" /><small>Kept while this preview is open. Reload clears it.</small></section><section><h2>The learning loop</h2><p>Understand the source.<br />Try the idea in context.<br />Bring it back from memory.</p></section></aside></div>
        </>}
        <footer className={s.footer}><span>Commonplace · A little, often.</span><span>Interactive layout preview. Changes reset on reload.</span></footer>
      </div>
    </main>
  </div>;
}
