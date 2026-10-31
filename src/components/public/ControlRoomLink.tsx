import React from 'react';

export const ControlRoomLink: React.FC<{ roomId: string }> = ({ roomId }) => (
  <a
    href={`/dashboard/prayer-rooms/${roomId}/control`}
    className="sanctum-chip inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold"
  >
    Open control room
  </a>
);
