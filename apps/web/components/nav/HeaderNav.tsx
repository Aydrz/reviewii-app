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
    <header className="glass-panel border-b border-white/10 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <Link href="/dashboard" className="flex items-center gap-3">
        <img
          src="/simba-logo.png"
          alt="Simba Logo"
          width={32}
          height={32}
          style={{ width: '32px', height: '32px', maxWidth: '32px', maxHeight: '32px' }}
          className="w-8 h-8 object-contain flex-shrink-0"
        />
        <div>
          <span className="font-black text-base text-white tracking-tight leading-none block font-sans">Reviewii</span>
          <span className="text-[10px] text-cyber-blue font-medium">Editor Admin Portal</span>
        </div>
      </Link>

      <nav className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            pathname === '/dashboard' || pathname === '/'
              ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shadow-[0_0_12px_rgba(0,240,201,0.2)]'
              : 'text-neutral-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-cyber-cyan" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/upload"
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            pathname === '/upload'
              ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shadow-[0_0_12px_rgba(0,240,201,0.2)]'
              : 'bg-white/5 text-neutral-200 hover:bg-white/10 border border-white/10'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-white" />
          <span>Upload Video</span>
        </Link>

        <button
          onClick={handleLogout}
          title="Keluar Admin"
          className="p-2 text-neutral-400 hover:text-cyber-red hover:bg-white/5 rounded-xl transition-colors ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </nav>
    </header>
  );
}
