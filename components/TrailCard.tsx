
import React from 'react';
import { TrailListItem } from '../types';

interface TrailCardProps {
  trail: TrailListItem;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const TrailCard: React.FC<TrailCardProps> = ({ trail, isActive, onMouseEnter, onMouseLeave, onClick }) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`bg-white border-2 rounded-[2rem] overflow-hidden transition-all duration-300 cursor-pointer group relative ${isActive
          ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 scale-[1.01] z-10'
          : 'border-transparent shadow-sm'
        }`}
    >
      <div className="flex flex-col md:flex-row h-auto md:h-44">
        <div className="w-full md:w-1/3 h-48 md:h-full relative overflow-hidden">
          <img
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            alt={trail.name}
            src={trail.imageUrl ?? undefined}
            loading="lazy"
          />
          {/* Overlay gradient for depth */}
          <div className={`absolute inset-0 bg-gradient-to-r from-black/20 to-transparent transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className={`font-black text-xl leading-tight transition-colors duration-300 ${isActive ? 'text-primary' : 'text-navy group-hover:text-primary'
                }`}>
                {trail.name}
              </h3>
              <div className="flex flex-col items-end">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Difficulty</div>
                <div className={`text-3xl font-black leading-none transition-colors duration-500 ${isActive ? 'text-primary' : 'text-slate-200'
                  }`}>
                  {trail.difficulty != null ? trail.difficulty.toFixed(1) : '—'}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <span className="material-icons text-[14px]">landscape</span> {trail.calculatedDifficulty || 'Unrated'}
              {trail.rating != null && <><span className="material-icons text-[12px] text-[#FFB04B] ml-2">star</span> {trail.rating.toFixed(1)}</>}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-slate-50 pt-5 mt-4 md:mt-0">
            <div className="flex items-center gap-2.5">
              <span className="material-icons text-slate-300 text-[18px]">straighten</span>
              <span className="text-[11px] font-bold text-navy/70">{trail.distance ?? '—'} mi / {trail.elevation?.toLocaleString() ?? '—'} ft</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="material-icons text-slate-300 text-[18px]">terrain</span>
              <span className="text-[11px] font-bold text-navy/70">{trail.surface}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="material-icons text-slate-300 text-[18px]">
                {trail.routeType === 'Loop' ? 'repeat' : trail.routeType === 'Out-and-back' ? 'sync_alt' : 'trending_flat'}
              </span>
              <span className="text-[11px] font-bold text-navy/70">{trail.routeType}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`material-icons text-[18px] transition-colors ${isActive ? 'text-primary' : 'text-slate-200'}`}>water_drop</span>
              <span className="text-[11px] font-bold text-navy/70">{trail.waterSource}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TrailCard);
