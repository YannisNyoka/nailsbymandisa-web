import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { uploadImageFile } from '../../lib/uploadImage.js';
import { Button, FormField, useToast } from '../../design-system';
import './AdminPages.css';

// The only home-page setting exposed here today is the hero background — see README
// "Also surfaced while doing this" for the broader "no admin settings screen exists yet"
// gap this page is a first, narrow instance of, not a full settings page.
export function AdminHomepagePage() {
  const { showToast } = useToast();
  const [current, setCurrent] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get('/settings')
      .then(({ settings }) => {
        setCurrent(settings.heroMedia);
        setMediaType(settings.heroMedia?.type || 'image');
      })
      .catch((err) => showToast(err.message || 'Could not load the current hero.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = mediaType === 'image' ? (file ? await uploadImageFile(file) : current?.url) : videoUrl;
      if (!url) throw new Error(mediaType === 'image' ? 'Choose a photo to upload.' : 'Enter a video URL.');
      const { settings } = await apiClient.patch('/settings', { heroMedia: { url, type: mediaType } });
      setCurrent(settings.heroMedia);
      setFile(null);
      setPreview(null);
      setVideoUrl('');
      showToast('Home page hero updated.', { variant: 'success' });
    } catch (err) {
      showToast(err.message || 'Could not update the hero.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return <p>Loading&hellip;</p>;

  return (
    <div>
      <p className="admin-page__muted" style={{ marginBottom: 'var(--space-5)' }}>
        Controls the large background at the top of the public home page.
      </p>

      {current.type === 'image' ? (
        <img src={current.url} alt="Current hero" className="admin-homepage__current" />
      ) : (
        <video src={current.url} className="admin-homepage__current" autoPlay muted loop playsInline />
      )}

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 480, marginTop: 'var(--space-5)' }}>
        <FormField label="Media type" required>
          <select value={mediaType} onChange={(e) => { setMediaType(e.target.value); setFile(null); setPreview(null); }}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </FormField>

        {mediaType === 'image' ? (
          <FormField key="image" label="New photo" hint="JPEG, PNG, WEBP or GIF, up to 8MB. Leave empty to keep the current one.">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
          </FormField>
        ) : (
          <FormField key="video" label="Video URL" required hint="A link to an already-hosted video file (e.g. an .mp4 you've uploaded elsewhere) — autoplays muted and looped, so keep it short.">
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </FormField>
        )}

        {preview && mediaType === 'image' && <img src={preview} alt="New photo preview" className="admin-homepage__preview" />}

        <Button type="submit" loading={submitting}>Save</Button>
      </form>
    </div>
  );
}
