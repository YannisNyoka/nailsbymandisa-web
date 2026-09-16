import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Pagination, useToast } from '../../design-system';
import './AdminPages.css';

export function AdminActivityPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiClient
      .get(`/admin/activity?page=${page}&pageSize=30`)
      .then(setData)
      .catch((err) => showToast(err.message || 'Could not load activity.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!data) return <p>Loading activity&hellip;</p>;

  return (
    <div>
      <ul className="activity-feed">
        {data.entries.length === 0 && <li>No activity yet.</li>}
        {data.entries.map((entry) => (
          <li key={entry._id}>
            {entry.message}
            <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ul>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
    </div>
  );
}
