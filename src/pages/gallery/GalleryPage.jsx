import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import { useToast } from '../../design-system';
import { optimizedImageUrl, optimizedVideoUrl } from '../../lib/cloudinaryUrl.js';
import './GalleryPage.css';

export function GalleryPage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  useDocumentMeta('Gallery', "See NailsByMandisa's work and client before/after photos.");
  const [curated, setCurated] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [likingId, setLikingId] = useState(null);

  async function load() {
    const [{ gallery }, { submissions: subs }] = await Promise.all([
      apiClient.get('/gallery'),
      apiClient.get('/client-gallery'),
    ]);
    setCurated(gallery);
    setSubmissions(subs);
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load the gallery.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function likeCurated(id) {
    if (!isAuthenticated) {
      showToast('Log in to like a photo.', { variant: 'info' });
      return;
    }
    setLikingId(id);
    try {
      await apiClient.post(`/gallery/${id}/like`);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not like this photo.', { variant: 'error' });
    } finally {
      setLikingId(null);
    }
  }

  async function likeSubmission(id) {
    if (!isAuthenticated) {
      showToast('Log in to like a photo.', { variant: 'info' });
      return;
    }
    setLikingId(id);
    try {
      await apiClient.post(`/client-gallery/${id}/like`);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not like this photo.', { variant: 'error' });
    } finally {
      setLikingId(null);
    }
  }

  if (!curated || !submissions) return <p>Loading gallery&hellip;</p>;

  return (
    <div className="gallery-page">
      <div className="gallery-page__header">
        <h1>Our work</h1>
        {isAuthenticated && (
          <Link to="/gallery/submit" className="layout__cta-link">
            Share your photo
          </Link>
        )}
      </div>

      <div className="gallery-grid">
        {curated.map((item) => (
          <figure key={item._id} className="gallery-tile">
            {item.mediaType === 'video' ? (
              <video src={optimizedVideoUrl(item.mediaUrl, { width: 800 })} controls />
            ) : (
              <img src={optimizedImageUrl(item.mediaUrl, { width: 800 })} alt={item.caption || 'NailsByMandisa gallery photo'} />
            )}
            {item.caption && <figcaption>{item.caption}</figcaption>}
            <button
              type="button"
              className="gallery-tile__like"
              onClick={() => likeCurated(item._id)}
              disabled={likingId === item._id}
              aria-busy={likingId === item._id}
            >
              &hearts; {item.likedByUserIds.length}
            </button>
          </figure>
        ))}
        {submissions.map((item) => (
          <figure key={item._id} className="gallery-tile">
            <img src={optimizedImageUrl(item.imageUrl, { width: 800 })} alt={item.caption || 'Client before/after photo'} />
            {item.caption && <figcaption>{item.caption}</figcaption>}
            <button
              type="button"
              className="gallery-tile__like"
              onClick={() => likeSubmission(item._id)}
              disabled={likingId === item._id}
              aria-busy={likingId === item._id}
            >
              &hearts; {item.likedByUserIds.length}
            </button>
          </figure>
        ))}
        {curated.length === 0 && submissions.length === 0 && <p>No gallery photos yet — check back soon.</p>}
      </div>
    </div>
  );
}
