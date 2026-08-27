const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Structured API error with status code, error code, and user-friendly message.
 */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function humanMessage(status, body) {
  const serverMsg = body?.error?.message || body?.detail || '';
  switch (status) {
    case 400: return serverMsg || 'Invalid request.';
    case 404: return serverMsg || 'The requested resource was not found.';
    case 413: return serverMsg || 'File is too large. Maximum supported size is 25 MB.';
    case 422: return serverMsg || 'Some submitted data is invalid.';
    case 429: return 'Too many requests. Please wait and try again.';
    case 500: return serverMsg || 'Something went wrong on the server.';
    case 502: case 503: case 504: return 'Service temporarily unavailable. Please try again.';
    default:  return serverMsg || `Request failed (${status}).`;
  }
}

const DEFAULT_TIMEOUT = 60000; // 60s for normal requests
const UPLOAD_TIMEOUT = 120000; // 120s for uploads

async function request(path, opts = {}) {
  const timeout = opts._timeout || DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return await _handleResponse(res);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The request took too long. Please try again.');
    }
    if (err instanceof ApiError) throw err;
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new ApiError(0, 'NETWORK_ERROR', 'Unable to connect to the backend. Check your connection and try again.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error. Please try again.');
  }
}

async function _handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error?.code || `HTTP_${res.status}`, humanMessage(res.status, body));
  }
  return res;
}

export async function uploadEml(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request('/api/investigations/upload', { method: 'POST', body: formData, _timeout: UPLOAD_TIMEOUT });
  return res.json();
}

export async function listInvestigations(page = 1, pageSize = 20) {
  const res = await request(`/api/investigations?page=${page}&page_size=${pageSize}`);
  return res.json();
}

export async function getInvestigation(id) {
  const res = await request(`/api/investigations/${id}`);
  return res.json();
}

export async function getInvestigationGraph(id) {
  const res = await request(`/api/investigations/${id}/graph`);
  return res.json();
}

export function getReportUrl(id) {
  return `${API_BASE}/api/investigations/${id}/report`;
}
