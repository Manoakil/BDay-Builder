import { API_BASE_URL, getAuthHeaders } from "./authService";
import { compressVideo, isLargeVideo } from "../utils/videoCompressor";

const WISHES_URL = `${API_BASE_URL}/wishes`;
const TIMELINE_URL = `${API_BASE_URL}/timeline`;
const UPLOAD_URL = `${API_BASE_URL}/upload`;

// ============ WISHES ============

export const getMyWishes = async () => {
  const res = await fetch(`${WISHES_URL}/my`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to fetch wishes");
  }
  return res.json();
};

export const createWish = async (wishData) => {
  const res = await fetch(`${WISHES_URL}/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(wishData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to create wish");
  }
  return res.json();
};

export const updateWish = async (wishId, wishData) => {
  const res = await fetch(`${WISHES_URL}/${wishId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(wishData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to update wish");
  }
  return res.json();
};

export const deleteWish = async (wishId) => {
  const res = await fetch(`${WISHES_URL}/${wishId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete wish");
  }
  return true;
};

export const getBirthdayPersonWishes = async () => {
  const res = await fetch(`${WISHES_URL}/birthday-person`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to fetch celebration wishes");
  }
  return res.json();
};

export const getSecretVaultWishes = async () => {
  const res = await fetch(`${WISHES_URL}/birthday-person-vault`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to fetch secret vault wishes");
  }
  return res.json();
};

export const getBirthdayEvent = async () => {
  const res = await fetch(`${API_BASE_URL}/events/my-birthday-event`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to fetch birthday event");
  }
  return res.json();
};

export const getBirthdayCelebrationStatus = async () => {
  const res = await fetch(`${API_BASE_URL}/events/my-birthday-event/reveal-status`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to check celebration status");
  }
  return res.json();
};

export const getWisherAccessStatus = async () => {
  const res = await fetch(`${API_BASE_URL}/events/my-wisher-access`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to check event access");
  return res.json();
};

export const getBirthdayVault = async (eventId) => {
  const res = await fetch(`${API_BASE_URL}/vault/${eventId}`, { headers: getAuthHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to load the secret vault");
  }
  return res.json();
};

export const attemptBirthdayVault = async (vaultId, attempt_answer) => {
  const res = await fetch(`${API_BASE_URL}/vault/${vaultId}/attempt`, {
    method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ vault_id: vaultId, attempt_answer }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Could not open the vault");
  return data;
};

export const uploadMedia = async (file, bucket = "wishes") => {
  let fileToUpload = file;
  if (isLargeVideo(file, 100)) {
    try {
      fileToUpload = await compressVideo(file);
    } catch (err) {
      console.warn("Auto-compression fallback in uploadMedia:", err);
    }
  }

  // 1. Try Direct Presigned Upload (bypasses Vercel 4.5 MB request body limit!)
  try {
    const presignRes = await fetch(`${UPLOAD_URL}/${bucket}/presign`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        filename: fileToUpload.name || `media-${Date.now()}`,
        content_type: fileToUpload.type || "application/octet-stream",
        size_bytes: fileToUpload.size,
      }),
    });

    if (presignRes.ok) {
      const presigned = await presignRes.json();
      if (presigned.signed_url) {
        // Upload directly from browser to Supabase Storage via PUT
        const uploadDirectRes = await fetch(presigned.signed_url, {
          method: "PUT",
          headers: {
            "Content-Type": fileToUpload.type || "application/octet-stream",
          },
          body: fileToUpload,
        });

        if (!uploadDirectRes.ok) {
          throw new Error(`Direct storage upload failed with status ${uploadDirectRes.status}`);
        }

        // Complete upload and record file in database
        const completeRes = await fetch(`${UPLOAD_URL}/complete`, {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            bucket: bucket,
            path: presigned.path,
            filename: fileToUpload.name || "file",
            content_type: fileToUpload.type || "application/octet-stream",
            size_bytes: fileToUpload.size,
          }),
        });

        if (completeRes.ok) {
          return await completeRes.json();
        } else {
          const compData = await completeRes.json().catch(() => ({}));
          throw new Error(compData.detail || "Failed to finalize uploaded media");
        }
      }
    }
  } catch (directErr) {
    console.warn("Direct presigned upload attempt:", directErr);
    // If file is > 4 MB, standard multipart via Vercel will 413 anyway, so throw direct error
    if (fileToUpload.size > 4 * 1024 * 1024) {
      throw new Error(`Media upload failed: ${directErr.message || "Storage upload failed"}`);
    }
  }

  // 2. Fallback to standard multipart upload (for small assets < 4 MB)
  const form = new FormData();
  form.append("file", fileToUpload);
  const res = await fetch(`${UPLOAD_URL}/${bucket}`, {
    method: "POST",
    headers: getAuthHeaders(false),
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "File upload failed");
  }
  return res.json();
};

// ============ TIMELINE ============

export const getMyTimeline = async () => {
  const res = await fetch(`${TIMELINE_URL}/my`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to fetch timeline");
  }
  return res.json();
};

export const getTimelineForEvent = async (eventId) => {
  const res = await fetch(`${TIMELINE_URL}/${eventId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to fetch event timeline");
  }
  return res.json();
};

export const createTimelineEntry = async (entryData) => {
  const res = await fetch(`${TIMELINE_URL}/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(entryData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to create timeline entry");
  }
  return res.json();
};

export const updateTimelineEntry = async (entryId, entryData) => {
  const res = await fetch(`${TIMELINE_URL}/${entryId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(entryData),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to update timeline entry");
  }
  return res.json();
};

export const deleteTimelineEntry = async (entryId) => {
  const res = await fetch(`${TIMELINE_URL}/${entryId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to delete timeline entry");
  }
  return true;
};
