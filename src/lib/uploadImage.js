import { apiClient } from './apiClient.js';

// Shared by every "paste a URL" form that became a real file picker (admin gallery
// posts, client photo submissions) — one upload endpoint, one place that knows how to
// call it. Longer timeout than apiClient's default (a real upload takes much longer than
// a normal JSON request, especially on Render's free tier).
export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await apiClient.post('/uploads/image', formData, { timeoutMs: 60_000 });
  return url;
}

// Same pattern, separate endpoint (own size limit/mimetypes/permission — see
// api/src/routes/uploads.js) — used by the home page hero editor. Longer timeout still:
// video files are bigger and Cloudinary's own video processing (transcoding/thumbnails)
// is slower than its image path on top of the larger upload itself. Kept a little above
// Cloudinary's own configured upload timeout (config/cloudinaryClient.js, 5 minutes) so a
// real timeout surfaces as Cloudinary's own clean, specific error instead of this
// generic client-side one winning the race and hiding it.
export async function uploadVideoFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { url } = await apiClient.post('/uploads/video', formData, { timeoutMs: 320_000 });
  return url;
}
