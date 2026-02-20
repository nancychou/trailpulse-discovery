
import React from 'react';
import { Race } from '../types';

interface RaceDetailDrawerProps {
  race: Race | null;
  onClose: () => void;
}

const RaceDetailDrawer: React.FC<RaceDetailDrawerProps> = ({ race, onClose }) => {
  if (!race) return null;

  // Clean elevation string for UI (removing redundant D+ which means gain)
  const displayElevation = race.elevation.replace(/\s?D\+$/, '');

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-navy/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-[500px] bg-white shadow-2xl flex flex-col overflow-y-auto custom-scrollbar z-50 animate-in slide-in-from-right duration-500">
        <div className="relative h-80 shrink-0">
          <img src={race.imageUrl} className="w-full h-full object-cover" alt={race.name} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80"></div>
          
          <button 
            onClick={onClose} 
            className="absolute top-6 left-6 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all border border-white/20 active:scale-90"
          >
            <span className="material-icons">close</span>
          </button>
          
          <div className="absolute bottom-10 px-10 w-full">
            <span className="bg-[#00ED3F] text-navy text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg shadow-[#00ED3F]/20">
              {race.type}
            </span>
            <h2 className="text-4xl font-black text-white leading-tight uppercase italic tracking-tighter drop-shadow-md">
              {race.name}
            </h2>
          </div>
        </div>

        <div className="p-10 space-y-10">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Distance</p>
              <p className="text-2xl font-black text-navy">{race.distance}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Elevation Gain</p>
              <p className="text-2xl font-black text-navy">{displayElevation}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-navy">Race Location</h3>
              <p className="text-sm font-bold text-slate-400 flex items-center gap-1">
                <span className="material-icons text-[16px]">location_on</span> {race.location}
              </p>
            </div>
            <div className="aspect-[16/10] bg-slate-100 rounded-[2.5rem] overflow-hidden relative border border-slate-100 shadow-inner">
              <img 
                src="https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/static/-122.42,37.78,12,0/800x450?access_token=pk.eyJ1IjoiYm91bmRzbWVkaWEiLCJhIjoiY2t6Z2ZkZGdtMDBndzJ1bnowamVnYm5mciJ9.9RpxX2iK7Ym5E8R5R_5Q" 
                className="w-full h-full object-cover grayscale opacity-40" 
                alt="Map" 
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/5">
                 <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-3">
                   <span className="material-icons text-primary text-3xl">map</span>
                 </div>
                 <span className="text-[11px] font-black text-navy uppercase tracking-widest opacity-40">View Interactive Course</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-navy mb-6">Event Details</h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100/50">
                <span className="material-icons text-primary">calendar_today</span>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                  <p className="text-sm font-bold text-navy">{race.date}</p>
                </div>
              </div>
              <div className="flex gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100/50">
                <span className="material-icons text-primary">verified</span>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualifiers</p>
                  <p className="text-sm font-bold text-navy">
                    {race.qualifiers.length > 0 ? race.qualifiers.join(', ') : 'No special qualifiers required'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-4 sticky bottom-0 bg-white pb-10">
            <button className="flex-1 py-5 bg-[#00ED3F] text-navy font-black text-sm uppercase tracking-widest rounded-[2rem] transition-all hover:brightness-110 active:scale-95 shadow-xl shadow-[#00ED3F]/20">
              Register for Race
            </button>
            <button className="w-16 h-16 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-navy transition-all active:scale-90">
              <span className="material-icons">bookmark_border</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RaceDetailDrawer;
