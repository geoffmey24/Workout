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

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
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
  }, [supabase.auth]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  // Show nothing while checking auth (prevents flash)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fa]">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-[#111827] mb-2">
            ELITE <span className="text-blue-600">COACH</span>
          </h1>
          <div className="flex gap-1.5 justify-center mt-4">
            <span className="typing-dot h-2 w-2 rounded-full bg-blue-500" />
            <span className="typing-dot h-2 w-2 rounded-full bg-blue-500" />
            <span className="typing-dot h-2 w-2 rounded-full bg-blue-500" />
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
