/**
 * MT — централизованный HTTP-клиент
 * Автоматически добавляет JWT Bearer-token к каждому запросу.
 * При 401/403 удаляет устаревший токен и перезагружает страницу.
 */

const BASE = process.env.REACT_APP_API_URL || '/api/v1';

function getToken() {
  return localStorage.getItem('mt_token');
}

function buildHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('mt_token');
    localStorage.removeItem('mt_user');
    window.location.reload();
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};

// ── Loads (Заказы) ─────────────────────────────────────────────────────────────
export const loadsApi = {
  list:    (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return api.get(`/loads${qs ? '?' + qs : ''}`);
  },
  get:     (id)          => api.get(`/loads/${id}`),
  create:  (body)        => api.post('/loads', body),
  update:  (id, body)    => api.patch(`/loads/${id}`, body),
  aging:   ()            => api.get('/loads/aging'),
};

// ── Auto-Assignment ────────────────────────────────────────────────────────────
export const autoassignApi = {
  suggest: (loadId, radius = 500) => api.get(`/autoassign/suggest/${loadId}?radius=${radius}`),
  assign:  (loadId, criteria)     => api.post(`/autoassign/assign/${loadId}`, { criteria }),
  offer:   (loadId, driverId, message) =>
    api.post(`/autoassign/offer/${loadId}`, { driverId, message }),
};

// ── Tracking ───────────────────────────────────────────────────────────────────
export const trackingApi = {
  ping:   (body)     => api.post('/tracking/ping', body),
  driver: (driverId) => api.get(`/tracking/${driverId}`),
  route:  (orderId)  => api.get(`/tracking/routes/${orderId}`),
};

// ── Chat ───────────────────────────────────────────────────────────────────────
export const chatApi = {
  contacts:    ()        => api.get('/chat/contacts'),
  history:     (orderId) => api.get(`/chat/${orderId}`),
  send:        (body)    => api.post('/chat/send', body),
};

// ── Contacts ───────────────────────────────────────────────────────────────────
export const contactsApi = {
  list:      ()                    => api.get('/contacts'),
  catalog:   (params = {})         => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/contacts/catalog${qs ? '?' + qs : ''}`);
  },
  review:    (id, body)            => api.post(`/contacts/${id}/review`, body),
  blacklist: (id)                  => api.post(`/contacts/blacklist`, { contactId: id }),
  unblacklist:(id)                 => api.delete(`/contacts/blacklist?contactId=${id}`),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const usersApi = {
  drivers: () => api.get('/users'),
  me:      () => api.get('/auth/me'),
};

// ── Claims (Претензии) ────────────────────────────────────────────────────────
export const claimsApi = {
  list:    (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return api.get(`/claims${qs ? '?' + qs : ''}`);
  },
  get:     (id)          => api.get(`/claims/${id}`),
  create:  (body)        => api.post('/claims', body),
  update:  (id, body)    => api.patch(`/claims/${id}`, body),
  resolve: (id, body)    => api.post(`/claims/${id}/resolve`, body),
  delete:  (id)          => api.delete(`/claims/${id}`),
};

// ── Rate Calculator (Ставки) ───────────────────────────────────────────────────
export const ratesApi = {
  calculate: (body)      => api.post('/rates/calculate', body),
  history:   (params={}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return api.get(`/rates/history${qs ? '?' + qs : ''}`);
  },
  save:      (body)      => api.post('/rates/save', body),
  delete:    (id)        => api.delete(`/rates/${id}`),
};

// ── Notifications (Уведомления) ────────────────────────────────────────────────
export const notificationsApi = {
  list:    ()   => api.get('/notifications'),
  markRead:(id) => api.patch(`/notifications/${id}/read`),
  markAll: ()   => api.patch('/notifications/read-all'),
  delete:  (id) => api.delete(`/notifications/${id}`),
};

// ── Audit Log ──────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return api.get(`/audit${qs ? '?' + qs : ''}`);
  },
};

// ── PDF Generation ─────────────────────────────────────────────────────────────
export const pdfApi = {
  ttn:     (loadId) => `${BASE}/pdf/load/${loadId}/ttn`,
  cmr:     (loadId) => `${BASE}/pdf/load/${loadId}/cmr`,
  invoice: (loadId) => `${BASE}/pdf/load/${loadId}/invoice`,
};

// ── Export ─────────────────────────────────────────────────────────────────────
export const exportApi = {
  loads:     (params={}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return `${BASE}/export/loads${qs ? '?' + qs : ''}`;
  },
  analytics: () => `${BASE}/export/analytics`,
  claims:    () => `${BASE}/export/claims`,
};

// ── Carrier Verification ───────────────────────────────────────────────────────
export const verificationApi = {
  list:    (userId)      => api.get(`/verification/${userId}`),
  add:     (userId,body) => api.post(`/verification/${userId}`, body),
  update:  (docId, body) => api.patch(`/verification/doc/${docId}`, body),
  verify:  (docId)       => api.post(`/verification/doc/${docId}/verify`),
  delete:  (docId)       => api.delete(`/verification/doc/${docId}`),
};

// ── Reviews (Отзывы и рейтинги) — FR-09 ───────────────────────────────────────
export const reviewsApi = {
  getForUser: (userId) => api.get(`/reviews/${userId}`),
  create:     (body)   => api.post('/reviews', body),
  delete:     (id)     => api.delete(`/reviews/${id}`),
};

// ── Incidents (Инциденты) — FR-28 ─────────────────────────────────────────────
export const incidentsApi = {
  list:    (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return api.get(`/incidents${qs ? '?' + qs : ''}`);
  },
  get:     (id)          => api.get(`/incidents/${id}`),
  create:  (body)        => api.post('/incidents', body),
  update:  (id, body)    => api.patch(`/incidents/${id}`, body),
  resolve: (id)          => api.post(`/incidents/${id}/resolve`),
};

// ── Proof of Delivery — FR-25 ─────────────────────────────────────────────────
export const podApi = {
  confirm: (loadId, body) => api.post(`/loads/${loadId}/pod`, body),
};

// ── Webhooks — FR-29 ──────────────────────────────────────────────────────────
export const webhooksApi = {
  list:   ()          => api.get('/webhooks'),
  create: (body)      => api.post('/webhooks', body),
  update: (id, body)  => api.patch(`/webhooks/${id}`, body),
  delete: (id)        => api.delete(`/webhooks/${id}`),
  test:   (id)        => api.post(`/webhooks/${id}/test`),
};

// ── Users расширенный — FR-15, FR-17, FR-18, FR-19, NFR-06 ───────────────────
export const usersExtApi = {
  list:               (params={})    => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v))).toString();
    return api.get(`/users${qs ? '?' + qs : ''}`);
  },
  getById:            (id)           => api.get(`/users/${id}`),
  update:             (id, body)     => api.patch(`/users/${id}`, body),
  delete:             (id)           => api.delete(`/users/${id}`),
  deletePersonalData: (id)           => api.delete(`/users/${id}/personal-data`),
  getVehicles:        (userId)       => api.get(`/users/${userId}/vehicles`),
  addVehicle:         (body)         => api.post('/users/vehicles', body),
  updateVehicle:      (id, body)     => api.patch(`/users/vehicles/${id}`, body),
  deleteVehicle:      (id)           => api.delete(`/users/vehicles/${id}`),
};

// ── Auth расширенный — NFR-04 ─────────────────────────────────────────────────
export const authApi = {
  logout:         ()     => api.post('/auth/logout'),
  changePassword: (body) => api.post('/auth/change-password', body),
};
