const API = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
export const ACCESS_KEY = "book-admin-token";
export const REFRESH_KEY = "book-refresh-token";

let refreshRequest;

function saveTokens(data) {
  const access = data?.access_token || data?.token;
  if (!access || !data?.refresh_token) throw new Error("BE không trả về đủ token đăng nhập.");
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  window.dispatchEvent(new Event("book:token-refreshed"));
  return access;
}

async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) throw new Error("Phiên đăng nhập đã hết hạn.");
      const response = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Không thể làm mới phiên đăng nhập.");
      return saveTokens(result.data);
    })().finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
}

async function send(path, options, token) {
  return fetch(API + path, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(!options.skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body,
    signal: options.signal,
  });
}

export async function api(path, options = {}) {
  let token = options.skipAuth
    ? ""
    : localStorage.getItem(ACCESS_KEY) || options.token || "";
  let response = await send(path, options, token);
  const isSessionEndpoint = path.startsWith("/auth/login")
    || path.startsWith("/auth/admin/login")
    || path.startsWith("/auth/register")
    || path.startsWith("/auth/refresh")
    || path.startsWith("/auth/logout");

  if (response.status === 401 && token && !isSessionEndpoint && !options.skipRefresh) {
    try {
      token = await refreshSession();
      response = await send(path, options, token);
    } catch {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      window.dispatchEvent(new Event("book:session-expired"));
    }
  }

  if (response.status === 401 && !isSessionEndpoint) {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    window.dispatchEvent(new Event("book:session-expired"));
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Yêu cầu thất bại.");
    error.status = response.status;
    throw error;
  }
  return data;
}
