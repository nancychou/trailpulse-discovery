
import React, { useCallback, useRef, useState } from 'react';
import { FilterState } from '../types';
import { SURFACE_OPTIONS } from '../constants';

// ─── Dual Range Slider (extracted as standalone component) ─────────────

interface DualRangeSliderProps {
  label: string;
  filterKey: keyof FilterState;
  min: number;
  max: number;
  step: number;
  displaySuffix?: string;
  currentRange: [number, number];
  onChange: (key: keyof FilterState, index: number, value: number) => void;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = React.memo(({
  label,
  filterKey,
  min,
  max,
  step,
  displaySuffix = "",
  currentRange,
  onChange,
}) => {
  const leftPercent = ((currentRange[0] - min) / (max - min)) * 100;
  const rightPercent = ((currentRange[1] - min) / (max - min)) * 100;
  const midPercent = (leftPercent + rightPercent) / 2;

  // Track which thumb is currently being dragged
  const [activeThumb, setActiveThumb] = useState<0 | 1 | null>(null);

  const formatValue = (val: number) => {
    if (filterKey === 'elevationRange') {
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val);
    }
    if (step >= 1) return Math.round(val);
    return val.toFixed(1);
  };

  const isMaxed = currentRange[1] >= max - step;

  // When both thumbs overlap, the min thumb should be on top in the left half
  // and the max thumb on top in the right half so you can always grab either one.
  const minZIndex = activeThumb === 0 ? 30 : (midPercent > 50 ? 20 : 10);
  const maxZIndex = activeThumb === 1 ? 30 : (midPercent <= 50 ? 20 : 10);

  return (
    <div className="mb-12 px-1">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#172D3D] opacity-50">{label}</h3>
        <span className="text-[13px] font-bold text-primary tracking-tight">
          {formatValue(currentRange[0])} - {formatValue(currentRange[1])}{isMaxed ? '+' : ''}{displaySuffix}
        </span>
      </div>

      <div className="range-slider-container relative h-5">
        {/* Background Track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-[5px] bg-slate-100 rounded-full"></div>

        {/* Active Highlight Track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[5px] bg-primary rounded-full"
          style={{
            left: `${leftPercent}%`,
            width: `${rightPercent - leftPercent}%`
          }}
        ></div>

        {/* Min Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentRange[0]}
          onPointerDown={() => setActiveThumb(0)}
          onPointerUp={() => setActiveThumb(null)}
          onInput={(e) => {
            const val = parseFloat(e.currentTarget.value);
            onChange(filterKey, 0, val);
          }}
          className="range-thumb-input"
          style={{ zIndex: minZIndex }}
        />

        {/* Max Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentRange[1]}
          onPointerDown={() => setActiveThumb(1)}
          onPointerUp={() => setActiveThumb(null)}
          onInput={(e) => {
            const val = parseFloat(e.currentTarget.value);
            onChange(filterKey, 1, val);
          }}
          className="range-thumb-input"
          style={{ zIndex: maxZIndex }}
        />
      </div>
    </div>
  );
});

// ─── Sidebar Component ─────────────────────────────────────────────────

interface SidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

const Sidebar: React.FC<SidebarProps> = ({ filters, setFilters }) => {
  const toggleSelection = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const handleRangeChange = useCallback((key: keyof FilterState, index: number, value: number) => {
    setFilters(prev => {
      const range = [...(prev[key] as [number, number])] as [number, number];

      if (index === 0) {
        range[0] = Math.min(value, range[1]);
      } else {
        range[1] = Math.max(value, range[0]);
      }

      return { ...prev, [key]: range };
    });
  }, [setFilters]);

  const resetFilters = () => {
    setFilters({
      difficultyRange: [0, 10],
      distanceRange: [0, 40],
      elevationRange: [0, 10000],
      waterAvailability: [],
      surfaces: [],
      routeTypes: [],
      parkingTags: []
    });
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
      <div className="p-6 pt-10">

        <DualRangeSlider
          label="DIFFICULTY (1-10)"
          filterKey="difficultyRange"
          min={0} max={10} step={0.1}
          currentRange={filters.difficultyRange}
          onChange={handleRangeChange}
        />

        <DualRangeSlider
          label="DISTANCE (MI)"
          filterKey="distanceRange"
          min={0} max={40} step={0.5}
          currentRange={filters.distanceRange}
          onChange={handleRangeChange}
        />

        <DualRangeSlider
          label="ELEVATION (FT)"
          filterKey="elevationRange"
          min={0} max={10000} step={100}
          currentRange={filters.elevationRange}
          onChange={handleRangeChange}
        />

        <div className="mt-8 space-y-10 pb-10">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-5">Water Availability</h3>
            <div className="space-y-3">
              {['Natural Lake', 'Creek/River', 'Campground'].map(option => (
                <label key={option} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.waterAvailability.includes(option)}
                    onChange={() => toggleSelection('waterAvailability', option)}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-transparent focus:ring-0 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-5">Route Type</h3>
            <div className="flex flex-wrap gap-2">
              {['roundtrip', 'one-way', 'of trails'].map(type => {
                const isActive = filters.routeTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleSelection('routeTypes', type)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-5">Surface</h3>
            <div className="flex flex-wrap gap-2">
              {SURFACE_OPTIONS.map(surface => {
                const isActive = filters.surfaces.includes(surface);
                return (
                  <button
                    key={surface}
                    onClick={() => toggleSelection('surfaces', surface)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${isActive ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {surface}
                  </button>
                );
              })}
            </div>
          </div>


          <button
            onClick={resetFilters}
            className="w-full py-3 bg-slate-50 text-navy font-bold text-xs uppercase tracking-widest rounded-lg transition-all hover:bg-slate-100 active:scale-[0.98] mt-4"
          >
            Reset All Filters
          </button>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
