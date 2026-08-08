'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X } from 'lucide-react';
import ProjectCard from '../../components/feed/ProjectCard';
import { fetchApi } from '../../lib/api-client';
import { Project } from '@reviewii/shared-types';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects', 'search', searchTerm],
    queryFn: () => fetchApi<Project[]>(`/projects?search=${encodeURIComponent(searchTerm)}`),
  });

  return (
    <div className="flex flex-col min-h-screen p-4 space-y-4">
      <header className="sticky top-0 z-40 bg-[#0F172A] py-2">
        <div className="relative flex items-center">
          <SearchIcon className="w-5 h-5 absolute left-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari project atau nama klien…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#2563FF]"
            autoFocus
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-neutral-400">Mencari project…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-400">
            {searchTerm ? `Tidak ditemukan project dengan kata kunci "${searchTerm}"` : 'Ketik di atas untuk mencari project.'}
          </div>
        ) : (
          projects.map((project) => <ProjectCard key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}
