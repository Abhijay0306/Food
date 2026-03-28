import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Add interceptor to automatically refresh tokens on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url.includes("/auth/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      await api.post("/auth/refresh");
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

// Error formatter for FastAPI responses
export function formatApiError(error) {
  const detail = error?.response?.data?.detail;
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function getWsUrl(path) {
  const url = API_URL.replace("https://", "wss://").replace("http://", "ws://");
  return `${url}/api${path}`;
}

export default api;
