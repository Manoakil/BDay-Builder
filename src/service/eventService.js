import { API_BASE_URL, getAuthHeaders } from './authService';

// ====== EVENTS ======
export const getMyBirthdayEvent = async () => {
  const res = await fetch(`${API_BASE_URL}/events/my-birthday-event`, { headers: getAuthHeaders(true) });
  if (!res.ok) throw new Error("Failed to fetch birthday event");
  return res.json();
};

export const createEvent = async (eventData) => {
  const res = await fetch(`${API_BASE_URL}/events/`, {
    method: "POST", headers: getAuthHeaders(true), body: JSON.stringify(eventData)
  });
  if (!res.ok) {
    let errMsg = "Failed to create event";
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
};

export const updateEvent = async (eventId, eventData) => {
  const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "PUT", headers: getAuthHeaders(true), body: JSON.stringify(eventData)
  });
  if (!res.ok) {
    let errMsg = "Failed to update event";
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
};

// ====== VAULT ======
export const getVaultForManager = async (eventId) => {
  const res = await fetch(`${API_BASE_URL}/vault/${eventId}/manage`, { headers: getAuthHeaders(true) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load vault configuration");
  return res.json();
};

export const updateVault = async (vaultId, vaultData) => {
  const res = await fetch(`${API_BASE_URL}/vault/${vaultId}`, {
    method: "PATCH", headers: getAuthHeaders(true), body: JSON.stringify(vaultData)
  });
  if (!res.ok) {
    let errMsg = "Failed to update vault";
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
};

// ====== THEMES ======
export const getThemeForEvent = async (eventId) => {
  const res = await fetch(`${API_BASE_URL}/themes/${eventId}`, { headers: getAuthHeaders(true) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch theme");
  return res.json();
};

export const updateTheme = async (themeId, themeData) => {
  const res = await fetch(`${API_BASE_URL}/themes/${themeId}`, {
    method: "PUT", headers: getAuthHeaders(true), body: JSON.stringify(themeData)
  });
  if (!res.ok) throw new Error("Failed to update theme");
  return res.json();
};

// ====== WISH MODERATION ======
export const getWishesForEvent = async (eventId) => {
  const res = await fetch(`${API_BASE_URL}/wishes/${eventId}`, { headers: getAuthHeaders(true) });
  if (!res.ok) throw new Error("Failed to fetch wishes for event");
  return res.json();
};

export const approveWish = async (wishId) => {
  const res = await fetch(`${API_BASE_URL}/wishes/${wishId}/approve`, {
    method: "POST", headers: getAuthHeaders(true)
  });
  if (!res.ok) throw new Error("Failed to approve wish");
  return res.json();
};

export const adminDeleteWish = async (wishId) => {
  const res = await fetch(`${API_BASE_URL}/wishes/${wishId}`, {
    method: "DELETE", headers: getAuthHeaders(true)
  });
  if (!res.ok) throw new Error("Failed to delete wish");
  return true;
};

// ====== TIMELINE ======
export const getTimelineForEvent = async (eventId) => {
  const res = await fetch(`${API_BASE_URL}/timeline/${eventId}`, { headers: getAuthHeaders(true) });
  if (!res.ok) throw new Error("Failed to fetch timeline");
  return res.json();
};

// ====== GALLERY (MEMORIES) ======
export const getGalleryForEvent = async (eventId) => {
  const res = await fetch(`${API_BASE_URL}/gallery/${eventId}`, { headers: getAuthHeaders(true) });
  if (!res.ok) throw new Error("Failed to fetch gallery");
  return res.json();
};

export const createGalleryItem = async (galleryData) => {
  const res = await fetch(`${API_BASE_URL}/gallery/`, {
    method: "POST", headers: getAuthHeaders(true), body: JSON.stringify(galleryData)
  });
  if (!res.ok) throw new Error("Failed to create gallery item");
  return res.json();
};

export const deleteGalleryItem = async (itemId) => {
  const res = await fetch(`${API_BASE_URL}/gallery/${itemId}`, {
    method: "DELETE", headers: getAuthHeaders(true)
  });
  if (!res.ok) throw new Error("Failed to delete gallery item");
  return true;
};

// ====== ORGANIZATIONS ======
export const updateOrganization = async (orgId, orgData) => {
  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
    method: "PUT", headers: getAuthHeaders(true), body: JSON.stringify(orgData)
  });
  if (!res.ok) throw new Error("Failed to update organization");
  return res.json();
};

export const createVault = async (vaultData) => {
  const res = await fetch(`${API_BASE_URL}/vault/`, {
    method: "POST", headers: getAuthHeaders(true), body: JSON.stringify(vaultData)
  });
  if (!res.ok) {
    let errMsg = "Failed to create vault";
    try {
      const errData = await res.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
};
