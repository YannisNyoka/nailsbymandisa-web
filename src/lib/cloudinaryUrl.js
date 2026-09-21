// None of our upload endpoints apply any transformation at upload time
// (api/src/config/cloudinaryClient.js returns the raw, full-resolution secure_url) — a
// gallery thumbnail displayed at 64px was, until this, downloading the exact same bytes
// as someone viewing the full-size original. Cloudinary serves on-the-fly
// transformations through the delivery URL itself, so inserting a transformation
// segment right after "/upload/" works retroactively on every already-uploaded asset —
// no re-upload or data migration needed. Apply at every place we render a Cloudinary
// image/video, sized to roughly 2x the element's real display size (covers retina
// without shipping a full-resolution original for a small thumbnail).
function withTransform(url, transform) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url; // not a Cloudinary URL (e.g. a local blob: preview) — leave untouched
  return url.replace('/upload/', `/upload/${transform}/`);
}

export function optimizedImageUrl(url, { width } = {}) {
  const parts = ['f_auto', 'q_auto'];
  if (width) parts.push(`w_${width}`, 'c_limit');
  return withTransform(url, parts.join(','));
}

export function optimizedVideoUrl(url, { width } = {}) {
  const parts = ['f_auto', 'q_auto'];
  if (width) parts.push(`w_${width}`, 'c_limit');
  return withTransform(url, parts.join(','));
}
