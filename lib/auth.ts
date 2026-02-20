import type { UserProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Helper ──────────────────────────────────────────────────
function authHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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

// ─── Auth Functions ─────────────────────────────────────────
interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string };
}

export async function signUp(email: string, password: string, displayName: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return data;
}

export async function signOut(): Promise<void> {
    try {
        await apiFetch('/api/auth/signout', { method: 'POST' });
    } finally {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}

export async function getMe(): Promise<{ id: string; email: string } | null> {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
        const data = await apiFetch<{ user: { id: string; email: string } }>('/api/auth/me');
        return data.user;
    } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return null;
    }
}

// ─── Profile Functions ──────────────────────────────────────

export async function fetchProfile(): Promise<UserProfile | null> {
    try {
        return await apiFetch<UserProfile>('/api/profiles/me');
    } catch {
        return null;
    }
}

export async function updateProfile(updates: {
    display_name?: string;
    gender?: string;
    bio?: string;
    avatar_url?: string;
}): Promise<UserProfile> {
    return apiFetch<UserProfile>('/api/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}

// ─── Avatar Upload ──────────────────────────────────────────

export async function uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API_URL}/api/upload/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.avatarUrl;
}

// ─── Saved Races Helpers ────────────────────────────────────

export async function addSavedRace(raceId: string): Promise<string[]> {
    const data = await apiFetch<{ savedRaceIds: string[] }>(
        `/api/profiles/me/saved-races/${raceId}`,
        { method: 'POST' }
    );
    return data.savedRaceIds;
}

export async function removeSavedRace(raceId: string): Promise<string[]> {
    const data = await apiFetch<{ savedRaceIds: string[] }>(
        `/api/profiles/me/saved-races/${raceId}`,
        { method: 'DELETE' }
    );
    return data.savedRaceIds;
}
