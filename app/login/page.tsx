'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  if (checkEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
            ELITE <span className="text-[var(--accent-light)]">COACH</span>
          </h1>
          <div className="mt-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
            <div className="text-3xl mb-3">✉️</div>
            <h2 className="font-bold text-lg text-[var(--text-primary)] mb-2">Check your email</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </p>
            <button
              onClick={() => { setCheckEmail(false); setMode('login'); }}
              className="mt-4 text-sm text-[var(--accent-light)] hover:text-blue-500 font-medium"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
            ELITE <span className="text-[var(--accent-light)]">COACH</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Your AI performance coach</p>
        </div>

        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6">
          <h2 className="font-bold text-lg text-[var(--text-primary)] mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            {mode === 'login' ? 'Sign in to access your training data' : 'Start your training journey'}
          </p>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-[var(--bg-card)] px-3 text-[var(--text-tertiary)]">or</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white hover:bg-[#3730a3] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-[var(--accent-light)] font-medium hover:text-blue-500"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
