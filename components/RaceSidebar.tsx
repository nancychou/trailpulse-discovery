
import React from 'react';
import { RaceFilterState } from '../types';
import { INITIAL_RACES } from '../constants';

interface RaceSidebarProps {
  filters: RaceFilterState;
  setFilters: React.Dispatch<React.SetStateAction<RaceFilterState>>;
}

const RaceSidebar: React.FC<RaceSidebarProps> = ({ filters, setFilters }) => {
  const toggleQualifier = (val: string) => {
    setFilters(prev => ({
      ...prev,
      qualifiers: prev.qualifiers.includes(val) 
        ? prev.qualifiers.filter(v => v !== val) 
        : [...prev.qualifiers, val]
    }));
  };

  const countries = Array.from(new Set(INITIAL_RACES.map(r => r.country))).sort();

  const handleDistanceChange = (index: number, val: string) => {
    const num = val === '' ? null : parseFloat(val);
    setFilters(prev => {
      const newRange = [...prev.distanceRange] as [number | null, number | null];
      newRange[index] = num;
      return { ...prev, distanceRange: newRange };
    });
  };

  const resetAll = () => {
    setFilters({
      location: 'All Locations',
      distanceRange: [null, null],
      qualifiers: [],
      difficulty: null,
      showSavedOnly: false
    });
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
      <div className="p-6">
        <div className="mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Discovery</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setFilters(prev => ({ ...prev, showSavedOnly: false }))}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all border-l-4 ${
                !filters.showSavedOnly 
                ? 'bg-primary/10 text-primary border-primary' 
                : 'text-navy opacity-60 hover:bg-slate-50 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              Race Calendar
            </button>
            <button 
              onClick={() => setFilters(prev => ({ ...prev, showSavedOnly: true }))}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all border-l-4 ${
                filters.showSavedOnly 
                ? 'bg-primary/10 text-primary border-primary' 
                : 'text-navy opacity-60 hover:bg-slate-50 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">bookmark</span>
              My Planning
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Filter By</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-navy mb-2">Countries/States</label>
              <select 
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full bg-slate-50 border-none rounded-lg p-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              >
                <option value="All Locations">All Locations</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-navy mb-2">Distance (km)</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  placeholder="Min" 
                  value={filters.distanceRange[0] ?? ''}
                  onChange={(e) => handleDistanceChange(0, e.target.value)}
                  className="w-1/2 bg-slate-50 border-none rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-primary/20" 
                />
                <input 
                  type="number"
                  placeholder="Max" 
                  value={filters.distanceRange[1] ?? ''}
                  onChange={(e) => handleDistanceChange(1, e.target.value)}
                  className="w-1/2 bg-slate-50 border-none rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-primary/20" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy mb-3">Qualifiers</label>
              <div className="space-y-2">
                {['UTMB Index / Stones', 'Western States (WSER)', 'Hardrock 100'].map(q => (
                  <label key={q} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={filters.qualifiers.includes(q)}
                      onChange={() => toggleQualifier(q)}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-navy opacity-70 group-hover:opacity-100">{q}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy mb-3">Difficulty (Rank)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button 
                    key={n}
                    onClick={() => setFilters(prev => ({ ...prev, difficulty: prev.difficulty === n ? null : n }))}
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                      filters.difficulty === n ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-50 text-navy hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={resetAll}
          className="w-full py-4 bg-navy text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:brightness-110 active:scale-95 mt-4"
        >
          Reset All Filters
        </button>
      </div>
    </aside>
  );
};

export default RaceSidebar;
