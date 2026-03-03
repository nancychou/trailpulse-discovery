
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RaceSidebar from './components/RaceSidebar';
import TrailCard from './components/TrailCard';
import TrailDetailDrawer from './components/TrailDetailDrawer';
import TrailMapView from './components/TrailMapView';
import RaceCard from './components/RaceCard';
import RaceCalendar from './components/RaceCalendar';
import RaceDetailDrawer from './components/RaceDetailDrawer';
import CommunityView from './components/CommunityView';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import ChatWidget from './components/ChatWidget';
import { useAuth } from './lib/AuthContext';
import { useTrails, useTrailsInBounds, useTrailDetail, useRaces, useGroupRuns } from './lib/hooks';
import { addSavedRace, removeSavedRace, joinGroupRun, leaveGroupRun, exchangeCode } from './lib/auth';
import { INITIAL_RACES } from './constants';
import { FilterState, RaceFilterState, SortOption, Race, TrailListItem, MapBounds } from './types';

// Parse Supabase recovery info from URL:
// - Implicit flow: #access_token=...&type=recovery  → returns { token }
// - PKCE flow: ?code=...  → returns { code }
function parseRecoveryInfo(): { token?: string; code?: string } | null {
  // Check hash fragment first (implicit flow)
  const hash = window.location.hash.substring(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    if (params.get('type') === 'recovery') {
      const token = params.get('access_token');
      if (token) return { token };
    }
  }
  // Check query params (PKCE flow)
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  if (code) return { code };
  return null;
}

// Restore active tab from localStorage
function getInitialTab(): 'Discovery' | 'Race' | 'Community' {
  const saved = localStorage.getItem('activeTab');
  if (saved === 'Discovery' || saved === 'Race' || saved === 'Community') return saved;
  return 'Discovery';
}

