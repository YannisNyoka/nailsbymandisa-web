import { apiClient } from './apiClient.js';

// Shared by every "paste a URL" form that became a real file picker (admin gallery
// posts, client photo submissions) — one upload endpoint, one place that knows how to
// call it.
export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await apiClient.post('/uploads/image', formData);
  return url;
}
