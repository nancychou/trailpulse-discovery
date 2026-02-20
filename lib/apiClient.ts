/**
 * Shared API client utilities.
 * Single source of truth for auth headers and fetch wrapper —
 * imported by both api.ts and auth.ts to avoid duplication.
 */

export const API_URL = import.meta.env.VITE_API_URL as string;

export function authHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
            ...options.headers,
        },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `API error ${res.status}`);
    }
    return res.json();
}
