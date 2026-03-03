
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { forgotPassword, updatePassword } from '../lib/auth';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    recoveryToken?: string | null;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, recoveryToken }) => {
    const { signUp, signIn } = useAuth();
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(recoveryToken ? 'reset' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Switch to reset mode when recoveryToken becomes available (e.g. after async PKCE exchange)
    useEffect(() => {
        if (recoveryToken) {
            setMode('reset');
            setError('');
            setSuccess('');
        }
    }, [recoveryToken]);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setError('');
        setSuccess('');
    };

    const switchMode = (newMode: 'login' | 'signup' | 'forgot' | 'reset') => {
        setMode(newMode);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'reset') {
                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                const result = await updatePassword(password, recoveryToken!);
                setSuccess(result.message);
                // Clear recovery hash from URL
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setTimeout(() => {
                    resetForm();
                    switchMode('login');
                }, 2000);
            } else if (mode === 'forgot') {
                const result = await forgotPassword(email);
                setSuccess(result.message);
            } else if (mode === 'signup') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setLoading(false);
                    return;
                }
                await signUp(email, password, displayName);
                setSuccess('Account created! You are now signed in.');
                setTimeout(() => {
                    resetForm();
                    onClose();
                }, 1500);
            } else {
                await signIn(email, password);
                resetForm();
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-navy/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header gradient */}
                <div className="h-32 bg-gradient-to-br from-primary via-emerald-500 to-teal-400 relative flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-icons text-white/90 text-4xl mb-1">explore</span>
                        <h1 className="text-white font-black text-xl tracking-tight">TrailPulse</h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Tab switcher */}
                {mode === 'reset' ? (
                    <div className="flex border-b border-slate-100">
                        <div className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-primary text-center relative">
                            Reset Password
                            <div className="absolute bottom-0 left-1/4 w-1/2 h-[3px] bg-primary rounded-t-full" />
                        </div>
                    </div>
                ) : (
                    <div className="flex border-b border-slate-100">
                        <button
                            onClick={() => switchMode('login')}
                            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${(mode === 'login' || mode === 'forgot')
                                ? 'text-primary'
                                : 'text-slate-400 hover:text-navy'
                                }`}
                        >
                            Log In
                            {(mode === 'login' || mode === 'forgot') && (
                                <div className="absolute bottom-0 left-1/4 w-1/2 h-[3px] bg-primary rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => switchMode('signup')}
                            className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative ${mode === 'signup'
                                ? 'text-primary'
                                : 'text-slate-400 hover:text-navy'
                                }`}
                        >
                            Sign Up
                            {mode === 'signup' && (
                                <div className="absolute bottom-0 left-1/4 w-1/2 h-[3px] bg-primary rounded-t-full" />
                            )}
                        </button>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
                            <span className="material-icons text-sm">error_outline</span>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
                            <span className="material-icons text-sm">check_circle</span>
                            {success}
                        </div>
                    )}

                    {mode === 'reset' && (
                        <p className="text-sm text-slate-500 font-semibold text-center">
                            Enter your new password below.
                        </p>
                    )}

                    {mode === 'forgot' && (
                        <p className="text-sm text-slate-500 font-semibold text-center">
                            Enter your email and we'll send you a link to reset your password.
                        </p>
                    )}

                    {mode === 'signup' && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your trail name"
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-navy placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                        </div>
                    )}

                    {mode !== 'reset' && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-navy placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                        </div>
                    )}

                    {mode !== 'forgot' && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                {mode === 'reset' ? 'New Password' : 'Password'}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-navy placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                        </div>
                    )}

                    {(mode === 'signup' || mode === 'reset') && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-navy placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-primary to-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-icons text-base animate-spin">sync</span>
                                {mode === 'reset' ? 'Updating...' : mode === 'signup' ? 'Creating Account...' : mode === 'forgot' ? 'Sending...' : 'Signing In...'}
                            </span>
                        ) : (
                            mode === 'reset' ? 'Set New Password' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'
                        )}
                    </button>

                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={() => switchMode('forgot')}
                            className="w-full text-center text-xs text-primary font-bold hover:underline"
                        >
                            Forgot your password?
                        </button>
                    )}

                    {mode === 'forgot' && (
                        <button
                            type="button"
                            onClick={() => switchMode('login')}
                            className="w-full text-center text-xs text-primary font-bold hover:underline"
                        >
                            ← Back to Sign In
                        </button>
                    )}

                    <p className="text-center text-xs text-slate-400 font-semibold">
                        {mode === 'login' ? (
                            <>
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => switchMode('signup')}
                                    className="text-primary font-bold hover:underline"
                                >
                                    Sign up
                                </button>
                            </>
                        ) : mode === 'signup' ? (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="text-primary font-bold hover:underline"
                                >
                                    Log in
                                </button>
                            </>
                        ) : null}
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
