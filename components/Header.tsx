
import React from 'react';
import { useAuth } from '../lib/AuthContext';

interface HeaderProps {
  activeTab: 'Discovery' | 'Race' | 'Community';
  setActiveTab: (tab: 'Discovery' | 'Race' | 'Community') => void;
  onProfileClick: () => void;
  onAuthClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onProfileClick, onAuthClick }) => {
  const { user, profile } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 px-8 py-3 flex items-center justify-between">
      <div
        className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setActiveTab('Discovery')}
      >
        <div className="text-2xl font-black tracking-tighter text-navy flex items-center gap-2">
          <span className="material-icons text-primary">explore</span>
          TrailPulse
        </div>
      </div>

      <div className="flex items-center gap-8 h-full">
        <button
          onClick={() => setActiveTab('Discovery')}
          className={`font-bold text-sm transition-all h-full py-2 relative ${activeTab === 'Discovery' ? 'text-primary' : 'text-navy hover:text-primary'}`}
        >
          Trail Discovery
          {activeTab === 'Discovery' && <div className="absolute bottom-[-13px] left-0 w-full h-1 bg-primary rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('Race')}
          className={`font-bold text-sm transition-all h-full py-2 relative ${activeTab === 'Race' ? 'text-primary' : 'text-navy hover:text-primary'}`}
        >
          Race
          {activeTab === 'Race' && <div className="absolute bottom-[-13px] left-0 w-full h-1 bg-primary rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('Community')}
          className={`font-bold text-sm transition-all h-full py-2 relative ${activeTab === 'Community' ? 'text-primary' : 'text-navy hover:text-primary'}`}
        >
          Community
          {activeTab === 'Community' && <div className="absolute bottom-[-13px] left-0 w-full h-1 bg-primary rounded-t-full"></div>}
        </button>
        <div className="flex items-center gap-4 ml-2">
          <span className="material-icons text-slate-400 cursor-pointer hover:text-navy transition-colors">notifications</span>

          {user ? (
            <div
              onClick={onProfileClick}
              className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            >
              {profile?.avatarUrl ? (
                <img
                  className="w-full h-full object-cover"
                  alt="User profile"
                  src={profile.avatarUrl}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-emerald-400">
                  <span className="text-white text-sm font-black">
                    {profile?.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="px-5 py-2 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
