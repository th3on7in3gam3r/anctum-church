export const SEED_ORG_ID = 'org_promised_land_christian_center';

export const SEED_MEMBERSHIPS: Array<{
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'PRAYER_LEADER' | 'TECHNICAL_ADMIN';
}> = [
  { id: 'user_pastor_gracelove', name: 'Pastor GraceLove Hiire', email: 'promisedlandchc@gmail.com', role: 'OWNER' },
  { id: 'user_admin_grace', name: 'Grace Nakato', email: 'grace@plcc.local', role: 'ADMIN' },
  { id: 'user_leader_robert', name: 'Pastor Robert K.', email: 'robert@plcc.local', role: 'PRAYER_LEADER' },
  { id: 'user_leader_emmanuel', name: 'Elder Emmanuel T.', email: 'emmanuel@plcc.local', role: 'PRAYER_LEADER' },
  { id: 'user_leader_sarah', name: 'Sarah Prayer Leader', email: 'sarah@plcc.local', role: 'PRAYER_LEADER' },
  { id: 'user_tech_daniel', name: 'Daniel Technical', email: 'daniel@plcc.local', role: 'TECHNICAL_ADMIN' },
];
