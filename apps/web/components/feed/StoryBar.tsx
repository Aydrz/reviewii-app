'use client';

interface StoryItem {
  id: string;
  client_name: string;
  hasUnseen: boolean;
  avatarLetter: string;
  color: string;
}

export default function StoryBar() {
  const stories: StoryItem[] = [
    { id: '1', client_name: 'Klien A', hasUnseen: true, avatarLetter: 'A', color: 'from-[#2563FF] to-[#EC4899]' },
    { id: '2', client_name: 'Wedding B', hasUnseen: true, avatarLetter: 'W', color: 'from-[#2563FF] to-[#2ECC71]' },
    { id: '3', client_name: 'Company C', hasUnseen: false, avatarLetter: 'C', color: 'from-gray-600 to-gray-700' },
    { id: '4', client_name: 'Studio D', hasUnseen: true, avatarLetter: 'D', color: 'from-[#EC4899] to-[#F5A623]' },
    { id: '5', client_name: 'Brand E', hasUnseen: false, avatarLetter: 'E', color: 'from-gray-600 to-gray-700' },
  ];

  return (
    <div className="w-full overflow-x-auto py-3 px-4 flex gap-4 scrollbar-none border-b border-white/10">
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1 min-w-[64px] cursor-pointer">
          <div className={`p-0.5 rounded-full bg-gradient-to-tr ${story.color}`}>
            <div className="bg-[#0F172A] p-0.5 rounded-full">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg text-white border border-white/10">
                {story.avatarLetter}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-neutral-300 truncate max-w-[64px]">{story.client_name}</span>
        </div>
      ))}
    </div>
  );
}
