import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { uploadImageFile, uploadVideoFile } from '../../lib/uploadImage.js';
import { optimizedImageUrl, optimizedVideoUrl } from '../../lib/cloudinaryUrl.js';
import { Button, FormField, useToast } from '../../design-system';
import './AdminPages.css';

// The only home-page setting exposed here today is the hero — see README "Also surfaced
// while doing this" for the broader "no admin settings screen exists yet" gap this page
// is a first, narrow instance of, not a full settings page.
//
// The hero plays as a slideshow of these items in order, looping back to the first (see
// HomePage.jsx's HeroSlideshow) — this page manages that list: add, remove, reorder.
export function AdminHomepagePage() {
  const { showToast } = useToast();
  const [items, setItems] = useState(null);
  const [persisting, setPersisting] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', tiktok: '', twitter: '' });
  const [savingSocial, setSavingSocial] = useState(false);
  const [allowGuestBooking, setAllowGuestBooking] = useState(true);
  const [savingBookingAccess, setSavingBookingAccess] = useState(false);

  useEffect(() => {
    apiClient
      .get('/settings')
      .then(({ settings }) => {
        setItems(settings.heroMediaItems || []);
        setSocialLinks({ instagram: '', facebook: '', tiktok: '', twitter: '', ...settings.socialLinks });
        setAllowGuestBooking(settings.allowGuestBooking !== false);
      })
      .catch((err) => showToast(err.message || 'Could not load the current hero.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(nextItems, successMessage) {
    setPersisting(true);
    try {
      const { settings } = await apiClient.patch('/settings', { heroMediaItems: nextItems });
      setItems(settings.heroMediaItems);
      showToast(successMessage, { variant: 'success' });
    } catch (err) {
      showToast(err.message || 'Could not update the hero.', { variant: 'error' });
    } finally {
      setPersisting(false);
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!file) {
      showToast(mediaType === 'image' ? 'Choose a photo to upload.' : 'Choose a video to upload.', { variant: 'error' });
      return;
    }
    setAdding(true);
    try {
      const url = mediaType === 'image' ? await uploadImageFile(file) : await uploadVideoFile(file);
      await persist([...items, { url, type: mediaType }], 'Added to the hero slideshow.');
      setFile(null);
      setPreview(null);
    } catch (err) {
      showToast(err.message || 'Could not upload that file.', { variant: 'error' });
    } finally {
      setAdding(false);
    }
  }

  function handleRemove(index) {
    persist(items.filter((_, i) => i !== index), 'Removed from the hero slideshow.');
  }

  function handleMove(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next, 'Reordered the hero slideshow.');
  }

  async function handleToggleGuestBooking(nextValue) {
    setSavingBookingAccess(true);
    try {
      const { settings } = await apiClient.patch('/settings', { allowGuestBooking: nextValue });
      setAllowGuestBooking(settings.allowGuestBooking !== false);
      showToast(
        nextValue ? 'Guest booking enabled — anyone can book without an account.' : 'Guest booking disabled — customers must sign in or register to book.',
        { variant: 'success' }
      );
    } catch (err) {
      showToast(err.message || 'Could not update this setting.', { variant: 'error' });
    } finally {
      setSavingBookingAccess(false);
    }
  }

  async function handleSocialSubmit(e) {
    e.preventDefault();
    setSavingSocial(true);
    try {
      await apiClient.patch('/settings', { socialLinks });
      showToast('Social links updated.', { variant: 'success' });
    } catch (err) {
      showToast(err.message || 'Could not update social links.', { variant: 'error' });
    } finally {
      setSavingSocial(false);
    }
  }

  if (!items) return <p>Loading&hellip;</p>;

  return (
    <div>
      <h2>Booking access</h2>
      <p className="admin-page__muted" style={{ marginBottom: 'var(--space-4)' }}>
        Controls whether a visitor can complete a booking with just their name, email and
        phone number, or must sign in or register first. Enforced on the server either
        way — this isn&rsquo;t just a UI toggle. An admin creating a booking on a
        client&rsquo;s behalf (e.g. a phone booking) is never affected.
      </p>
      <label className="admin-homepage__toggle">
        <input
          type="checkbox"
          checked={allowGuestBooking}
          disabled={savingBookingAccess}
          onChange={(e) => handleToggleGuestBooking(e.target.checked)}
        />
        Allow guest booking (no account required)
      </label>

      <h2 style={{ marginTop: 'var(--space-8)' }}>Hero slideshow</h2>
      <p className="admin-page__muted" style={{ marginBottom: 'var(--space-5)' }}>
        Controls the large background at the top of the public home page. With more than
        one item, it plays as a slideshow in this order, looping back to the start. At
        least one item is always required, so Remove is disabled while only one remains —
        add a replacement first, then remove the old one.
      </p>
      <ul className="admin-homepage__slides">
        {items.map((item, index) => (
          <li key={item.url} className="admin-homepage__slide">
            {item.type === 'image' ? (
              <img src={optimizedImageUrl(item.url, { width: 300 })} alt={`Hero slide ${index + 1}`} className="admin-homepage__slide-thumb" />
            ) : (
              <video src={optimizedVideoUrl(item.url, { width: 300 })} className="admin-homepage__slide-thumb" muted playsInline />
            )}
            <div className="admin-homepage__slide-meta">
              <span>#{index + 1} · {item.type}</span>
            </div>
            <div className="admin-homepage__slide-actions">
              <Button variant="secondary" size="sm" disabled={persisting || index === 0} onClick={() => handleMove(index, -1)}>↑</Button>
              <Button variant="secondary" size="sm" disabled={persisting || index === items.length - 1} onClick={() => handleMove(index, 1)}>↓</Button>
              <Button
                variant="danger"
                size="sm"
                disabled={persisting || items.length <= 1}
                title={items.length <= 1 ? 'Add another item first — the hero always needs at least one.' : undefined}
                onClick={() => handleRemove(index)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 'var(--space-6)' }}>Add to the slideshow</h2>
      <form onSubmit={handleAdd} noValidate style={{ maxWidth: 480, marginTop: 'var(--space-4)' }}>
        <FormField label="Media type" required>
          <select value={mediaType} onChange={(e) => { setMediaType(e.target.value); setFile(null); setPreview(null); }}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </FormField>

        {mediaType === 'image' ? (
          <FormField key="image" label="Photo" required hint="JPEG, PNG, WEBP or GIF, up to 8MB.">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
          </FormField>
        ) : (
          <FormField key="video" label="Video" required hint="MP4, WEBM or MOV, up to 50MB — autoplays muted, so keep it short.">
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleFileChange} />
          </FormField>
        )}

        {preview && (mediaType === 'image' ? (
          <img src={preview} alt="New slide preview" className="admin-homepage__preview" />
        ) : (
          <video src={preview} className="admin-homepage__preview" autoPlay muted loop playsInline />
        ))}

        <Button type="submit" loading={adding}>Add to slideshow</Button>
      </form>

      <h2 style={{ marginTop: 'var(--space-8)' }}>Social links</h2>
      <p className="admin-page__muted" style={{ marginBottom: 'var(--space-5)' }}>
        Shown as icons in the site footer. Leave a field empty to hide that icon.
      </p>
      <form onSubmit={handleSocialSubmit} noValidate style={{ maxWidth: 480 }}>
        <FormField label="Instagram">
          <input type="url" value={socialLinks.instagram} onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })} placeholder="https://instagram.com/..." />
        </FormField>
        <FormField label="Facebook">
          <input type="url" value={socialLinks.facebook} onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })} placeholder="https://facebook.com/..." />
        </FormField>
        <FormField label="TikTok">
          <input type="url" value={socialLinks.tiktok} onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })} placeholder="https://tiktok.com/@..." />
        </FormField>
        <FormField label="X (Twitter)">
          <input type="url" value={socialLinks.twitter} onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })} placeholder="https://x.com/..." />
        </FormField>
        <Button type="submit" loading={savingSocial}>Save social links</Button>
      </form>
    </div>
  );
}
