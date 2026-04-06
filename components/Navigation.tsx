'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MaterialIcon from './MaterialIcon';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/chat', label: 'Coach', icon: 'chat_bubble' },
  { href: '/program', label: 'Program', icon: 'fitness_center' },
  { href: '/whoop', label: 'Recovery', icon: 'monitor_heart' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-50/80 backdrop-blur-md rounded-t-xl shadow-[0_-4px_24px_rgba(25,28,29,0.06)] safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors rounded-xl ${
                active
                  ? 'text-blue-900 bg-blue-100/50'
                  : 'text-secondary'
              }`}
            >
              <MaterialIcon icon={icon} filled={active} size={22} />
              <span className={`text-[10px] font-label ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
