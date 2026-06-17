import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { BASE_URL, API_TIMEOUT } from './config';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  },
});

// ── Auth token injected by calling setAuthUserId() after login ────────────────
let _userId: number | null = null;

export function setAuthUserId(id: number | null) {
  _userId = id;
}

export function getAuthUserId(): number | null {
  return _userId;
}

// ── Request interceptor — attach user_id header when logged in ────────────────
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_userId !== null) {
    config.headers['X-User-Id'] = String(_userId);
  }
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}${config.params ? '?' + new URLSearchParams(config.params).toString() : ''}`);
  return config;
});

// ── Response interceptor — normalise errors ───────────────────────────────────
client.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const serverMsg =
      (error.response?.data as Record<string, unknown>)?.message as string | undefined;

    let message = serverMsg ?? error.message;

    if (status === 401) message = 'Unauthorised. Please log in again.';
    if (status === 403) message = 'You do not have permission for this action.';
    if (status === 404) message = 'Resource not found.';
    if (status === 422) message = serverMsg ?? 'Validation error.';
    if (status === 500) message = 'Server error. Please try again later.';
    if (!error.response)  message = 'Network error. Check your connection.';

    return Promise.reject(new Error(message));
  },
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts a plain object to URL-encoded form string for POST bodies */
export function toFormData(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export default client;
