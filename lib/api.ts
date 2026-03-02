import type { Trail, TrailListItem, MapBounds } from '../types';
import { apiFetch } from './apiClient';

// ─── Trails ──────────────────────────────────────────────────

/** Lightweight list: core fields only, no hazards/reviews. */
export async function fetchTrailsList(): Promise<TrailListItem[]> {
    return apiFetch<TrailListItem[]>('/api/trails/list');
}

/** Full trail detail with hazards and reviews (for detail drawer). */
export async function fetchTrailById(trailId: string): Promise<Trail> {
    return apiFetch<Trail>(`/api/trails/${encodeURIComponent(trailId)}`);
}

/** Legacy: fetch all trails with hazards/reviews. */
export async function fetchTrails(): Promise<Trail[]> {
    return apiFetch<Trail[]>('/api/trails');
}

export async function fetchTrailsInBounds(bounds: MapBounds): Promise<TrailListItem[]> {
    const params = new URLSearchParams({
        south: String(bounds.south),
        west: String(bounds.west),
        north: String(bounds.north),
        east: String(bounds.east),
    });
    return apiFetch<TrailListItem[]>(`/api/trails/bounds?${params}`);
}

// ─── Group Runs ──────────────────────────────────────────────
export interface GroupRun {
    id: string;
    trailId: string | null;
    name: string;
    time: string;
    type: string;
    color: string;
    avatarUrl: string;
    createdAt: string;
}

export async function fetchGroupRuns(): Promise<GroupRun[]> {
    return apiFetch<GroupRun[]>('/api/group-runs');
}

export async function createGroupRun(payload: {
    trail_id: string;
    name: string;
    time: string;
    type: string;
    color?: string;
}): Promise<GroupRun> {
    return apiFetch<GroupRun>('/api/group-runs', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

// ─── Hazards ─────────────────────────────────────────────────
export async function createHazardReport(payload: {
    trail_id: string;
    type: string;
    message: string;
}): Promise<void> {
    await apiFetch('/api/hazards', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