const AppContent: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  // Supabase data hooks
  const { trails: allTrails, loading: trailsLoading } = useTrails();
  const { races: allRaces } = useRaces();
  const { groupRuns } = useGroupRuns();

  const [activeTab, setActiveTabState] = useState<'Discovery' | 'Race' | 'Community'>(getInitialTab);
  const [discoveryViewMode, setDiscoveryViewMode] = useState<'list' | 'map'>('list');
  const [raceViewMode, setRaceViewMode] = useState<'list' | 'calendar'>('list');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Password recovery flow: detect tokens in URL on mount
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  // Handle recovery redirect (both implicit and PKCE flows) on mount
  useEffect(() => {
    const info = parseRecoveryInfo();
    if (!info) return;

    // Clean up URL immediately
    window.history.replaceState(null, '', window.location.pathname);

    if (info.token) {
      // Implicit flow: access_token is directly in the hash
      setRecoveryToken(info.token);
    } else if (info.code) {
      // PKCE flow: exchange code for access token via backend
      exchangeCode(info.code)
        .then((result) => {
          setRecoveryToken(result.access_token);
        })
        .catch((err) => {
          console.error('Recovery code exchange failed:', err);
        });
    }
  }, []);

  // Persist active tab to localStorage
  const setActiveTab = useCallback((tab: 'Discovery' | 'Race' | 'Community') => {
    setActiveTabState(tab);
    localStorage.setItem('activeTab', tab);
  }, []);

  // Real-time Weather State
  const [weatherData, setWeatherData] = useState<{ text: string, source: string | null }>({
    text: 'Fetching conditions...',
    source: null
  });

  // Saved Items State — synced with profile
  const [savedRaceIds, setSavedRaceIds] = useState<Set<string>>(new Set());
  const [joinedRunIds, setJoinedRunIds] = useState<Set<string>>(new Set());

  // Sync saved races + joined runs from profile when it loads/changes
  useEffect(() => {
    if (profile) {
      setSavedRaceIds(new Set(profile.savedRaceIds));
      setJoinedRunIds(new Set(profile.groupRunIds));
    } else {
      setSavedRaceIds(new Set());
      setJoinedRunIds(new Set());
    }
  }, [profile]);

  // Discovery State
  const [filters, setFilters] = useState<FilterState>({
    difficultyRange: [0, 10],
    distanceRange: [0, 40],
    elevationRange: [0, 10000],
    waterAvailability: [],
    surfaces: [],
    routeTypes: [],
    parkingTags: []
  });
  const [sortBy, setSortBy] = useState<SortOption>('Rating');
  const [activeTrailId, setActiveTrailId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);

  // On-demand detail fetch (hazards + reviews loaded only when drawer opens)
  const { trail: selectedTrailDetail, loading: trailDetailLoading } = useTrailDetail(selectedTrailId);

  // Map spatial search state
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const { trails: mapTrails, loading: mapTrailsLoading, error: mapError } = useTrailsInBounds(
    discoveryViewMode === 'map' ? mapBounds : null
  );

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // Race State
  const [raceFilters, setRaceFilters] = useState<RaceFilterState>({
    location: 'All Locations',
    distanceRange: [null, null],
    qualifiers: [],
    difficulty: null,
    showSavedOnly: false
  });
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  const toggleSaveRace = useCallback(async (raceId: string) => {
    if (!user) return;

    const wasSaved = savedRaceIds.has(raceId);
    // Optimistic update
    setSavedRaceIds(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(raceId);
      else next.add(raceId);
      return next;
    });

    try {
      let updatedIds: string[];
      if (wasSaved) {
        updatedIds = await removeSavedRace(raceId);
      } else {
        updatedIds = await addSavedRace(raceId);
      }
      // Use API response directly — don't call refreshProfile()
      setSavedRaceIds(new Set(updatedIds));
    } catch (err) {
      console.warn('Failed to sync saved race:', err);
      // Revert on error
      setSavedRaceIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(raceId);
        else next.delete(raceId);
        return next;
      });
    }
  }, [user, savedRaceIds]);

  const toggleJoinRun = useCallback(async (runId: string) => {
    if (!user) return;

    // Optimistic update
    const wasJoined = joinedRunIds.has(runId);
    setJoinedRunIds(prev => {
      const next = new Set(prev);
      if (wasJoined) next.delete(runId);
      else next.add(runId);
      return next;
    });

    try {
      let updatedIds: string[];
      if (wasJoined) {
        updatedIds = await leaveGroupRun(runId);
      } else {
        updatedIds = await joinGroupRun(runId);
      }
      // Use the server response directly — avoids race condition with refreshProfile
      setJoinedRunIds(new Set(updatedIds));
    } catch (err) {
      console.warn('Failed to sync group run join:', err);
      // Revert on error
      setJoinedRunIds(prev => {
        const next = new Set(prev);
        if (wasJoined) next.add(runId);
        else next.delete(runId);
        return next;
      });
    }
  }, [user, joinedRunIds]);

  // Fetch real-time weather via backend proxy (Gemini key stays server-side)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const res = await fetch(`${apiUrl}/api/weather`);
        if (!res.ok) throw new Error(`Weather API error ${res.status}`);
        const data: { text: string; source: string | null } = await res.json();
        setWeatherData({ text: data.text || 'Optimal / 65°F', source: data.source });
      } catch {
        setWeatherData({ text: 'Optimal / 65°F', source: null });
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAndSortedTrails = useMemo(() => {
    let results = allTrails.filter(trail => {
      const diff = trail.difficulty ?? 0;
      const dist = trail.distance ?? 0;
      const elev = trail.elevation ?? 0;
      const withinDifficulty = diff >= filters.difficultyRange[0] && diff <= filters.difficultyRange[1];
      const withinDistance = dist >= filters.distanceRange[0] && dist <= filters.distanceRange[1];
      const withinElevation = elev >= filters.elevationRange[0] && elev <= filters.elevationRange[1];
      const matchesWater = filters.waterAvailability.length === 0 || filters.waterAvailability.includes(trail.waterSource ?? '');
      const matchesSurface = filters.surfaces.length === 0 || filters.surfaces.includes(trail.surface ?? '');
      const matchesRoute = filters.routeTypes.length === 0 || filters.routeTypes.includes(trail.routeType ?? '');
      return (withinDifficulty && withinDistance && withinElevation && matchesWater && matchesSurface && matchesRoute);
    });
    results.sort((a, b) => {
      switch (sortBy) {
        case 'Distance': return (a.distance ?? 0) - (b.distance ?? 0);
        case 'Elevation': return (b.elevation ?? 0) - (a.elevation ?? 0);
        case 'Difficulty': return (b.difficulty ?? 0) - (a.difficulty ?? 0);
        case 'Rating':
        default: return (b.difficultyScore010 ?? 0) - (a.difficultyScore010 ?? 0);
      }
    });
    return results;
  }, [filters, sortBy, allTrails]);

  // Client-side fallback: filter allTrails by bounds when RPC is unavailable
  const mapDisplayTrails = useMemo(() => {
    // If spatial RPC returned results, use them
    if (mapTrails.length > 0) return mapTrails;
    // If RPC errored or returned empty, filter allTrails client-side
    if (mapBounds && (mapError || mapTrails.length === 0)) {
      return filteredAndSortedTrails.filter(t => {
        if (t.trailheadLat == null || t.trailheadLng == null) return false;
        return (
          t.trailheadLat >= mapBounds.south &&
          t.trailheadLat <= mapBounds.north &&
          t.trailheadLng >= mapBounds.west &&
          t.trailheadLng <= mapBounds.east
        );
      });
    }
    return filteredAndSortedTrails;
  }, [mapTrails, mapError, mapBounds, filteredAndSortedTrails]);

  const filteredRaces = useMemo(() => {
    return allRaces.filter(race => {
      if (raceFilters.showSavedOnly && !savedRaceIds.has(race.id)) return false;
      const matchesLocation = raceFilters.location === 'All Locations' || race.country === raceFilters.location;
      const minDistance = raceFilters.distanceRange[0];
      const maxDistance = raceFilters.distanceRange[1];
      const withinDistance = (minDistance === null || race.distanceKm >= minDistance) &&
        (maxDistance === null || race.distanceKm <= maxDistance);
      const matchesQualifiers = raceFilters.qualifiers.length === 0 ||
        raceFilters.qualifiers.some(q => race.qualifiers.includes(q));
      const matchesDifficulty = raceFilters.difficulty === null || race.difficultyRank === raceFilters.difficulty;
      return matchesLocation && withinDistance && matchesQualifiers && matchesDifficulty;
    });
  }, [raceFilters, savedRaceIds, allRaces]);

  const sortOptions: SortOption[] = ['Rating', 'Distance', 'Elevation', 'Difficulty'];

  // Open auth modal automatically when recovery token is detected
  useEffect(() => {
    if (recoveryToken) {
      setIsAuthOpen(true);
    }
  }, [recoveryToken]);

  // Close auth modal when user logs in (but not during recovery)
  useEffect(() => {
    if (user && isAuthOpen && !recoveryToken) {
      setIsAuthOpen(false);
    }
  }, [user, isAuthOpen, recoveryToken]);

  return (
    <div className="font-display bg-white h-screen flex flex-col selection:bg-primary/10 overflow-hidden">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onProfileClick={() => setIsProfileOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'Discovery' && <Sidebar filters={filters} setFilters={setFilters} />}
        {activeTab === 'Race' && <RaceSidebar filters={raceFilters} setFilters={setRaceFilters} />}

        <section className="bg-[#F8FAFB] overflow-y-auto flex-1 custom-scrollbar scroll-smooth h-full">
          {activeTab === 'Discovery' && (
            <div className="min-h-full flex flex-col h-full">
              <div className="px-10 py-8 flex items-center justify-between sticky top-0 z-20 bg-[#F8FAFB]/95 backdrop-blur-sm">
                <h2 className="font-extrabold text-2xl tracking-tight text-navy">Discovery</h2>
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="bg-white p-1 rounded-2xl border border-slate-100 flex shadow-sm">
                    <button
                      onClick={() => setDiscoveryViewMode('list')}
                      className={`px-5 py-2.5 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${discoveryViewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <span className="material-icons text-[16px]">view_list</span>
                      List
                    </button>
                    <button
                      onClick={() => setDiscoveryViewMode('map')}
                      className={`px-5 py-2.5 font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${discoveryViewMode === 'map' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <span className="material-icons text-[16px]">map</span>
                      Map
                    </button>
                  </div>

                  {/* Sort dropdown — only show in list mode */}
                  {discoveryViewMode === 'list' && (
                    <div className="flex items-center gap-3" ref={sortRef}>
                      <span className="text-[11px] text-[#172D3D] opacity-40 uppercase font-black tracking-widest">Sort By:</span>
                      <div className="relative">
                        <button
                          onClick={() => setIsSortOpen(!isSortOpen)}
                          className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/30 transition-all text-[11px] font-bold uppercase tracking-widest text-navy min-w-[140px] justify-between"
                        >
                          <span>{sortBy}</span>
                          <span className={`material-icons text-[18px] transition-transform ${isSortOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        {isSortOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-50">
                            {sortOptions.map((option) => (
                              <button
                                key={option}
                                onClick={() => { setSortBy(option); setIsSortOpen(false); }}
                                className={`w-full text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${sortBy === option ? 'text-primary bg-primary/5' : 'text-navy/70 hover:bg-slate-50 hover:text-navy'}`}
                              >
                                {option}
                                {sortBy === option && <span className="material-icons text-[16px]">check_circle</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* List View */}
              {discoveryViewMode === 'list' && (
                <div className="px-10 pb-20 space-y-6 max-w-6xl mx-auto w-full flex-1">
                  {trailsLoading && filteredAndSortedTrails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <span className="material-icons text-5xl text-primary animate-spin">sync</span>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading trails...</p>
                    </div>
                  ) : (
                    <>
                      {trailsLoading && (
                        <div className="flex items-center justify-center gap-2 py-2">
                          <span className="material-icons text-sm text-primary animate-spin">sync</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Refreshing...</span>
                        </div>
                      )}
                      {filteredAndSortedTrails.map(trail => (
                        <div key={trail.id} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 200px' }}>
                          <TrailCard trail={trail} isActive={activeTrailId === trail.id} onMouseEnter={() => setActiveTrailId(trail.id)} onMouseLeave={() => setActiveTrailId(null)} onClick={() => setSelectedTrailId(trail.id)} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Map View */}
              {discoveryViewMode === 'map' && (
                <div className="flex-1 relative">
                  <TrailMapView
                    trails={mapDisplayTrails}
                    loading={mapTrailsLoading}
                    onBoundsChange={handleBoundsChange}
                    onTrailClick={setSelectedTrailId}
                    activeTrailId={activeTrailId}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'Race' && (
            <div className="p-10 max-w-6xl mx-auto space-y-12 min-h-full">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-navy">
                  {raceFilters.showSavedOnly ? 'My Race Planning' : 'Upcoming Races (2026)'}
                </h2>
                <div className="bg-white p-1 rounded-2xl border border-slate-100 flex shadow-sm">
                  <button onClick={() => setRaceViewMode('list')} className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${raceViewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-50'}`}>List View</button>
                  <button onClick={() => setRaceViewMode('calendar')} className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all ${raceViewMode === 'calendar' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-50'}`}>Calendar View</button>
                </div>
              </div>

              {raceViewMode === 'list' ? (
                <div className="space-y-6">
                  {filteredRaces.map(race => (
                    <RaceCard key={race.id} race={race} onDetails={setSelectedRace} isSaved={savedRaceIds.has(race.id)} onToggleSave={toggleSaveRace} />
                  ))}
                  {filteredRaces.length === 0 && (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-100">
                      <span className="material-icons text-6xl text-slate-100 mb-4">bookmark_border</span>
                      <h3 className="text-xl font-black text-navy opacity-40">No races found</h3>
                      <p className="text-slate-400 font-bold mt-2">Adjust your filters or save some races to see them here.</p>
                    </div>
                  )}
                </div>
              ) : (
                // Fixed: Passing missing properties savedRaceIds and onToggleSave to RaceCalendar
                <RaceCalendar
                  races={filteredRaces}
                  onDetails={setSelectedRace}
                  savedRaceIds={savedRaceIds}
                  onToggleSave={toggleSaveRace}
                />
              )}
            </div>
          )}

          {activeTab === 'Community' && <CommunityView trails={allTrails} onAuthClick={() => setIsAuthOpen(true)} joinedRunIds={joinedRunIds} onToggleJoinRun={toggleJoinRun} />}
        </section>

        {selectedRace && <RaceDetailDrawer race={selectedRace} onClose={() => setSelectedRace(null)} />}
        {selectedTrailId && (
          <TrailDetailDrawer
            trail={selectedTrailDetail}
            loading={trailDetailLoading}
            onClose={() => setSelectedTrailId(null)}
          />
        )}
      </main>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => { setIsAuthOpen(false); setRecoveryToken(null); }} recoveryToken={recoveryToken} />
      <ChatWidget />

      {activeTab !== 'Community' && (() => {
        // Format next group run time for footer
        const nextRun = groupRuns[0]; // already sorted by time ascending (soonest first)
        let nextRunText = 'No upcoming runs';
        if (nextRun) {
          try {
            const d = new Date(nextRun.time);
            nextRunText = `${nextRun.name} — ${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`;
          } catch {
            nextRunText = nextRun.name;
          }
        }
        return (
        <footer className="bg-navy text-white py-4 flex justify-between items-center px-10 border-t border-slate-800 shrink-0 z-30">
          <div className="flex gap-8">
            <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider opacity-90">
              <span className="material-icons text-[16px] text-primary">event</span>
              <span>Next Community Run: {nextRunText}</span>
            </div>
            <div className="hidden md:flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-wider opacity-60">
              <span className="material-icons text-[16px]">thermostat</span>
              {/* Added source link for Google Search grounding compliance */}
              <span>Trail Conditions: {weatherData.text} {weatherData.source && <a href={weatherData.source} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline underline-offset-2">(Source)</a>}</span>
            </div>
          </div>
        </footer>
        );
      })()}
    </div>
  );
};

export default AppContent;
