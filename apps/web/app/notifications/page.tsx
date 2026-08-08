'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api-client';
import { Notification } from '@reviewii/shared-types';

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetchApi<Notification[]>('/notifications'),
  });

  return (
    <div className="flex flex-col min-h-screen p-4 space-y-4">
      <header className="py-2 border-b border-white/10 flex items-center justify-between">
        <h1 className="font-extrabold text-lg text-white">Notifikasi</h1>
        <span className="text-xs text-neutral-400 font-medium">{notifications.length} Total</span>
      </header>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-neutral-400">Memuat notifikasi…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Bell className="w-12 h-12 text-neutral-600 mx-auto" />
            <p className="text-xs text-neutral-400">Belum ada notifikasi baru.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-colors ${
                notif.is_read ? 'bg-neutral-900/60 border-white/5 text-neutral-400' : 'bg-[#1E293B] border-[#2563FF]/40 text-white'
              }`}
            >
              <div className="p-2 rounded-full bg-[#2563FF]/20 text-[#2563FF]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium leading-relaxed">{notif.type}</p>
                <span className="text-[10px] text-neutral-400 block mt-1">
                  {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
