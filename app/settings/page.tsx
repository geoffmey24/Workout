'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, Mail, Shield, Moon, Sun, Scale, Download, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/components/AuthProvider';
import { dbGetDarkMode, dbSetDarkMode, dbGetUserProfile, dbSaveUserProfile, dbGetActiveProgram } from '@/lib/db';
import { SavedProgram } from '@/lib/program-history';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [activeProgram, setActiveProgram] = useState<SavedProgram | null>(null);

  useEffect(() => {
    setDarkMode(dbGetDarkMode());
    if (user) {
      dbGetActiveProgram(user.id).then(setActiveProgram);
    }
  }, [user]);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    dbSetDarkMode(newVal);
    document.documentElement.classList.toggle('dark', newVal);
  };

  const handleExportProgram = () => {
    if (!activeProgram) return;
    const content = `# ${activeProgram.title}\n\nGenerated: ${new Date(activeProgram.createdAt).toLocaleDateString()}\n\n${activeProgram.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProgram.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pb-24 bg-[#f8f9fa] dark:bg-[#111827]">
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white dark:bg-[#1f2937] px-4 py-3">
        <Link href="/" className="text-[#6b7280] hover:text-[#111827] dark:hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-bold text-sm text-[#111827] dark:text-white">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Profile Card */}
        <div className="rounded-2xl bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] p-5 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-4">Account</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{user?.email}</p>
              <p className="text-xs text-[#6b7280]">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-2xl bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] shadow-sm divide-y divide-[#e5e7eb] dark:divide-[#374151]">
          <Link href="/body-stats" className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#374151] transition-colors">
            <Scale size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-[#111827] dark:text-white flex-1">Body Stats & Measurements</span>
            <ChevronRight size={16} className="text-[#9ca3af]" />
          </Link>
          {activeProgram && (
            <button onClick={handleExportProgram} className="flex items-center gap-3 px-5 py-4 w-full text-left hover:bg-gray-50 dark:hover:bg-[#374151] transition-colors">
              <Download size={18} className="text-green-600" />
              <span className="text-sm font-medium text-[#111827] dark:text-white flex-1">Export Active Program</span>
              <ChevronRight size={16} className="text-[#9ca3af]" />
            </button>
          )}
        </div>

        {/* Preferences */}
        <div className="rounded-2xl bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] p-5 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-4">Preferences</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-yellow-500" />}
              <span className="text-sm font-medium text-[#111827] dark:text-white">Dark Mode</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] mb-2">Details</h2>
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-[#6b7280]" />
            <span className="text-[#111827] dark:text-white">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield size={16} className="text-[#6b7280]" />
            <span className="text-[#111827] dark:text-white">
              {user?.app_metadata?.provider === 'google' ? 'Signed in with Google' : 'Email & password'}
            </span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white dark:bg-[#1f2937] py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <Navigation />
    </div>
  );
}
