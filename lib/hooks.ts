import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTrails, fetchTrailsInBounds, fetchGroupRuns } from './api';
import type { GroupRun } from './api';
import type { Trail, MapBounds } from '../types';
import { INITIAL_TRAILS, INITIAL_RACES } from '../constants';

const WS_URL = import.meta.env.VITE_API_URL?.replace(/^http/, 'ws') + '/ws';

/**
 * Hook to fetch trails from the API with automatic fallback to local constants.
 * Subscribes to WebSocket hazard events for real-time updates.
 */
export function useTrails() {
    const [trails, setTrails] = useState<Trail[]>(INITIAL_TRAILS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTrails();
            if (data.length > 0) {
                setTrails(data);
            } else {
                setTrails(INITIAL_TRAILS);
            }
        } catch (err: any) {
            console.warn('API fetch failed, using local data:', err.message);
            setError(err.message);
            setTrails(INITIAL_TRAILS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();

        // WebSocket subscription for hazard updates
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'hazard_created') {
                    load(); // Refresh trails to include new hazard
                }
            } catch { /* ignore parse errors */ }
        };
        ws.onerror = () => console.warn('WebSocket connection error');

        return () => ws.close();
    }, [load]);

    return { trails, loading, error, refetch: load };
}

/**
 * Hook to fetch trails within map bounds using spatial search.
 * Debounces requests by 300ms to avoid overwhelming the API during pan/zoom.
 */
export function useTrailsInBounds(bounds: MapBounds | null) {
    const [trails, setTrails] = useState<Trail[]>([]);
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
            } catch (err: any) {
                console.warn('Spatial query failed:', err.message);
                setError(err.message);
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

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const data = await fetchGroupRuns();
                if (mounted) setGroupRuns(data);
            } catch (err: any) {
                console.warn('Failed to fetch group runs:', err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        // WebSocket subscription for real-time group run updates
        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'group_run_created' && mounted) {
                    setGroupRuns(prev => [msg.data as GroupRun, ...prev]);
                }
            } catch { /* ignore parse errors */ }
        };

        return () => {
            mounted = false;
            ws.close();
        };
    }, []);

    return { groupRuns, loading };
}

/**
 * Races are kept as local constants since they don't change.
 */
export function useRaces() {
    return { races: INITIAL_RACES, loading: false, error: null };
}
