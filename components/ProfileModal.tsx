
import React, { useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { updateProfile, uploadAvatar } from '../lib/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !profile || !user) return null;

  const startEdit = () => {
    setEditName(profile.displayName);
    setEditGender(profile.gender);
    setEditBio(profile.bio);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: editName,
        gender: editGender,
        bio: editBio,
      });
      await refreshProfile();
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAvatar(file);
      await refreshProfile();
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  const genderOptions = ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Banner */}
        <div className="h-40 bg-gradient-to-br from-primary via-emerald-500 to-teal-400 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="px-10 pb-10 -mt-16 relative">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center mb-8">
            <div
              onClick={handleAvatarClick}
              className={`w-32 h-32 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-xl mb-4 relative ${isEditing ? 'cursor-pointer group' : ''
                }`}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} className="w-full h-full object-cover" alt={profile.displayName} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-emerald-400">
                  <span className="text-white text-4xl font-black">
                    {profile.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <span className="material-icons text-white text-2xl animate-spin">sync</span>
                  ) : (
                    <span className="material-icons text-white text-2xl">photo_camera</span>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            {isEditing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-black text-navy text-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full max-w-xs"
                placeholder="Display name"
              />
            ) : (
              <>
                <h2 className="text-3xl font-black text-navy">{profile.displayName || 'Trail Runner'}</h2>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">
                  {profile.email}
                </p>
              </>
            )}
          </div>

          {/* Info Cards */}
          {isEditing ? (
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Gender
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all appearance-none"
                >
                  {genderOptions.map(g => (
                    <option key={g} value={g}>{g || 'Select gender...'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Tell us about your trail adventures..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-navy placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Gender', val: profile.gender || '—', icon: 'person' },
                  { label: 'Saved Races', val: profile.savedRaceIds.length, icon: 'bookmark' },
                  { label: 'Group Runs', val: profile.groupRunIds.length, icon: 'groups' },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 p-4 rounded-3xl border border-slate-100/50 text-center">
                    <span className="material-icons text-primary text-lg mb-1">{stat.icon}</span>
                    <p className="text-lg font-black text-navy">{stat.val}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Bio section */}
              {profile.bio && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100/50 mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-icons text-primary text-sm">info</span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">About</h4>
                  </div>
                  <p className="text-sm font-bold text-navy leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Member since */}
              <div className="flex items-center gap-2 mb-8 justify-center">
                <span className="material-icons text-slate-300 text-sm">calendar_today</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            {isEditing ? (
              <>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-4 bg-gradient-to-r from-primary to-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-icons text-sm animate-spin">sync</span>
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-6 py-4 bg-slate-100 text-navy font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEdit}
                  className="flex-1 py-4 bg-navy text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-95 transition-all"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-4 bg-slate-100 text-navy font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
                >
                  Log Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
