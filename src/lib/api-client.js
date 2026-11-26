let inMemoryAccessToken = null;
let onTokenExpiredCallback = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setOnTokenExpired(callback) {
  onTokenExpiredCallback = callback;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Universal API fetch client handling credentials, JWT injection, and silent token rotation.
 */
export async function apiFetch(endpoint, options = {}, isRetry = false) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (inMemoryAccessToken) {
    headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Transmit httpOnly refresh cookie
  });

  // Handle Token Expiration and Silent Refresh (401)
  if (response.status === 401 && !isRetry && !endpoint.includes("/auth/")) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData?.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          // Retry original request with new token
          return apiFetch(endpoint, options, true);
        }
      }
    } catch (_err) {
      // Refresh failed
    }

    // Refresh completely failed; notify auth context
    setAccessToken(null);
    if (onTokenExpiredCallback) {
      onTokenExpiredCallback();
    }
  }

  // Parse JSON response
  let data;
  try {
    data = await response.json();
  } catch (_e) {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || "Request failed";
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || "UNKNOWN_ERROR";
    error.details = data?.error?.details || [];
    throw error;
  }

  return data;
}

