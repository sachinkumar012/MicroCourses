import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Ensure Authorization header is attached from localStorage for every request (avoids timing issues)
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// Request interceptor to add idempotency key for POST requests
api.interceptors.request.use((config) => {
  if (["post", "put", "patch"].includes(config.method) && config.data) {
    const idempotencyKey =
      localStorage.getItem("idempotencyKey") ||
      Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

    config.headers["Idempotency-Key"] = idempotencyKey;
    localStorage.setItem("idempotencyKey", idempotencyKey);
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // Rate limit exceeded
      console.error("Rate limit exceeded");
    }
    return Promise.reject(error);
  }
);

export default api;
