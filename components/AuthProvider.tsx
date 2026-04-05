'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Check if Supabase is properly configured (not placeholder values)
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes('your-project');
}

// Fake user for when Supabase isn't configured
const LOCAL_USER: User = {
  id: 'local-user',
  email: 'local@elitecoach.app',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If Supabase isn't configured, use local mode (no auth required)
    if (!isSupabaseConfigured()) {
      setUser(LOCAL_USER);
      setSession(null);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect to login if not authenticated (only when Supabase is configured)
  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && isSupabaseConfigured()) {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.replace('/login');
  };

  // Show nothing while checking auth (prevents flash)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fa]">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white mb-2">
            ELITE <span className="text-[#1e3a5f]">COACH</span>
          </h1>
          <div className="flex gap-1.5 justify-center mt-4">
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1e3a5f]/100" />
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1e3a5f]/100" />
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1e3a5f]/100" />
          </div>
        </div>
      </div>
    );
  }

  // Show login page without wrapping it in auth protection
  if (!user && pathname === '/login') {
    return (
      <AuthContext.Provider value={{ user, session, loading, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Not logged in and not on login page — show nothing (redirect is happening)
  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
