'use client';

import { ArrowLeft, LogOut, Mail, Shield } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen pb-24 bg-[#f8f9fa]">
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-[#111827]">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Profile Card */}
        <div className="rounded-2xl bg-white border border-[#e5e7eb] p-5 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-4">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111827] truncate">{user?.email}</p>
                <p className="text-xs text-[#6b7280]">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-white border border-[#e5e7eb] p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-2">Details</h2>
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-[#6b7280]" />
            <span className="text-[#111827]">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield size={16} className="text-[#6b7280]" />
            <span className="text-[#111827]">
              {user?.app_metadata?.provider === 'google' ? 'Signed in with Google' : 'Email & password'}
            </span>
          </div>
        </div>

        {/* Data Info */}
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-5">
          <p className="text-sm text-blue-800 leading-relaxed">
            Your workout programs, chat history, progress data, and health connections are all synced to your account. Sign in on any device to access everything.
          </p>
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <Navigation />
    </div>
  );
}
