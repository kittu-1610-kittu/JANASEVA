/**
 * JANASEVA OS — API Client
 * Typed axios instance with automatic JWT attachment and error normalization.
 */
import axios, { AxiosError, type AxiosInstance } from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("js_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("js_refresh_token");
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem("js_access_token", access);
  localStorage.setItem("js_refresh_token", refresh);
}

export function clearTokens(): void {
  localStorage.removeItem("js_access_token");
  localStorage.removeItem("js_refresh_token");
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — attempt token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        setTokens(data.access_token, data.refresh_token);
        refreshQueue.forEach((cb) => cb(data.access_token));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize API errors
    const resError = (error.response?.data as any)?.error;
    const msg =
      resError?.message ||
      (error.message === "Network Error"
        ? "Unable to connect to API server. Please check your backend connection."
        : error.message || "An unexpected error occurred.");
    const apiError: ApiError = {
      code: resError?.code || (error.code ?? "NETWORK_ERROR"),
      message: msg,
      details: resError?.details,
    };
    return Promise.reject({ ...error, apiError });
  }
);

export default api;
