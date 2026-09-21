import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';
import { Button } from '../design-system';
import './NotFoundPage.css';

export function NotFoundPage() {
  useDocumentMeta('Page not found', null, { noindex: true });
  return (
    <div className="not-found-page">
      <p className="not-found-page__eyebrow">404</p>
      <h1>We couldn't find that page</h1>
      <p>The link might be old, or the page may have moved. Here are some places to go instead:</p>
      <div className="not-found-page__actions">
        <Link to="/"><Button>Go to home</Button></Link>
        <Link to="/book"><Button variant="secondary">Book an appointment</Button></Link>
        <Link to="/gallery"><Button variant="secondary">View gallery</Button></Link>
      </div>
    </div>
  );
}
