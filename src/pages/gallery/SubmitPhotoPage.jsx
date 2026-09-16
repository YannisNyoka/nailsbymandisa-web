import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { uploadImageFile } from '../../lib/uploadImage.js';
import { Badge, Button, FormField, useToast } from '../../design-system';
import '../account/AccountPages.css';

const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'danger' };

export function SubmitPhotoPage() {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState(null);

  async function load() {
    const { submissions } = await apiClient.get('/client-gallery/mine');
    setMine(submissions);
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load your submissions.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    try {
      const imageUrl = await uploadImageFile(file);
      await apiClient.post('/client-gallery', { imageUrl, caption: caption || null });
      showToast('Submitted! It will appear once approved.', { variant: 'success' });
      setFile(null);
      setPreview(null);
      setCaption('');
      await load();
    } catch (err) {
      showToast(err.message || 'Could not submit your photo.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-page">
      <h1>Share your before/after photo</h1>
      <section className="account-page__section">
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Photo" required hint="JPEG, PNG, WEBP or GIF, up to 8MB">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
          </FormField>
          {preview && <img src={preview} alt="Preview of your upload" style={{ maxWidth: 200, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />}
          <FormField label="Caption">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} />
          </FormField>
          <Button type="submit" loading={submitting} disabled={!file}>
            Submit for review
          </Button>
        </form>
      </section>

      <h2>Your submissions</h2>
      {!mine ? (
        <p>Loading&hellip;</p>
      ) : (
        <ul className="booking-list">
          {mine.length === 0 && <li>You haven&rsquo;t submitted any photos yet.</li>}
          {mine.map((s) => (
            <li key={s._id} className="booking-card">
              <div className="booking-card__main">
                <div className="booking-card__meta">{s.caption || 'No caption'}</div>
              </div>
              <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
