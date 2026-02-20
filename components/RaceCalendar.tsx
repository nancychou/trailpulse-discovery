
import React, { useState, useMemo } from 'react';
import { Race } from '../types';
import RaceCard from './RaceCard';

interface RaceCalendarProps {
  races: Race[];
  onDetails: (race: Race) => void;
  // Added savedRaceIds and onToggleSave to match RaceCard requirements
  savedRaceIds: Set<string>;
  onToggleSave: (raceId: string) => void;
}

const RaceCalendar: React.FC<RaceCalendarProps> = ({ races, onDetails, savedRaceIds, onToggleSave }) => {
  // Use August 2026 as initial display month since many major races are there
  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); 
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    
    // Fill leading empty slots for the grid
    const firstDayIndex = date.getDay();
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Fill days of the month
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
    setSelectedDate(null);
  };

  const getRacesForDate = (date: Date) => {
    return races.filter(race => {
      // Parse date string like "Aug 24, 2026 • Monday"
      const raceDateStr = race.date.split(' • ')[0];
      const raceDate = new Date(raceDateStr);
      return (
        raceDate.getDate() === date.getDate() &&
        raceDate.getMonth() === date.getMonth() &&
        raceDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const racesOnSelectedDate = selectedDate ? getRacesForDate(selectedDate) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-navy leading-none">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              Showing filtered results
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => changeMonth(-1)}
              className="w-12 h-12 rounded-2xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <span className="material-icons text-navy">chevron_left</span>
            </button>
            <button 
              onClick={() => changeMonth(1)}
              className="w-12 h-12 rounded-2xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <span className="material-icons text-navy">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
          
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="h-24" />;
            
            const dayRaces = getRacesForDate(date);
            const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
            const hasRaces = dayRaces.length > 0;

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`h-24 rounded-3xl p-3 flex flex-col items-center justify-between transition-all relative border-2 ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : hasRaces 
                      ? 'border-slate-50 bg-slate-50/50 hover:bg-slate-50' 
                      : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-navy'}`}>
                  {date.getDate()}
                </span>
                
                {hasRaces && (
                  <div className="flex flex-col gap-1 w-full items-center">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {dayRaces.slice(0, 3).map(r => (
                        <div key={r.id} className="w-4 h-4 rounded-full border border-white bg-primary overflow-hidden">
                           <img src={r.imageUrl} className="w-full h-full object-cover grayscale brightness-125" alt="" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[8px] font-black text-primary uppercase">
                      {dayRaces.length} {dayRaces.length === 1 ? 'Race' : 'Races'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-icons text-primary">event_available</span>
            <h3 className="text-xl font-black text-navy">
              Races on {months[selectedDate.getMonth()]} {selectedDate.getDate()}
            </h3>
          </div>
          
          {racesOnSelectedDate.length > 0 ? (
            <div className="space-y-6">
              {racesOnSelectedDate.map(race => (
                // Fixed: Added missing properties isSaved and onToggleSave to RaceCard based on line 156 error
                <RaceCard 
                  key={race.id} 
                  race={race} 
                  onDetails={onDetails} 
                  isSaved={savedRaceIds.has(race.id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100">
              <span className="material-icons text-4xl text-slate-100 mb-2">hotel_class</span>
              <p className="text-slate-400 font-bold">No races scheduled for this day.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RaceCalendar;
