const BASE = ''  // proxied via vite to http://localhost:8000

function getToken() {
  return localStorage.getItem('clause_token')
}

async function request(method, path, body) {
  const opts = { method, headers: {} }
  const token = getToken()
  if (token) opts.headers['Authorization'] = `Bearer ${token}`
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    opts.body = body
  }
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const d = await res.json(); msg = d.detail || JSON.stringify(d) } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  // Auth
  login:              (username, password) => request('POST', '/api/auth/login', { username, password }),
  me:                 ()                   => request('GET',  '/api/auth/me'),
  logout:             ()                   => request('POST', '/api/auth/logout'),

  // Contracts
  getContracts:       ()                    => request('GET',    '/api/contracts'),
  getContract:        (id)                  => request('GET',    `/api/contracts/${id}`),
  uploadContract:     (formData)            => request('POST',   '/api/contracts/upload', formData),
  search:             (question, contractId) => request('POST',  '/api/search', { question, contract_id: contractId ?? null }),
  deleteContract:     (id)                  => request('DELETE', `/api/contracts/${id}`),
  getObligations:     ()                    => request('GET',    '/api/obligations'),
  completeObligation: (id)                  => request('PUT',    `/api/obligations/${id}/complete`),
  getStats:           ()                    => request('GET',    '/api/stats'),
}
