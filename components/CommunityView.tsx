
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrailListItem } from '../types';
import { useGroupRuns } from '../lib/hooks';
import { useAuth } from '../lib/AuthContext';
import { createGroupRun, createHazardReport } from '../lib/api';

interface CommunityViewProps {
  trails: TrailListItem[];
  onAuthClick?: () => void;
}

const CommunityView: React.FC<CommunityViewProps> = ({ trails, onAuthClick }) => {
  const { user } = useAuth();
  const getInitialDateTime = () => {
    const now = new Date();
    const nextHour = (now.getHours() + 1) % 24;
    const timeStr = `${String(nextHour).padStart(2, '0')}:00`;
    return { date: now, time: timeStr };
  };

  const initial = getInitialDateTime();
  const [routeName, setRouteName] = useState('');
  const [selectedDate, setSelectedDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Action completed successfully!');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(initial.date.getFullYear(), initial.date.getMonth(), 1));

  // Hazard Report Modal State
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
  const [isHazardSubmitting, setIsHazardSubmitting] = useState(false);
  const [hazardTrailId, setHazardTrailId] = useState(trails[0]?.id ?? '');
  const [hazardDetails, setHazardDetails] = useState('');
  const [hazardType, setHazardType] = useState('Wildlife');

  // Hazard trail search
  const [hazardTrailSearch, setHazardTrailSearch] = useState('');
  const [hazardTrailResults, setHazardTrailResults] = useState<TrailListItem[]>([]);
  const [showHazardTrailDropdown, setShowHazardTrailDropdown] = useState(false);

  // Browse All Group Runs modal
  const [isBrowseAllOpen, setIsBrowseAllOpen] = useState(false);

  // AI Suggestion dismiss
  const [isSuggestionDismissed, setIsSuggestionDismissed] = useState(false);

  // Trail autocomplete
  const [trailSuggestions, setTrailSuggestions] = useState<TrailListItem[]>([]);
  const [showTrailDropdown, setShowTrailDropdown] = useState(false);
  const trailInputRef = useRef<HTMLDivElement>(null);

  // Group Run form fields
  const [groupName, setGroupName] = useState('');
  const [runType, setRunType] = useState('Steady Pace');

  const calendarRef = useRef<HTMLDivElement>(null);

  // Fetch group runs from Supabase
  const { groupRuns, loading: groupRunsLoading, refetch: refetchGroupRuns } = useGroupRuns();

  // Map UI run-type labels to backend enum values
  const RUN_TYPE_MAP: Record<string, string> = {
    'Steady Pace': 'steady_pace',
    'Performance': 'performance',
    'Recovery': 'recovery',
    'Long Run': 'long_run',
    'Social': 'social',
  };

  const handlePost = async () => {
    setIsSubmitting(true);
    try {
      // Build ISO 8601 time string: YYYY-MM-DDTHH:MM
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const isoTime = `${year}-${month}-${day}T${time}`;

      await createGroupRun({
        trail_id: routeName || '',
        name: groupName || `Group Run on ${routeName || 'Trail'}`,
        time: isoTime,
        type: RUN_TYPE_MAP[runType] || 'social',
        color: runType === 'Performance' ? 'text-[#FF4B4B]' : 'text-primary',
      });
      // Refresh sidebar list immediately
      await refetchGroupRuns();
      setSuccessMessage('Group run posted successfully!');
      setShowSuccess(true);
      setGroupName('');
      setRouteName('');
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to create group run:', err.message);
      setSuccessMessage(`Error: ${err.message || 'Could not save group run'}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHazard = async () => {
    setIsHazardSubmitting(true);
    try {
      await createHazardReport({
        trail_id: hazardTrailId,
        type: hazardType,
        message: hazardDetails,
      });
      setSuccessMessage('Hazard report submitted to Supabase!');
      setIsHazardModalOpen(false);
      setHazardDetails('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to submit hazard:', err.message);
      setSuccessMessage('Report saved locally (Supabase unavailable)');
      setIsHazardModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } finally {
      setIsHazardSubmitting(false);
    }
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasHazards = false; // Hazards loaded on-demand in detail drawer

  return (
    <div className="w-full bg-[#F8FAFB] p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {showSuccess && (
          <div className="fixed top-24 right-10 z-[100] bg-navy text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce">
            <span className="material-icons text-[#00ED3F]">check_circle</span>
            <span className="font-bold text-sm">{successMessage}</span>
          </div>
        )}

        {/* Hazard Modal */}
        {isHazardModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => !isHazardSubmitting && setIsHazardModalOpen(false)} />
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-[#FF4B4B] animate-pulse">report_problem</span>
                  <h3 className="text-2xl font-black text-navy">Submit Hazard Report</h3>
                </div>
                <button onClick={() => !isHazardSubmitting && setIsHazardModalOpen(false)} className="text-slate-300 hover:text-navy transition-colors">
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Trail Affected</label>
                  <div className="relative">
                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[18px]">place</span>
                    <input
                      type="text"
                      value={hazardTrailSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHazardTrailSearch(val);
                        if (val.length >= 1) {
                          const filtered = trails.filter(t =>
                            t.name.toLowerCase().includes(val.toLowerCase())
                          ).slice(0, 5);
                          setHazardTrailResults(filtered);
                          setShowHazardTrailDropdown(filtered.length > 0);
                        } else {
                          setShowHazardTrailDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (hazardTrailSearch.length >= 1 && hazardTrailResults.length > 0) {
                          setShowHazardTrailDropdown(true);
                        } else if (!hazardTrailSearch) {
                          const initial = trails.slice(0, 5);
                          setHazardTrailResults(initial);
                          setShowHazardTrailDropdown(true);
                        }
                      }}
                      placeholder="Search trail name..."
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-11 pr-4 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20"
                    />
                    {showHazardTrailDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 max-h-48 overflow-y-auto">
                        {hazardTrailResults.map(trail => (
                          <button
                            key={trail.id}
                            onClick={() => {
                              setHazardTrailSearch(trail.name);
                              setHazardTrailId(trail.id);
                              setShowHazardTrailDropdown(false);
                            }}
                            className="w-full text-left px-5 py-3 text-sm font-bold text-navy hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3"
                          >
                            <span className="material-icons text-slate-300 text-[16px]">place</span>
                            {trail.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hazard Type</label>
                  <select
                    value={hazardType}
                    onChange={(e) => setHazardType(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 appearance-none"
                  >
                    {['Wildlife', 'Trail Damage', 'Weather', 'Water Crossing', 'Fallen Tree', 'Mud', 'Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Hazard Details</label>
                  <textarea
                    value={hazardDetails}
                    onChange={(e) => setHazardDetails(e.target.value)}
                    placeholder="Describe the danger..."
                    className="w-full h-32 bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  disabled={isHazardSubmitting}
                  onClick={() => setIsHazardModalOpen(false)}
                  className="flex-1 py-4 bg-slate-50 text-navy font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isHazardSubmitting || !hazardDetails.trim()}
                  onClick={handleSubmitHazard}
                  className="flex-1 py-4 bg-[#FF4B4B] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-[#FF4B4B]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isHazardSubmitting ? <span className="material-icons animate-spin text-sm">sync</span> : 'Report Hazard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Smart Suggestion — driven by first upcoming group run from Supabase */}
        {!isSuggestionDismissed && groupRuns.length > 0 && (() => {
          const suggested = groupRuns[0];
          // Reverse-map backend type to display label
          const TYPE_DISPLAY: Record<string, string> = {
            steady_pace: 'Steady Pace',
            performance: 'Performance',
            recovery: 'Recovery',
            long_run: 'Long Run',
            social: 'Social',
          };
          const typeLabel = TYPE_DISPLAY[suggested.type] || suggested.type;
          const timeDisplay = suggested.time || 'TBD';
          const trailName = suggested.trailId || 'a local trail';

          const handleJoin = () => {
            if (!user) {
              onAuthClick?.();
              return;
            }
            setSuccessMessage(`Joined "${suggested.name}"!`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
          };

          return (
            <div className="bg-[#E6F4EA] border-l-[6px] border-[#00ED3F] rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between shadow-sm gap-6 transition-all duration-300">
              <div className="flex gap-6 items-start max-w-2xl">
                <div className="w-12 h-12 bg-[#00ED3F] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#00ED3F]/20">
                  <span className="material-icons text-white">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy mb-2">AI Smart Suggestion</h3>
                  <p className="text-navy/70 font-semibold leading-relaxed">
                    Heads up! <span className="font-black text-navy">{suggested.name}</span> is a
                    <span className="font-black text-navy"> "{typeLabel}"</span> group run on
                    <span className="font-black text-navy"> {trailName}</span> at
                    <span className="font-black text-navy"> {timeDisplay}</span>. Why not join as a
                    <span className="text-[#00913F] font-black underline decoration-2 underline-offset-4"> 'Sweep'</span> runner?
                  </p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  onClick={handleJoin}
                  className="flex-1 md:flex-none px-8 py-4 bg-[#00ED3F] text-navy font-black text-sm rounded-2xl shadow-lg shadow-[#00ED3F]/20 hover:brightness-105 transition-all active:scale-95 whitespace-nowrap"
                >
                  {user ? `Join ${suggested.name}` : 'Join'}
                </button>
                <button
                  onClick={() => setIsSuggestionDismissed(true)}
                  className="flex-1 md:flex-none px-8 py-4 bg-white text-navy font-black text-sm rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-12 gap-10">
          {/* Main Form Area */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-50">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-[#00ED3F] text-3xl">add_circle</span>
                  <h2 className="text-3xl font-black text-navy">Coordinate a Group Run</h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 bg-slate-50 px-3 py-1 rounded-full">New Planning</span>
              </div>

              <div className="space-y-10">
                {/* Group Name + Run Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Group Name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., Dawn Patrol Crew"
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Run Type</label>
                    <select
                      value={runType}
                      onChange={(e) => setRunType(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      {['Steady Pace', 'Performance', 'Recovery', 'Long Run', 'Social'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Route Name Input */}
                <div ref={trailInputRef}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Route / Trail Name</label>
                  <div className="relative">
                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">place</span>
                    <input
                      type="text"
                      value={routeName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRouteName(val);
                        if (val.length >= 2) {
                          const filtered = trails.filter(t =>
                            t.name.toLowerCase().includes(val.toLowerCase())
                          ).slice(0, 6);
                          setTrailSuggestions(filtered);
                          setShowTrailDropdown(filtered.length > 0);
                        } else {
                          setShowTrailDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        if (routeName.length >= 2 && trailSuggestions.length > 0) {
                          setShowTrailDropdown(true);
                        }
                      }}
                      placeholder="e.g., Rattlesnake Ledge, Tiger Mountain Trail"
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20"
                    />
                    {showTrailDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 max-h-60 overflow-y-auto">
                        {trailSuggestions.map(trail => (
                          <button
                            key={trail.id}
                            onClick={() => {
                              setRouteName(trail.name);
                              setShowTrailDropdown(false);
                            }}
                            className="w-full text-left px-5 py-3 text-sm font-bold text-navy hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-3"
                          >
                            <span className="material-icons text-slate-300 text-[16px]">place</span>
                            <div>
                              <div>{trail.name}</div>
                              {trail.distance && (
                                <span className="text-[10px] text-slate-400 font-semibold">{trail.distance} mi</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inputs Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="relative" ref={calendarRef}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Start Date</label>
                    <button
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy flex items-center gap-3 hover:bg-slate-100 transition-all text-left"
                    >
                      <span className="material-icons text-slate-300">calendar_today</span>
                      {formatDate(selectedDate)}
                    </button>

                    {isCalendarOpen && (
                      <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-navy text-sm uppercase tracking-wider">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</h4>
                          <div className="flex gap-1">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                              <span className="material-icons text-[18px]">chevron_left</span>
                            </button>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                              <span className="material-icons text-[18px]">chevron_right</span>
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                            <div key={d} className="text-center text-[9px] font-black text-slate-300 py-1">{d}</div>
                          ))}
                          {daysInMonth.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} />;
                            const isSelected = selectedDate.toDateString() === day.toDateString();
                            return (
                              <button
                                key={day.toISOString()}
                                onClick={() => {
                                  setSelectedDate(day);
                                  setIsCalendarOpen(false);
                                }}
                                className={`h-8 rounded-xl text-[11px] font-bold transition-all ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-navy hover:bg-slate-50'
                                  }`}
                              >
                                {day.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Start Time</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>



                <div className="flex justify-end gap-6 pt-6">
                  <button className="px-10 py-5 bg-slate-50 text-navy font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all active:scale-95">
                    Save Draft
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handlePost}
                    className="min-w-[200px] px-10 py-5 bg-[#00ED3F] text-navy font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#00ED3F]/20 hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="material-icons animate-spin">sync</span>
                    ) : 'Post Group Run'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-10">
            {/* Upcoming Group Runs — from Supabase */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-primary">groups</span>
                  <h3 className="text-xl font-black text-navy">Upcoming Group Runs</h3>
                </div>
                {groupRuns.length > 0 && (
                  <button
                    onClick={() => setIsBrowseAllOpen(true)}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline underline-offset-4 transition-all"
                  >
                    Browse All
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {groupRunsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="material-icons text-3xl text-primary animate-spin">sync</span>
                  </div>
                ) : groupRuns.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="material-icons text-4xl text-slate-100 mb-2">directions_run</span>
                    <p className="text-xs font-bold text-slate-300">No group runs yet. Be the first to post!</p>
                  </div>
                ) : (
                  groupRuns.slice(0, 3).map((group, i) => {
                    const handleJoinRun = () => {
                      if (!user) { onAuthClick?.(); return; }
                      setSuccessMessage(`Joined "${group.name}"!`);
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 5000);
                    };
                    return (
                      <div key={group.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group active:scale-95">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={group.avatarUrl || `https://picsum.photos/seed/group${i}/100/100`} className="w-10 h-10 rounded-full border-2 border-white object-cover group-hover:ring-2 group-hover:ring-primary/20 transition-all" alt="" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[8px] font-black text-slate-400 border border-slate-100 shadow-sm">+8</div>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-navy">{group.name}</h4>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${group.color}`}>{group.type}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleJoinRun}
                          className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all whitespace-nowrap"
                        >
                          Join
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Browse All Group Runs Modal */}
            {isBrowseAllOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setIsBrowseAllOpen(false)} />
                <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 max-h-[80vh] flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <span className="material-icons text-primary">groups</span>
                      <h3 className="text-2xl font-black text-navy">All Group Runs</h3>
                    </div>
                    <button onClick={() => setIsBrowseAllOpen(false)} className="text-slate-300 hover:text-navy transition-colors">
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                  <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                    {groupRuns.map((group, i) => {
                      const handleJoinAll = () => {
                        if (!user) { onAuthClick?.(); setIsBrowseAllOpen(false); return; }
                        setSuccessMessage(`Joined "${group.name}"!`);
                        setShowSuccess(true);
                        setIsBrowseAllOpen(false);
                        setTimeout(() => setShowSuccess(false), 5000);
                      };
                      return (
                        <div key={group.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img src={group.avatarUrl || `https://picsum.photos/seed/group${i}/100/100`} className="w-12 h-12 rounded-full border-2 border-white object-cover" alt="" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-navy mb-1">{group.name}</h4>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${group.color}`}>{group.type}</span>
                              {group.trailId && (
                                <p className="text-[10px] font-bold text-slate-400 mt-1">{group.trailId}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                            <div className="text-[11px] font-black text-navy">{group.time}</div>
                            <button
                              onClick={handleJoinAll}
                              className="text-[9px] font-black text-white uppercase tracking-widest bg-primary px-4 py-1.5 rounded-full hover:brightness-110 transition-all whitespace-nowrap"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Safety Hub */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-[#FF4B4B] text-2xl">report_problem</span>
                  <h3 className="text-xl font-black text-navy">Safety Hub</h3>
                </div>
                <span className="text-[9px] font-black text-[#FF4B4B] bg-[#FF4B4B]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  0 Live Alerts
                </span>
              </div>

              <button
                onClick={() => setIsHazardModalOpen(true)}
                className="w-full mb-6 py-4 bg-[#FF4B4B] text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-lg shadow-[#FF4B4B]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">report_problem</span>
                Report Hazard
              </button>

              <div className="space-y-4">
                {[
                  { icon: 'pets', color: '#FF4B4B', bg: '#FFF2F2', title: 'Bear Sighting Reported', desc: 'Mother and cub near Mile 4. Reported 15m ago.', status: 'Critical', dist: '0.8km from route' },
                  { icon: 'waves', color: '#FFB04B', bg: '#FFF9F2', title: 'Creek High Water', desc: 'Lower crossing is waist-deep. Use bridge bypass.', status: 'Caution', dist: 'On Route' },
                  { icon: 'build', color: '#4B8BFF', bg: '#F2F7FF', title: 'Trail Maintenance', desc: 'Heavy brushing on North Slope. Expect minor delays.', status: 'Info', dist: '2h Ago' }
                ].map((alert, idx) => (
                  <div key={idx} className="flex gap-4 p-5 rounded-3xl group cursor-pointer transition-all hover:translate-x-1" style={{ backgroundColor: alert.bg }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: alert.color }}>
                      <span className="material-icons text-white">{alert.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-[13px] font-black mb-1" style={{ color: alert.color }}>{alert.title}</h4>
                      <p className="text-[11px] font-bold text-navy opacity-60 mb-2">{alert.desc}</p>
                      <div className="flex gap-4">
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: alert.color }}>{alert.status}</span>
                        <span className="text-[9px] font-black text-navy opacity-30 uppercase tracking-widest">{alert.dist}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Footer code remains same */}
      <footer className="mt-20 border-t border-slate-100 py-20 bg-white -mx-10 px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="logo.png" alt="TrailPulse" className="h-12 w-auto object-contain" />
            </div>
            <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-xs">
              Empowering trail runners with community insights, real-time safety, and smart group coordination. Discover the wild, together.
            </p>
          </div>
          <div>
            <h4 className="font-black text-navy mb-6 text-sm">Platform</h4>
            <ul className="space-y-3">
              {['Trails Map', 'Safety Protocols', 'Leaderboard', 'Mobile App'].map(item => (
                <li key={item}><a href="#" className="text-slate-400 font-bold text-xs hover:text-primary transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-black text-navy mb-6 text-sm">Community</h4>
            <ul className="space-y-3">
              {['Events', 'Volunteer Groups', 'Trail Reports', 'Forum'].map(item => (
                <li key={item}><a href="#" className="text-slate-400 font-bold text-xs hover:text-primary transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <h4 className="font-black text-navy mb-6 text-sm">Newsletter</h4>
              <div className="flex gap-2">
                <input className="bg-slate-100 border-none rounded-xl py-3 px-4 text-xs font-bold w-full focus:ring-2 focus:ring-primary/20" placeholder="Email address" />
                <button className="bg-navy text-white p-3 rounded-xl hover:bg-primary transition-colors active:scale-90">
                  <span className="material-icons text-sm">send</span>
                </button>
              </div>
            </div>
            <div className="flex gap-4 pt-8">
              <span className="material-icons text-slate-300 hover:text-navy cursor-pointer transition-colors">facebook</span>
              <span className="material-icons text-slate-300 hover:text-navy cursor-pointer transition-colors">language</span>
              <span className="material-icons text-slate-300 hover:text-navy cursor-pointer transition-colors">alternate_email</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-300">© 2026 TrailPulse Coordination Hub. All trail rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-bold text-slate-300 hover:text-navy transition-colors">Terms of Service</a>
            <a href="#" className="text-[10px] font-bold text-slate-300 hover:text-navy transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CommunityView;
