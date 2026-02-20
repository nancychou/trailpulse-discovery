
import React from 'react';
import { Race } from '../types';

interface RaceCardProps {
  race: Race;
  onDetails: (race: Race) => void;
  isSaved: boolean;
  onToggleSave: (raceId: string) => void;
}

const RaceCard: React.FC<RaceCardProps> = ({ race, onDetails, isSaved, onToggleSave }) => {
  // Clean elevation string for UI (removing redundant D+)
  const displayElevation = race.elevation.replace(/\s?D\+$/, '');
  
  // Use the actual race distance from the data
  const displayDistance = race.distance;

  return (
    <div className="bg-white border border-slate-50 rounded-[2rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full md:w-48 h-32 rounded-3xl overflow-hidden shrink-0">
          <img src={race.imageUrl} alt={race.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">{race.type}</span>
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <span className="material-icons text-[14px]">location_on</span> {race.location}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-navy mb-1 leading-tight">{race.name}</h3>
          <p className="text-xs font-bold text-slate-400">{race.date}</p>
        </div>

        <div className="hidden lg:flex items-center gap-8 px-6 border-x border-slate-50">
          <div className="text-center">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{displayDistance}</div>
            <div className="h-10 w-24 flex items-end gap-1 px-1">
              {[0.4, 0.7, 0.9, 0.5, 0.3, 0.8].map((h, i) => (
                <div key={i} className={`flex-1 rounded-t-sm ${i === 2 || i === 5 ? 'bg-primary' : 'bg-slate-100'}`} style={{ height: `${h * 100}%` }}></div>
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{displayElevation}</div>
            <div className="h-10 w-24 flex items-end gap-1 px-1">
               {[0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-slate-50" style={{ height: `${h * 100}%` }}></div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-center gap-1 min-w-[100px]">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Comm. Rank</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-black text-navy">{race.rating}</span>
            <span className="material-icons text-primary text-[18px]">star</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{race.reviewCount}</span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => onToggleSave(race.id)}
            className={`p-3 rounded-2xl border transition-all ${
              isSaved 
              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
              : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span className="material-icons">{isSaved ? 'bookmark' : 'bookmark_border'}</span>
          </button>
          <button 
            onClick={() => onDetails(race)}
            className="flex-1 md:flex-none px-8 py-4 bg-navy text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default RaceCard;
