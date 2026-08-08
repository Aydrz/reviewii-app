'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, CheckCircle2, Folder, HardDrive, Settings, Grid3X3 } from 'lucide-react';
import { fetchApi, getFullMediaUrl } from '../../lib/api-client';
import { Project } from '@reviewii/shared-types';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'approved'>('all');

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects', 'profile'],
    queryFn: () => fetchApi<Project[]>('/projects'),
  });

  const approvedProjects = projects.filter((p) => p.status === 'approved');
  const displayedProjects = activeTab === 'approved' ? approvedProjects : projects;

  return (
    <div className="flex flex-col min-h-screen p-4 space-y-6">
      {/* Editor Header Info */}
      <div className="flex items-center gap-4 bg-neutral-900/60 p-4 rounded-3xl border border-white/5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2563FF] to-[#EC4899] p-0.5 shadow-lg">
          <div className="w-full h-full rounded-full bg-neutral-800 flex items-center justify-center font-extrabold text-xl text-white">
            N
          </div>
        </div>
        <div>
          <h1 className="font-extrabold text-base text-white">Naufal (Editor)</h1>
          <p className="text-xs text-neutral-400">Solo Video & Photo Editor</p>
          <div className="flex gap-3 text-xs text-neutral-300 mt-2">
            <span>
              <strong className="text-white font-bold">{projects.length}</strong> Project
            </span>
            <span>
              <strong className="text-[#2ECC71] font-bold">{approvedProjects.length}</strong> Approved
            </span>
          </div>
        </div>
      </div>

      {/* Approved Collection Highlights */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" /> Approved Collection (Portofolio)
        </h2>
        <div className="flex gap-3 overflow-x-auto py-2 scrollbar-none">
          {approvedProjects.length === 0 ? (
            <span className="text-xs text-neutral-500 py-2">Belum ada project yang di-approve.</span>
          ) : (
            approvedProjects.map((p) => (
              <div key={p.id} className="flex flex-col items-center min-w-[70px]">
                <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-[#2ECC71]/40 overflow-hidden shadow-md">
                  <img
                    src={getFullMediaUrl(p.versions?.[0]?.thumbnail_url) || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=200&q=80'}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] text-neutral-300 truncate max-w-[70px] mt-1">{p.title}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Settings / Drive Section */}
      <div className="bg-neutral-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
        <h2 className="text-xs font-bold text-[#2563FF] uppercase tracking-wider flex items-center gap-1.5">
          <Settings className="w-4 h-4" /> System & Storage Status
        </h2>
        <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
          <div className="flex items-center gap-2 text-neutral-200">
            <HardDrive className="w-4 h-4 text-[#2ECC71]" /> Google Drive Storage Status
          </div>
          <span className="text-[11px] font-semibold bg-[#2ECC71]/20 text-[#2ECC71] px-2.5 py-0.5 rounded-full border border-[#2ECC71]/30">
            Active / Ready
          </span>
        </div>
      </div>

      {/* Grid View */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <div className="flex gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 transition-colors flex items-center gap-1 ${
                activeTab === 'all' ? 'text-[#2563FF] border-b-2 border-[#2563FF]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" /> Semua Grid ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`pb-2 transition-colors flex items-center gap-1 ${
                activeTab === 'approved' ? 'text-[#2ECC71] border-b-2 border-[#2ECC71]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Approved ({approvedProjects.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {displayedProjects.map((p) => (
            <a
              key={p.id}
              href={`/project/${p.id}`}
              className="relative aspect-square bg-neutral-800 rounded-xl overflow-hidden group border border-white/5 hover:border-white/20"
            >
              <img
                src={getFullMediaUrl(p.versions?.[0]?.thumbnail_url) || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=300&q=80'}
                alt={p.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <span
                className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black ${
                  p.status === 'approved' ? 'bg-[#2ECC71]' : p.status === 'revisi' ? 'bg-[#EB5757]' : 'bg-[#F5A623]'
                }`}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
