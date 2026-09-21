// §7.5 — one HTTP client wrapper, used everywhere, that throws consistently on
// non-2xx responses. Prevents the "optimistic UI update after a call that silently
// failed" bug class: every caller can rely on a thrown ApiError instead of separately
// checking res.ok.

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

// AuthContext registers this so a 401 from any request (access token expired/invalid)
// clears client-side auth state consistently, instead of each call site having to
// remember to handle it.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Plain requests are fast (JSON CRUD) — 30s is already generous. File uploads need much
// more: routed through Render's free tier then relayed to Cloudinary, and Cloudinary's
// own video processing (transcoding/thumbnailing) is noticeably slower than its image
// path. Without any timeout at all, a slow/stuck upload just spun the button's loading
// state forever with zero feedback — found via a real large video upload doing exactly
// that in production.
const DEFAULT_TIMEOUT_MS = 30_000;

async function request(path, { method = 'GET', body, headers = {}, skipUnauthorizedHandler = false, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = {}) {
  // FormData (file uploads) must go through as-is — JSON.stringify-ing it would send
  // "[object FormData]", and setting our own Content-Type would drop the multipart
  // boundary fetch generates automatically. Every other caller still gets plain JSON.
  const isFormData = body instanceof FormData;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
      ...rest,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('That took too long and timed out. Check your connection and try again.', 0, 'TIMEOUT');
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    if (res.status === 401 && !skipUnauthorizedHandler) onUnauthorized?.();
    throw new ApiError(
      payload?.error?.message || `Request failed with status ${res.status}`,
      res.status,
      payload?.error?.code,
      payload?.error
    );
  }

  return payload;
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
