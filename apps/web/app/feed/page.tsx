'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, User, Film } from 'lucide-react';
import Link from 'next/link';
import StoryBar from '../../components/feed/StoryBar';
import ProjectCard from '../../components/feed/ProjectCard';
import { fetchApi } from '../../lib/api-client';
import { Project } from '@reviewii/shared-types';

export default function FeedPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects', filterStatus],
    queryFn: () => fetchApi<Project[]>(`/projects${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`),
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-6 h-6 text-[#2563FF]" />
          <h1 className="font-extrabold text-lg tracking-tight text-white">Reviewii</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/notifications" aria-label="Notifikasi" className="relative p-1.5 text-neutral-300 hover:text-white">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#EB5757] rounded-full" />
          </Link>
          <Link href="/profile" aria-label="Profil" className="p-1.5 text-neutral-300 hover:text-white">
            <User className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Story Bar */}
      <StoryBar />

      {/* Status Filter Tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none border-b border-white/5">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'pending', label: '🟡 Pending' },
          { id: 'revisi', label: '🔴 Perlu Revisi' },
          { id: 'approved', label: '🟢 Approved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === tab.id
                ? 'bg-[#2563FF] text-white shadow-sm'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Vertical Feed */}
      <div className="p-4 space-y-4 flex-1">
        {isLoading ? (
          <div className="space-y-4 py-8">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 bg-neutral-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Film className="w-12 h-12 text-neutral-600 mx-auto" />
            <p className="text-sm text-neutral-400">Belum ada project {filterStatus !== 'all' ? `dengan status ${filterStatus}` : ''}.</p>
            <Link
              href="/upload"
              className="inline-block px-4 py-2 bg-[#2563FF] hover:bg-[#1A46CC] text-white font-semibold text-xs rounded-xl shadow-md"
            >
              + Upload Project Baru
            </Link>
          </div>
        ) : (
          projects.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}
