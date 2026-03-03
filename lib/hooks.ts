import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTrailsList, fetchTrailsInBounds, fetchTrailById, fetchGroupRuns, fetchRaces } from './api';
import type { GroupRun } from './api';
import type { Trail, TrailListItem, MapBounds, Race } from '../types';
import { INITIAL_TRAILS, INITIAL_RACES } from '../constants';

const WS_URL = import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') + '/ws';

// ─── WebSocket with auto-reconnect ───────────────────────────
const WS_MAX_RETRIES = 8;
const WS_BASE_DELAY_MS = 1000; // 1s → 2s → 4s … up to ~128s

/**
 * Returns a cleanup function that permanently stops reconnection.
 * Calls `onMessage` whenever a JSON message arrives matching the expected shape.
 */
function connectWebSocket(
    onMessage: (msg: { type: string; data?: unknown }) => void,
): () => void {
    let ws: WebSocket | null = null;
    let attempt = 0;
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
        if (stopped) return;

        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            attempt = 0; // reset backoff on successful connection
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string);
                onMessage(msg);
            } catch { /* ignore malformed frames */ }
        };

        ws.onerror = () => {
            // onerror is always followed by onclose — let onclose handle retry
        };

        ws.onclose = () => {
            if (stopped) return;
            if (attempt >= WS_MAX_RETRIES) {
                console.warn('[WS] Max reconnect attempts reached. Giving up.');
                return;
            }
            const delay = WS_BASE_DELAY_MS * Math.pow(2, attempt);
            attempt++;
            console.info(`[WS] Reconnecting in ${delay}ms (attempt ${attempt}/${WS_MAX_RETRIES})`);
            retryTimer = setTimeout(connect, delay);
        };
    }

    connect();

    return () => {
        stopped = true;
        if (retryTimer) clearTimeout(retryTimer);
        ws?.close();
    };
}

/**
 * Hook to fetch the lightweight trail list from the API.
 * Subscribes to WebSocket hazard events for real-time updates.
 */
export function useTrails() {
    const [trails, setTrails] = useState<TrailListItem[]>(INITIAL_TRAILS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTrailsList();
            if (data.length > 0) {
                setTrails(data);
            } else {
                setTrails(INITIAL_TRAILS);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.warn('API fetch failed, using local data:', message);
            setError(message);
            setTrails(INITIAL_TRAILS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();

        const cleanup = connectWebSocket((msg) => {
            if (msg.type === 'hazard_created') {
                load(); // Refresh trails to include the new hazard
            }
        });

        return cleanup;
    }, [load]);

    return { trails, loading, error, refetch: load };
}

/**
 * Hook to fetch a single trail's full detail (hazards + reviews) on demand.
 */
export function useTrailDetail(trailId: string | null) {
    const [trail, setTrail] = useState<Trail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!trailId) {
            setTrail(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchTrailById(trailId)
            .then((data) => {
                if (!cancelled) setTrail(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    console.warn('Failed to fetch trail detail:', message);
                    setError(message);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [trailId]);

    return { trail, loading, error };
}

/**
 * Hook to fetch trails within map bounds using spatial search.
 * Debounces requests by 300ms to avoid overwhelming the API during pan/zoom.
 */
export function useTrailsInBounds(bounds: MapBounds | null) {
    const [trails, setTrails] = useState<TrailListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!bounds) {
            setTrails([]);
            return;
        }

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchTrailsInBounds(bounds);
                setTrails(data);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.warn('Spatial query failed:', message);
                setError(message);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [bounds?.north, bounds?.south, bounds?.east, bounds?.west]);

    return { trails, loading, error };
}

/**
 * Hook to fetch group runs with WebSocket real-time subscription.
 */
export function useGroupRuns() {
    const [groupRuns, setGroupRuns] = useState<GroupRun[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await fetchGroupRuns();
            setGroupRuns(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.warn('Failed to fetch group runs:', message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        load();

        const cleanup = connectWebSocket((msg) => {
            if (msg.type === 'group_run_created' && mounted) {
                setGroupRuns(prev => [msg.data as GroupRun, ...prev]);
            }
        });

        return () => {
            mounted = false;
            cleanup();
        };
    }, [load]);

    return { groupRuns, loading, refetch: load };
}

/**
 * Races are kept as local constants since they don't change.
 */
export function useRaces() {
    const [races, setRaces] = useState<Race[]>(INITIAL_RACES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRaces()
            .then((data) => {
                if (data.length > 0) setRaces(data);
            })
            .catch(() => {
                // Fall back to hardcoded data
            })
            .finally(() => setLoading(false));
    }, []);

    return { races, loading, error: null };
}
