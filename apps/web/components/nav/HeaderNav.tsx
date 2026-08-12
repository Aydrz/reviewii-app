'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, UploadCloud, LogOut } from 'lucide-react';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login' || pathname.startsWith('/review/')) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('editor_auth');
    localStorage.removeItem('editor_name');
    router.push('/login');
  };

  return (
    <header className="sticky top-3 z-50 mx-auto max-w-5xl w-[calc(100%-1.5rem)] rounded-2xl bg-[#0c1017]/85 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-2.5 flex items-center justify-between transition-all">
      <Link href="/dashboard" className="flex items-center gap-3 group">
        <div className="p-1 rounded-xl bg-white/5 border border-white/10 group-hover:border-cyan-400/50 transition-colors">
          <img
            src="/simba-logo.png"
            alt="Simba Logo"
            width={28}
            height={28}
            className="w-7 h-7 object-contain flex-shrink-0"
          />
        </div>
        <div>
          <span className="font-black text-sm text-white tracking-tight leading-none block font-sans">Reviewii</span>
          <span className="text-[10px] text-cyan-400 font-mono font-medium">Editor Portal</span>
        </div>
      </Link>

      <nav className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-1.5 px-3 py-2 sm:px-3.5 rounded-xl text-xs font-bold transition-all ${
            pathname === '/dashboard' || pathname === '/'
              ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,201,0.2)]'
              : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <Link
          href="/upload"
          className={`flex items-center gap-1.5 px-3 py-2 sm:px-3.5 rounded-xl text-xs font-bold transition-all ${
            pathname === '/upload'
              ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,240,201,0.2)]'
              : 'bg-white/5 text-neutral-200 hover:bg-white/10 border border-white/10'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Upload Video</span>
        </Link>

        <button
          onClick={handleLogout}
          title="Keluar Admin"
          className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all ml-0.5"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </nav>
    </header>
  );
}
