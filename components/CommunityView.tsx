
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trail } from '../types';
import { useGroupRuns } from '../lib/hooks';
import { createGroupRun, createHazardReport } from '../lib/api';

interface CommunityViewProps {
  trails: Trail[];
}

const CommunityView: React.FC<CommunityViewProps> = ({ trails }) => {
  const getInitialDateTime = () => {
    const now = new Date();
    const nextHour = (now.getHours() + 1) % 24;
    const timeStr = `${String(nextHour).padStart(2, '0')}:00`;
    return { date: now, time: timeStr };
  };

  const initial = getInitialDateTime();
  const [routeId, setRouteId] = useState(trails[0]?.id ?? '');
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

  // Group Run form fields
  const [groupName, setGroupName] = useState('');
  const [runType, setRunType] = useState('Steady Pace');

  const calendarRef = useRef<HTMLDivElement>(null);

  // Fetch group runs from Supabase
  const { groupRuns, loading: groupRunsLoading } = useGroupRuns();

  const selectedTrail = useMemo(() =>
    trails.find(t => t.id === routeId) || trails[0],
    [routeId, trails]);

  // Keep routeId in sync if trails change
  useEffect(() => {
    if (trails.length > 0 && !trails.find(t => t.id === routeId)) {
      setRouteId(trails[0].id);
    }
  }, [trails, routeId]);

  const handlePost = async () => {
    if (!selectedTrail) return;
    setIsSubmitting(true);
    try {
      await createGroupRun({
        trail_id: selectedTrail.id,
        name: groupName || `Group Run on ${selectedTrail.name}`,
        time: `${time} - ${formatDate(selectedDate)}`,
        type: runType,
        color: runType === 'Performance' ? 'text-[#FF4B4B]' : 'text-primary',
      });
      setSuccessMessage('Group run posted to Supabase!');
      setShowSuccess(true);
      setGroupName('');
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to create group run:', err.message);
      setSuccessMessage('Saved locally (Supabase unavailable)');
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

  const hasHazards = selectedTrail?.hazards && selectedTrail.hazards.length > 0;

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
                  <select
                    value={hazardTrailId}
                    onChange={(e) => setHazardTrailId(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 appearance-none"
                  >
                    {trails.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
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

        {/* AI Smart Suggestion */}
        <div className="bg-[#E6F4EA] border-l-[6px] border-[#00ED3F] rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between shadow-sm gap-6 transition-all duration-300">
          <div className="flex gap-6 items-start max-w-2xl">
            <div className="w-12 h-12 bg-[#00ED3F] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#00ED3F]/20">
              <span className="material-icons text-white">auto_awesome</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-navy mb-2">AI Smart Suggestion</h3>
              <p className="text-navy/70 font-semibold leading-relaxed">
                Heads up! Sarah is leading a "Steady" group on <span className="font-black text-navy">{selectedTrail?.name}</span> at 8:15 AM tomorrow. Why not join as a <span className="text-[#00913F] font-black underline decoration-2 underline-offset-4">'Sweep'</span> runner instead and group together?
              </p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-8 py-4 bg-[#00ED3F] text-navy font-black text-sm rounded-2xl shadow-lg shadow-[#00ED3F]/20 hover:brightness-105 transition-all active:scale-95 whitespace-nowrap">
              Join Sarah's Group
            </button>
            <button className="flex-1 md:flex-none px-8 py-4 bg-white text-navy font-black text-sm rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap">
              Dismiss
            </button>
          </div>
        </div>

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

                {/* Inputs Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Select Route</label>
                    <div className="relative">
                      <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">search</span>
                      <select
                        value={routeId}
                        onChange={(e) => setRouteId(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                      >
                        {trails.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-slate-300 italic">Popular: {trails.slice(0, 3).map(t => t.name).join(', ')}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Distance & Elevation</label>
                      <div className="flex gap-3">
                        <div className="flex-1 bg-slate-50 rounded-2xl py-4 px-6 flex items-center gap-3 border border-transparent hover:border-slate-200 transition-colors">
                          <span className="material-icons text-slate-300 text-sm">straighten</span>
                          <span className="text-sm font-black text-navy whitespace-nowrap">{selectedTrail?.distance} mi</span>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl py-4 px-6 flex items-center gap-3 border border-transparent hover:border-slate-200 transition-colors">
                          <span className="material-icons text-slate-300 text-sm">terrain</span>
                          <span className="text-sm font-black text-navy whitespace-nowrap">{(selectedTrail?.elevation ?? 0).toLocaleString()} ft</span>
                        </div>
                      </div>
                    </div>
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

                {/* Map Visualization */}
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Visualization</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00ED3F]"></span>
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Nearby hazards highlighted</span>
                    </div>
                  </div>
                  <div className="rounded-[2.5rem] overflow-hidden relative aspect-[21/9] bg-slate-100 border border-slate-100">
                    <img
                      src={selectedTrail?.imageUrl}
                      className="w-full h-full object-cover opacity-60 grayscale brightness-75"
                      alt="Route Map"
                    />
                    <div className="absolute inset-0 bg-navy/20"></div>

                    {hasHazards && (
                      <div className="absolute top-[40%] left-[40%] flex items-center gap-2 bg-[#FF4B4B] text-white px-3 py-1.5 rounded-full shadow-lg shadow-[#FF4B4B]/30 scale-75 lg:scale-100 animate-pulse cursor-help group">
                        <span className="material-icons text-[16px]">warning</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{selectedTrail.hazards![0].type}</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-navy text-white text-[8px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {selectedTrail.hazards![0].message}
                        </div>
                      </div>
                    )}
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
              <div className="flex items-center gap-3 mb-8">
                <span className="material-icons text-primary">groups</span>
                <h3 className="text-xl font-black text-navy">Upcoming Group Runs</h3>
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
                  groupRuns.slice(0, 5).map((group, i) => (
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
                      <div className="text-right">
                        <div className="text-[10px] font-black text-navy">{group.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Safety Hub */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-[#FF4B4B] text-2xl">report_problem</span>
                  <h3 className="text-xl font-black text-navy">Safety Hub</h3>
                </div>
                <span className="text-[9px] font-black text-[#FF4B4B] bg-[#FF4B4B]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {selectedTrail?.hazards?.length ?? 0} Live Alerts
                </span>
              </div>

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

              <button
                onClick={() => setIsHazardModalOpen(true)}
                className="w-full mt-6 py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[11px] font-black text-navy/30 uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                Submit Hazard Report
              </button>
            </div>

            {/* Promo Block */}
            <div className="bg-[#00ED3F] rounded-[2.5rem] p-10 text-navy relative overflow-hidden shadow-xl shadow-[#00ED3F]/30 group">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2 italic">Safety First!</h3>
                <p className="text-xs font-bold leading-relaxed mb-8 opacity-80">
                  Always carry the 10 essentials and share your live location with the TrailSync Hub before starting.
                </p>
                <button className="w-full py-4 bg-white text-navy font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                  Set Live Beacon
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
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
