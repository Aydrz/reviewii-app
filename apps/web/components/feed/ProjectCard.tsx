'use client';

import Link from 'next/link';
import { MessageSquare, CheckCircle, Share2, MoreVertical } from 'lucide-react';
import { Project } from '@reviewii/shared-types';
import { getFullMediaUrl } from '../../lib/api-client';
import { useToast } from '../Toast';

interface ProjectCardProps {
  project: Project;
  guestToken?: string;
}

export default function ProjectCard({ project, guestToken }: ProjectCardProps) {
  const { toast } = useToast();
  const latestVersion = project.versions?.[0];
  const commentCount = latestVersion?.comments?.length || 0;
  const targetUrl = guestToken ? `/review/${guestToken}` : `/project/${project.id}`;

  const statusColors = {
    pending: 'bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30',
    revisi: 'bg-[#EB5757]/20 text-[#EB5757] border-[#EB5757]/30',
    approved: 'bg-[#2ECC71]/20 text-[#2ECC71] border-[#2ECC71]/30',
  };

  const statusLabels = {
    pending: 'Pending Review',
    revisi: 'Perlu Revisi',
    approved: 'Approved',
  };

  const mediaUrl = latestVersion?.proxy_url || latestVersion?.file_url;
  const fullMediaUrl = getFullMediaUrl(mediaUrl);

  return (
    <div className="bg-[#1E293B]/80 rounded-2xl border border-white/10 overflow-hidden shadow-md transition-all hover:border-white/20">
      {/* Card Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2563FF] text-white font-bold flex items-center justify-center text-sm shadow-sm">
            {project.client_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white leading-tight">{project.title}</h3>
            <p className="text-xs text-neutral-400">{project.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
          <button className="text-neutral-400 hover:text-white p-1">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Preview Container */}
      <Link href={targetUrl} className="block relative aspect-video bg-black cursor-pointer group">
        {latestVersion?.file_type === 'photo' ? (
          <img
            src={fullMediaUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80'}
            alt={project.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <video
            src={fullMediaUrl}
            poster={getFullMediaUrl(latestVersion?.thumbnail_url)}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <span className="text-xs font-semibold bg-[#2563FF] text-white px-3 py-1.5 rounded-full shadow-md">
            Buka Player & Review →
          </span>
        </div>
      </Link>

      {/* Card Footer Actions */}
      <div className="p-4 flex items-center justify-between text-xs text-neutral-300 border-t border-white/5">
        <div className="flex items-center gap-4">
          <Link href={targetUrl} className="flex items-center gap-1.5 text-neutral-300 hover:text-[#2563FF]">
            <MessageSquare className="w-4 h-4 text-[#2563FF]" />
            <span className="font-medium">{commentCount} Komentar</span>
          </Link>
          {latestVersion?.approvals && latestVersion.approvals.length > 0 && (
            <div className="flex items-center gap-1 text-[#2ECC71]">
              <CheckCircle className="w-4 h-4" />
              <span>Approved</span>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            const guestLink = project.guest_tokens?.[0]?.token
              ? `${window.location.origin}/review/${project.guest_tokens[0].token}`
              : window.location.href;
            navigator.clipboard.writeText(guestLink);
            toast.success('Guest link berhasil disalin!');
          }}
          className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>Bagikan Link</span>
        </button>
      </div>
    </div>
  );
}
