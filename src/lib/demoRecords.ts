const DEMO_ROOM_IDS = new Set([
  'room_dawn_intercession',
  'room_morning_prayer',
  'room_midday_intercession',
  'room_sunday_prayer',
  'room_friday_vigil',
]);

export function isDemoRoomId(id: string): boolean {
  return DEMO_ROOM_IDS.has(id);
}

export function isDemoHistoryId(id: string): boolean {
  return id.startsWith('session_hist_');
}

export function isDemoRequestId(id: string): boolean {
  return /^req_[1-5]$/.test(id);
}
