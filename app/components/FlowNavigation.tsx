'use client';

import { Fragment } from 'react';
import { useStudy, viewLabels, type StudyView } from './StudyProvider';

const steps: StudyView[] = ['home', 'read', 'practice', 'review'];

export function FlowNavigation() {
  const { view, navigate } = useStudy();
  return <div className="flow">{steps.map((step, index) => <Fragment key={step}>
    {index > 0 && ' / '}
    {step === view ? <span className="current">{viewLabels[step]}</span> : <button onClick={() => navigate(step)}>{viewLabels[step]}</button>}
  </Fragment>)}</div>;
}
