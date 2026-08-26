const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res;
}

export async function uploadEml(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request('/api/investigations/upload', { method: 'POST', body: formData });
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
