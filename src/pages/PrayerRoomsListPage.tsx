import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PrayerRoomCard } from '../components/dashboard/PrayerRoomCard';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Search } from 'lucide-react';

interface PrayerRoomsListPageProps {
  onNavigate: (path: string) => void;
}

export const PrayerRoomsListPage: React.FC<PrayerRoomsListPageProps> = ({ onNavigate }) => {
  const { prayerRooms = [] } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LIVE' | 'RECURRING' | 'SCHEDULED'>('ALL');

  const filteredRooms = (prayerRooms || []).filter((room) => {
    if (!room || room.isArchived) return false;
    const matchesSearch =
      (room.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'LIVE') return room.status === 'LIVE';
    if (filterType === 'RECURRING') return room.isRecurring;
    if (filterType === 'SCHEDULED') return room.status === 'SCHEDULED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
            Prayer Rooms
          </h1>
          <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] mt-1">
            Manage your church's corporate prayer altars and gathering links.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/dashboard/prayer-rooms/new')}
          type="button"
          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Prayer Room</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#17221D] p-3 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prayer rooms..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#F8F7F3]/70 dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] border border-transparent focus:border-[#203C32] dark:focus:border-[#C9A35A] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Rooms' },
            { id: 'LIVE', label: 'Live Now' },
            { id: 'RECURRING', label: 'Daily / Recurring' },
            { id: 'SCHEDULED', label: 'Upcoming' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterType === tab.id
                  ? 'bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]'
                  : 'text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <EmptyState
          title="No prayer rooms found"
          description={
            searchQuery
              ? `No rooms match "${searchQuery}". Try a different keyword.`
              : 'Create your first prayer altar to begin gathering your congregation.'
          }
          actionText="Create Prayer Room"
          onAction={() => onNavigate('/dashboard/prayer-rooms/new')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <PrayerRoomCard
              key={room.id}
              room={room}
              onOpenDetails={(id) => onNavigate(`/dashboard/prayer-rooms/${id}`)}
              onOpenControlRoom={(id) => onNavigate(`/dashboard/prayer-rooms/${id}/control`)}
              onOpenJoinPage={(slug) => window.open(`${window.location.origin}/join/${slug}`, '_blank', 'noopener,noreferrer')}
              onEdit={(id) => onNavigate(`/dashboard/prayer-rooms/${id}/edit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
