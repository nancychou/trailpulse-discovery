
import { Trail } from '../types';
import React, { useState } from 'react';
import { SURFACE_OPTIONS } from '../constants';

interface TrailDetailDrawerProps {
  trail: Trail | null;
  loading?: boolean;
  onClose: () => void;
}

type ModalType = 'water' | 'surface' | 'cell' | 'hazard' | null;

const TrailDetailDrawer: React.FC<TrailDetailDrawerProps> = ({ trail, loading, onClose }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-[2rem] p-12 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
          <span className="material-icons text-5xl text-primary animate-spin">sync</span>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading trail details...</p>
        </div>
      </div>
    );
  }

  if (!trail) return null;

  const toggleSurface = (surface: string) => {
    setSelectedSurfaces(prev =>
      prev.includes(surface)
        ? prev.filter(s => s !== surface)
        : [...prev, surface]
    );
  };

  const handleOpenModal = (type: ModalType) => {
    if (type === 'surface') {
      setSelectedSurfaces([]);
    }
    setActiveModal(type);
  };

  const handleSubmitReport = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setActiveModal(null);
      // In a real app, we would update the state here
    }, 1500);
  };

  const ModalWrapper = ({ title, children, onConfirm, confirmText = "Submit Report" }: { title: string, children?: React.ReactNode, onConfirm: () => void, confirmText?: string }) => (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => !isSubmitting && setActiveModal(null)} />
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            {title === "Report New Hazard" && <span className="material-icons text-[#FF4B4B] animate-pulse">report_problem</span>}
            <h3 className="text-2xl font-black text-navy">{title}</h3>
          </div>
          <button onClick={() => !isSubmitting && setActiveModal(null)} className="text-slate-300 hover:text-navy transition-colors">
            <span className="material-icons">close</span>
          </button>
        </div>
        {children}
        <div className="mt-10 flex gap-4">
          <button
            disabled={isSubmitting}
            onClick={() => setActiveModal(null)}
            className="flex-1 py-4 bg-slate-50 text-navy font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`flex-1 py-4 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${title === "Report New Hazard"
              ? 'bg-[#FF4B4B] text-white shadow-[#FF4B4B]/20 hover:brightness-110'
              : 'bg-primary text-white shadow-primary/20 hover:brightness-110'
              }`}
          >
            {isSubmitting ? <span className="material-icons animate-spin text-sm">sync</span> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-navy/40 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl h-full bg-[#F8FAFB] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-500">

        {/* Hero Section */}
        <div className="relative h-[40vh] md:h-[50vh] shrink-0">
          <img src={trail.imageUrl} className="w-full h-full object-cover" alt={trail.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white text-navy flex items-center justify-center hover:bg-slate-50 transition-all shadow-xl active:scale-90 z-20"
          >
            <span className="material-icons">close</span>
          </button>

          <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">Top Rated</span>
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">{trail.calculatedDifficulty || 'Unrated'}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-lg">{trail.name}</h1>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/20 active:scale-95 transition-all">
                  <span className="material-icons text-sm">favorite</span>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
          <div className="grid grid-cols-12 gap-10">

            <div className="col-span-12 lg:col-span-8 space-y-10">

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Distance', value: `${trail.distance ?? '—'} mi`, icon: 'straighten', color: 'text-primary' },
                  { label: 'Elevation Gain', value: `${trail.elevation?.toLocaleString() ?? '—'} ft`, icon: 'terrain', color: 'text-primary' },
                  { label: 'Route Type', value: trail.routeType || '—', icon: 'repeat', color: 'text-primary' },
                  { label: 'Max Grade', value: trail.maxGradeP95 != null ? `${trail.maxGradeP95.toFixed(1)}%` : '—', icon: 'show_chart', color: 'text-primary' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`material-icons ${stat.color} text-[18px]`}>{stat.icon}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <p className="text-xl font-black text-navy">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Hazards Alert Box */}
              <div className="bg-[#FFF2F2] border border-[#FF4B4B]/10 rounded-[2.5rem] p-8 flex gap-6">
                <div className="w-14 h-14 bg-[#FF4B4B] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#FF4B4B]/20">
                  <span className="material-icons text-white">warning</span>
                </div>
                <div className="space-y-4 flex-1">
                  <h3 className="text-lg font-black text-[#FF4B4B]">Recent Hazards (Last 30 Days)</h3>
                  <div className="space-y-3">
                    {trail.hazards?.length ? trail.hazards.map((h, i) => (
                      <p key={i} className="text-sm font-bold text-navy/70 leading-relaxed">
                        <span className="font-black text-[#FF4B4B]">{h.type}:</span> {h.message}
                      </p>
                    )) : (
                      <p className="text-sm font-bold text-navy/70">No critical hazards reported recently.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button className="px-6 py-3 bg-[#FF4B4B] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-[#FF4B4B]/20 hover:brightness-110 active:scale-95 transition-all">
                      View Safety Protocol
                    </button>
                    <button
                      onClick={() => handleOpenModal('hazard')}
                      className="px-6 py-3 bg-white text-[#FF4B4B] border-2 border-[#FF4B4B] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#FF4B4B]/5 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <span className="material-icons text-sm">add_alert</span>
                      Report New Hazard
                    </button>
                  </div>
                </div>
              </div>

              {/* Logistics & Conditions */}
              <div className="space-y-8">
                <h2 className="text-2xl font-black text-navy">Conditions & Logistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Water Availability */}
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-primary">water_drop</span>
                        <h4 className="font-black text-navy">Water Availability</h4>
                      </div>
                      <button
                        onClick={() => handleOpenModal('water')}
                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                      >
                        Add
                      </button>
                    </div>
                    <ul className="space-y-3">
                      <li className="text-sm font-bold text-navy/60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Natural lake at mile 4
                      </li>
                      <li className="text-sm font-bold text-navy/60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Campground refill at mile 6
                      </li>
                    </ul>
                  </div>

                  {/* Surface Type */}
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-[#FFB04B]">terrain</span>
                        <h4 className="font-black text-navy">Surface Type</h4>
                      </div>
                      <button
                        onClick={() => handleOpenModal('surface')}
                        className="text-[10px] font-black text-[#FFB04B] uppercase tracking-widest hover:underline"
                      >
                        Report
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Dirt/Soil', 'Rooty', 'Rocky'].map(s => (
                        <span key={s} className="px-3 py-1 bg-slate-50 text-[10px] font-black text-navy/40 uppercase tracking-widest rounded-lg border border-slate-100">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Parking Status */}
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-navy opacity-40">local_parking</span>
                        <h4 className="font-black text-navy">Parking Status</h4>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-navy/60 leading-relaxed">
                      {trail.parkingStatus || 'Parking lot is limited. Arrive early.'}
                    </p>
                  </div>

                  {/* Cell Coverage */}
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-primary opacity-40">signal_cellular_alt</span>
                        <h4 className="font-black text-navy">Cell Coverage</h4>
                      </div>
                      <button
                        onClick={() => handleOpenModal('cell')}
                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                      >
                        Update
                      </button>
                    </div>
                    <p className="text-sm font-bold text-navy/60 leading-relaxed">
                      {trail.cellCoverage || 'Moderate coverage available near summits.'}
                    </p>
                  </div>
                </div>

                {/* Crowd Level */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <span className="material-icons text-primary">groups</span>
                      <h4 className="font-black text-navy">Crowd Level</h4>
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live</span>
                  </div>
                  <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="absolute h-full bg-[#00ED3F] rounded-full transition-all duration-1000"
                      style={{ width: `${trail.crowdLevel || 50}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-black text-navy/40 uppercase tracking-widest">
                    <span className="text-navy">Busy</span> (user reported 1h ago)
                  </p>
                </div>
              </div>

              {/* Trail Map Mock */}
              <div className="space-y-6 pb-20">
                <h2 className="text-2xl font-black text-navy">Trail Map</h2>
                <div className="rounded-[3rem] overflow-hidden relative aspect-[21/9] bg-slate-100 border border-slate-100">
                  <img src="https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/-120.65,47.59,12,0/1200x500?access_token=pk.eyJ1IjoiYm91bmRzbWVkaWEiLCJhIjoiY2t6Z2ZkZGdtMDBndzJ1bnowamVnYm5mciJ9.9RpxX2iK7Ym5E8R5R_5Q" className="w-full h-full object-cover grayscale opacity-60" alt="" />
                  <div className="absolute inset-0 bg-navy/10 pointer-events-none"></div>

                  {/* Controls */}
                  <div className="absolute top-6 right-6 flex flex-col gap-2">
                    <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-navy hover:bg-slate-50 transition-colors">
                      <span className="material-icons">add</span>
                    </button>
                    <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-navy hover:bg-slate-50 transition-colors">
                      <span className="material-icons">remove</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Columns */}
            <div className="col-span-12 lg:col-span-4 space-y-10">

              {/* Seasonality Info */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <span className="material-icons text-primary">calendar_month</span>
                  <h3 className="text-xl font-black text-navy">Seasonality Info</h3>
                </div>
                <div className="space-y-6">
                  {[
                    { season: 'Winter (Dec-March)', desc: 'Snow likely; crampons and trekking poles highly recommended.', color: 'bg-blue-400' },
                    { season: 'Spring (April-May)', desc: 'Muddy season; expect slippery sections in the basin.', color: 'bg-[#FFB04B]' },
                    { season: 'Summer/Fall (June-Oct)', desc: 'Prime hiking conditions. Wildflowers peak in late July.', color: 'bg-[#00ED3F]' }
                  ].map((s, i) => (
                    <div key={i} className="flex gap-4">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.color}`}></div>
                      <div>
                        <h4 className="text-xs font-black text-navy mb-1">{s.season}</h4>
                        <p className="text-[10px] font-bold text-navy/40 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Logs */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <span className="material-icons text-primary">forum</span>
                    <h3 className="text-xl font-black text-navy">Community Logs</h3>
                  </div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{trail.reviews?.length || 128} Reports</span>
                </div>

                <div className="space-y-8">
                  {trail.reviews?.map((r, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <img src={r.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                          <div>
                            <h4 className="text-xs font-black text-navy">{r.user}</h4>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{r.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-black text-[#FFB04B]">{r.rating.toFixed(1)}</span>
                          <span className="material-icons text-[#FFB04B] text-[12px]">star</span>
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-navy/60 leading-relaxed">
                        {r.text}
                      </p>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-10 py-4 border-2 border-primary text-primary font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary/5 transition-all active:scale-95">
                  Write a Report
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Modals */}
      {activeModal === 'water' && (
        <ModalWrapper title="Water Availability" onConfirm={handleSubmitReport}>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mile Marker</label>
              <input type="number" step="0.1" placeholder="e.g. 4.2" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Type of Water</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 appearance-none">
                <option>Natural Creek/Stream</option>
                <option>Natural Lake</option>
                <option>Aid Station / Spigot</option>
                <option>Campground Refill</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </ModalWrapper>
      )}

      {activeModal === 'surface' && (
        <ModalWrapper title="Report Surface Type" onConfirm={handleSubmitReport}>
          <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            {SURFACE_OPTIONS.map(surface => {
              const isSelected = selectedSurfaces.includes(surface);
              return (
                <button
                  key={surface}
                  className={`w-full text-left p-4 rounded-2xl text-xs font-black transition-all flex justify-between items-center border-2 ${isSelected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-50 bg-white text-navy hover:border-primary/20'
                    }`}
                  onClick={() => toggleSurface(surface)}
                >
                  {surface}
                  {isSelected && <span className="material-icons text-sm">check_circle</span>}
                </button>
              );
            })}
          </div>
        </ModalWrapper>
      )}

      {activeModal === 'cell' && (
        <ModalWrapper title="Cell Coverage Info" onConfirm={handleSubmitReport}>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Carrier Performance</label>
              <textarea
                placeholder="Describe coverage levels..."
                className="w-full h-32 bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 resize-none"
              ></textarea>
            </div>
          </div>
        </ModalWrapper>
      )}

      {activeModal === 'hazard' && (
        <ModalWrapper title="Report New Hazard" onConfirm={handleSubmitReport} confirmText="Submit Hazard Report">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hazard Type</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 appearance-none">
                <option>Wildlife Sighting</option>
                <option>Trail Damage / Washout</option>
                <option>Medical Emergency</option>
                <option>Extreme Weather Condition</option>
                <option>Downed Trees</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Description</label>
              <textarea
                placeholder="Details of the hazard, location markers, or advice for others..."
                className="w-full h-32 bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 resize-none"
              ></textarea>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Severity Level</label>
              <div className="flex gap-2">
                {['Low', 'Caution', 'Critical'].map(lvl => (
                  <button
                    key={lvl}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${lvl === 'Critical' ? 'border-[#FF4B4B] text-[#FF4B4B] hover:bg-[#FF4B4B] hover:text-white' : 'border-slate-100 text-slate-400 hover:border-navy hover:text-navy'
                      }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

export default TrailDetailDrawer;
