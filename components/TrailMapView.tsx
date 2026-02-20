
import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Trail, MapBounds } from '../types';

interface TrailMapViewProps {
    trails: Trail[];
    loading: boolean;
    onBoundsChange: (bounds: MapBounds) => void;
    onTrailClick: (trail: Trail) => void;
    activeTrailId: string | null;
}

// Difficulty-based marker color
function getDifficultyColor(difficulty: number | null): string {
    if (difficulty === null) return '#94a3b8'; // slate-400
    if (difficulty <= 3) return '#22c55e';     // green
    if (difficulty <= 5) return '#eab308';     // yellow
    if (difficulty <= 7) return '#f97316';     // orange
    return '#ef4444';                          // red
}

function createMarkerIcon(difficulty: number | null, isActive: boolean): L.DivIcon {
    const color = getDifficultyColor(difficulty);
    const size = isActive ? 18 : 12;
    const border = isActive ? '3px solid #172D3D' : '2px solid white';
    const shadow = isActive
        ? '0 0 0 4px rgba(0,145,63,0.25), 0 2px 8px rgba(0,0,0,0.3)'
        : '0 2px 6px rgba(0,0,0,0.3)';

    return L.divIcon({
        className: 'trail-marker-icon',
        html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      border: ${border};
      box-shadow: ${shadow};
      transition: all 0.2s ease;
    "></div>`,
        iconSize: [size + 6, size + 6],
        iconAnchor: [(size + 6) / 2, (size + 6) / 2],
        popupAnchor: [0, -(size + 6) / 2],
    });
}

const TrailMapView: React.FC<TrailMapViewProps> = ({
    trails,
    loading,
    onBoundsChange,
    onTrailClick,
    activeTrailId,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const initialBoundsEmitted = useRef(false);

    // Emit bounds on map move/zoom
    const emitBounds = useCallback(() => {
        if (!mapRef.current) return;
        const b = mapRef.current.getBounds();
        onBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
        });
    }, [onBoundsChange]);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [47.5, -121.5], // Washington state center
            zoom: 9,
            zoomControl: false,
        });

        // Add zoom controls to bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // OpenStreetMap tiles — beautiful outdoor style
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapRef.current = map;

        // Emit initial bounds after map loads
        map.whenReady(() => {
            if (!initialBoundsEmitted.current) {
                emitBounds();
                initialBoundsEmitted.current = true;
            }
        });

        // Emit on move/zoom
        map.on('moveend', emitBounds);
        map.on('zoomend', emitBounds);

        return () => {
            map.off('moveend', emitBounds);
            map.off('zoomend', emitBounds);
            map.remove();
            mapRef.current = null;
            markersLayerRef.current = null;
            initialBoundsEmitted.current = false;
        };
    }, [emitBounds]);

    // Update markers when trails change
    useEffect(() => {
        const layer = markersLayerRef.current;
        if (!layer) return;

        layer.clearLayers();

        trails.forEach(trail => {
            if (trail.trailheadLat == null || trail.trailheadLng == null) return;

            const isActive = trail.id === activeTrailId;
            const icon = createMarkerIcon(trail.difficulty, isActive);

            const marker = L.marker([trail.trailheadLat, trail.trailheadLng], { icon });

            // Rich popup content
            const diffColor = getDifficultyColor(trail.difficulty);
            const popupHtml = `
        <div style="font-family: 'Lexend', sans-serif; min-width: 200px; padding: 4px 0;">
          <div style="font-weight: 800; font-size: 14px; color: #172D3D; margin-bottom: 6px; line-height: 1.3;">
            ${trail.name}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="
              display: inline-block; padding: 2px 8px; border-radius: 12px;
              font-size: 10px; font-weight: 700; color: white;
              background: ${diffColor};
            ">${trail.calculatedDifficulty || 'Unrated'}</span>
            ${trail.rating != null ? `<span style="font-size: 11px; color: #94a3b8; font-weight: 600;">★ ${trail.rating.toFixed(1)}</span>` : ''}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 11px; color: #64748b; font-weight: 500;">
            <div>📏 ${trail.distance ?? '—'} mi</div>
            <div>⛰️ ${trail.elevation?.toLocaleString() ?? '—'} ft</div>
            <div>🪨 ${trail.surface ?? '—'}</div>
            <div>🔄 ${trail.routeType ?? '—'}</div>
          </div>
          <div style="margin-top: 10px; text-align: center;">
            <button onclick="window.__trailMapClick__('${trail.id}')" style="
              background: #00913F; color: white; border: none; border-radius: 8px;
              padding: 6px 16px; font-size: 11px; font-weight: 700; font-family: 'Lexend', sans-serif;
              cursor: pointer; letter-spacing: 0.5px;
            ">View Details</button>
          </div>
        </div>
      `;

            marker.bindPopup(popupHtml, {
                maxWidth: 280,
                className: 'trail-popup',
            });

            marker.addTo(layer);
        });
    }, [trails, activeTrailId]);

    // Register global click handler for popup buttons
    useEffect(() => {
        (window as any).__trailMapClick__ = (trailId: string) => {
            const trail = trails.find(t => t.id === trailId);
            if (trail) onTrailClick(trail);
        };
        return () => {
            delete (window as any).__trailMapClick__;
        };
    }, [trails, onTrailClick]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }} />

            {/* Loading overlay */}
            {loading && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-lg border border-slate-100 flex items-center gap-2.5">
                        <span className="material-icons text-primary text-lg animate-spin">sync</span>
                        <span className="text-xs font-bold text-navy uppercase tracking-widest">Searching area...</span>
                    </div>
                </div>
            )}

            {/* Trail count badge */}
            <div className="absolute top-4 right-4 z-[1000]">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-slate-100">
                    <span className="text-xs font-bold text-navy">
                        <span className="text-primary font-extrabold">{trails.length}</span> trails in view
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-8 left-4 z-[1000]">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-slate-100">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Difficulty</div>
                    <div className="flex items-center gap-3">
                        {[
                            { label: 'Easy', color: '#22c55e' },
                            { label: 'Moderate', color: '#eab308' },
                            { label: 'Hard', color: '#f97316' },
                            { label: 'Expert', color: '#ef4444' },
                        ].map(({ label, color }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                                <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(TrailMapView);
