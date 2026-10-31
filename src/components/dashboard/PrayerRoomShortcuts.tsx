import React from 'react';
import { useApp } from '../../context/AppContext';

export const PrayerRoomShortcuts: React.FC<{
  onNavigate: (path: string) => void;
}> = ({ onNavigate }) => {
  const { prayerRooms } = useApp();
  const rooms = prayerRooms.filter((room) => room && !room.isArchived);
  if (!rooms.length) return null;

  return (
    <div className="space-y-1 pl-2">
      {rooms.map((room) => (
        <div key={room.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate(`/dashboard/prayer-rooms/${room.id}`)}
            className="min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-left text-[11px] font-semibold text-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5"
          >
            {room.name}
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/dashboard/prayer-rooms/${room.id}/control`)}
            className="staff-chip shrink-0 cursor-pointer rounded-full bg-green/10 px-2 py-1 text-[10px] font-bold text-green dark:bg-gold/15 dark:text-gold"
          >
            Control room
          </button>
        </div>
      ))}
    </div>
  );
};
