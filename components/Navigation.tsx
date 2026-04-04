'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Dumbbell, Activity } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/chat', label: 'Coach', icon: MessageSquare },
  { href: '/program', label: 'Program', icon: Dumbbell },
  { href: '/whoop', label: 'Recovery', icon: Activity },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5e7eb] bg-white/95 backdrop-blur-sm safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                active ? 'text-[#1e3a5f]' : 'text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
