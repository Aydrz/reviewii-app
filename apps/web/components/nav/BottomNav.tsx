'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide BottomNav on guest review pages to keep full screen player clean
  if (pathname.startsWith('/review/')) {
    return null;
  }

  const navItems = [
    { href: '/feed', label: 'Feed', icon: Home },
    { href: '/search', label: 'Cari', icon: Search },
    { href: '/upload', label: 'Upload', icon: PlusCircle, isCenter: true },
    { href: '/notifications', label: 'Notifikasi', icon: Bell, badge: 3 },
    { href: '/profile', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex justify-around items-center max-w-md mx-auto sm:max-w-lg md:max-w-xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        if (item.isCenter) {
          return (
            <Link key={item.href} href={item.href} aria-label="Upload Project Baru" className="relative -top-3">
              <div className="bg-[#2563FF] hover:bg-[#1A46CC] text-white p-3.5 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer">
                <PlusCircle className="w-7 h-7" />
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              isActive ? 'text-[#2563FF]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-[#EB5757] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
