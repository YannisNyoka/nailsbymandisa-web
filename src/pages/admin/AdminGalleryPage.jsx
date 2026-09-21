import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { uploadImageFile } from '../../lib/uploadImage.js';
import { optimizedImageUrl } from '../../lib/cloudinaryUrl.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

const emptyForm = { mediaUrl: '', mediaType: 'image', caption: '' };

export function AdminGalleryPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setData(await apiClient.get(`/gallery?page=${page}&pageSize=20`));
  }, [page]);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load the gallery.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function resetForm() {
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const mediaUrl = form.mediaType === 'image' && file ? await uploadImageFile(file) : form.mediaUrl;
      await apiClient.post('/gallery', { mediaUrl, mediaType: form.mediaType, caption: form.caption || null });
      showToast('Added to gallery.', { variant: 'success' });
      setCreating(false);
      resetForm();
      await load();
    } catch (err) {
      showToast(err.message || 'Could not add this item.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublished(item) {
    setTogglingId(item._id);
    try {
      await apiClient.patch(`/gallery/${item._id}`, { isPublished: !item.isPublished });
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update this item.', { variant: 'error' });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    await apiClient.delete(`/gallery/${deleteTarget._id}`);
    showToast('Removed.', { variant: 'success' });
    await load();
  }

  const columns = [
    { key: 'preview', header: '', render: (i) => <img src={optimizedImageUrl(i.mediaUrl, { width: 100 })} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /> },
    { key: 'caption', header: 'Caption', render: (i) => i.caption || '—' },
    { key: 'type', header: 'Type', render: (i) => i.mediaType },
    { key: 'likes', header: 'Likes', render: (i) => i.likedByUserIds.length },
    { key: 'status', header: 'Status', render: (i) => <Badge variant={i.isPublished ? 'success' : 'neutral'}>{i.isPublished ? 'published' : 'hidden'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (i) => (
        <div className="admin-table-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => togglePublished(i)}
            loading={togglingId === i._id}
            disabled={togglingId !== null && togglingId !== i._id}
          >
            {i.isPublished ? 'Hide' : 'Publish'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(i)} disabled={togglingId !== null}>Delete</Button>
        </div>
      ),
    },
  ];

  if (!data) return <p>Loading gallery&hellip;</p>;

  const canSubmit = form.mediaType === 'image' ? Boolean(file) : Boolean(form.mediaUrl);

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={() => setCreating(true)}>Add item</Button>
      </div>
      <Table columns={columns} rows={data.gallery} getRowKey={(i) => i._id} emptyMessage="No gallery items yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />

      <Modal
        isOpen={creating}
        onClose={() => { setCreating(false); resetForm(); }}
        title="Add gallery item"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreating(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>Add</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Type" required>
            <select value={form.mediaType} onChange={(e) => setForm((f) => ({ ...f, mediaType: e.target.value }))}>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </FormField>
          {form.mediaType === 'image' ? (
            <FormField label="Photo" required hint="JPEG, PNG, WEBP or GIF, up to 8MB">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} />
            </FormField>
          ) : (
            <FormField label="Video URL" required hint="A link to an already-hosted video (e.g. YouTube, Vimeo, or your own hosting)">
              <input type="url" value={form.mediaUrl} onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))} />
            </FormField>
          )}
          {preview && <img src={preview} alt="Preview" style={{ maxWidth: 160, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />}
          <FormField label="Caption">
            <input value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this gallery item?"
        summary="This removes it from the public site permanently."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
