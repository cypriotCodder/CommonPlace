import { StudyProvider } from './components/StudyProvider';
import { Shell } from './components/Shell';
import { StudyDesk } from './components/StudyDesk';
import { Reading } from './components/Reading';
import { Practice } from './components/Practice';
import { Review } from './components/Review';
import { Books } from './components/Books';

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to study content</a>
      <StudyProvider>
        <Shell><StudyDesk /><Reading /><Practice /><Review /><Books /></Shell>
      </StudyProvider>
    </>
  );
}
