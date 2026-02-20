import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    fetchProfile as apiFetchProfile,
    signUp as authSignUp,
    signIn as authSignIn,
    signOut as authSignOut,
    getMe,
} from './auth';
import type { UserProfile } from '../types';

interface AuthUser {
    id: string;
    email: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    profile: UserProfile | null;
    loading: boolean;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async () => {
        try {
            const p = await apiFetchProfile();
            setProfile(p);
        } catch {
            setProfile(null);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) await loadProfile();
    }, [user, loadProfile]);

    // Initialize from stored token on mount
    useEffect(() => {
        (async () => {
            const me = await getMe();
            if (me) {
                setUser(me);
                await loadProfile();
            }
            setLoading(false);
        })();
    }, [loadProfile]);

    const signUp = useCallback(async (email: string, password: string, displayName: string) => {
        const result = await authSignUp(email, password, displayName);
        setUser(result.user);
        // Small delay for Supabase trigger to create profile
        setTimeout(() => loadProfile(), 500);
    }, [loadProfile]);

    const signIn = useCallback(async (email: string, password: string) => {
        const result = await authSignIn(email, password);
        setUser(result.user);
        await loadProfile();
    }, [loadProfile]);

    const signOut = useCallback(async () => {
        await authSignOut();
        setUser(null);
        setProfile(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                signUp,
                signIn,
                signOut,
                refreshProfile,
                setProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
