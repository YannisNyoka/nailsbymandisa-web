import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

export function AdminGalleryModerationPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [moderatingId, setModeratingId] = useState(null);

  const load = useCallback(async () => {
    setData(await apiClient.get(`/client-gallery/queue?status=pending&page=${page}&pageSize=20`));
  }, [page]);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load the moderation queue.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function moderate(id, status) {
    setModeratingId(id);
    try {
      await apiClient.patch(`/client-gallery/${id}/moderate`, { status });
      showToast(status === 'approved' ? 'Approved.' : 'Rejected.', { variant: 'success' });
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update this submission.', { variant: 'error' });
    } finally {
      setModeratingId(null);
    }
  }

  const columns = [
    { key: 'preview', header: '', render: (s) => <img src={s.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /> },
    { key: 'caption', header: 'Caption', render: (s) => s.caption || '—' },
    { key: 'submitted', header: 'Submitted', render: (s) => new Date(s.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="admin-table-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => moderate(s._id, 'approved')}
            loading={moderatingId === s._id}
            disabled={moderatingId !== null && moderatingId !== s._id}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => moderate(s._id, 'rejected')}
            loading={moderatingId === s._id}
            disabled={moderatingId !== null && moderatingId !== s._id}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  if (!data) return <p>Loading&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Badge>{data.total} pending</Badge>
      </div>
      <Table columns={columns} rows={data.submissions} getRowKey={(s) => s._id} emptyMessage="No submissions awaiting review." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
    </div>
  );
}
