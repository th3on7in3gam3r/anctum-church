import type { Prisma } from '@prisma/client';

export const HOME_STRIP = ['Sunday', 'Wednesday Upper Room', 'Friday Intercessors'] as const;

export const serviceTimes = [
  { name: 'Sunday Service', homeLabel: 'Sunday', cadence: 'WEEKLY', weekday: 'Sunday', opens: '10:00', closes: '12:30', startLabel: '10:00 a.m.', endLabel: '12:30 p.m.', place: 'Church building', note: null, showOnHome: true, sortOrder: 0, isPlaceholder: false },
  { name: 'New Members & New Believers', homeLabel: null, cadence: 'WEEKLY', weekday: 'Sunday', opens: '09:00', closes: '10:00', startLabel: '9:00 a.m.', endLabel: '10:00 a.m.', place: null, note: 'Before the Sunday service.', showOnHome: false, sortOrder: 1, isPlaceholder: false },
  { name: 'Wednesday Evangelism Outreach', homeLabel: null, cadence: 'WEEKLY', weekday: 'Wednesday', opens: '13:00', closes: '14:00', startLabel: '1:00 p.m.', endLabel: '2:00 p.m.', place: null, note: null, showOnHome: false, sortOrder: 2, isPlaceholder: false },
  { name: 'Wednesday Upper Room Service', homeLabel: 'Wednesday Upper Room', cadence: 'WEEKLY', weekday: 'Wednesday', opens: '17:00', closes: '18:00', startLabel: '5:00 p.m.', endLabel: '6:00 p.m.', place: null, note: null, showOnHome: true, sortOrder: 3, isPlaceholder: false },
  { name: "Friday Intercessors' Service", homeLabel: 'Friday Intercessors', cadence: 'WEEKLY', weekday: 'Friday', opens: '18:00', closes: '20:00', startLabel: '6:00 p.m.', endLabel: '8:00 p.m.', place: 'First floor', note: null, showOnHome: true, sortOrder: 4, isPlaceholder: false },
  { name: 'Tuesday Counselling', homeLabel: null, cadence: 'WEEKLY', weekday: 'Tuesday', opens: '10:00', closes: '15:00', startLabel: '10:00 a.m.', endLabel: '3:00 p.m.', place: null, note: 'Free.', showOnHome: false, sortOrder: 5, isPlaceholder: false },
  { name: 'Daily Morning Glory', homeLabel: null, cadence: 'DAILY', weekday: null, opens: '06:30', closes: '07:30', startLabel: '6:30 a.m.', endLabel: '7:30 a.m.', place: null, note: 'With Ps. GraceLove Hiire.', showOnHome: false, sortOrder: 6, isPlaceholder: false },
  { name: 'Lunch Hour Service', homeLabel: null, cadence: 'DAILY', weekday: null, opens: '13:30', closes: '14:00', startLabel: '1:30 p.m.', endLabel: '2:00 p.m.', place: null, note: null, showOnHome: false, sortOrder: 7, isPlaceholder: false },
  { name: 'Midnight Watch', homeLabel: null, cadence: 'DAILY', weekday: null, opens: '22:30', closes: '00:30', startLabel: '10:30 p.m.', endLabel: '12:30 a.m.', place: null, note: null, showOnHome: false, sortOrder: 8, isPlaceholder: false },
  { name: 'Monthly overnight prayer', homeLabel: null, cadence: 'MONTHLY', weekday: null, opens: '21:00', closes: '05:00', startLabel: '9:00 p.m.', endLabel: '5:00 a.m.', place: null, note: 'The current website says the end of every month. The day is still being confirmed, and the venue is announced ahead of time.', showOnHome: false, sortOrder: 9, isPlaceholder: true },
] as const;

export const missionText = 'Our mission is to reach the lost, restore the broken, and raise disciples to live boldly for Christ in every area of life.';

export const visionText = 'We see a Spirit-led church where people encounter God, experience transformation, and are empowered by the Holy Spirit to live on mission every day.';

export const storyText = 'PLCC ministry began on the knees of a woman, in her bedroom, on a small mat beside her bed, somewhere around 2022. She knelt and prayed every night and day for close to a year until the instruction came to start what is now a growing ministry. From that bedroom rose a prayer altar, starting with about 12 members, which became Promised Land Christian Centre. Church started in the living room of Mr and Mrs Hiire’s home. Ps Grace was the first pastor at home. She was also the choir and the usher, and the congregation was the empty chairs in the room. She kept prophesying people into those chairs, and before long it manifested. Her husband, a minister at a former church, joined her. Families joined, the house was no longer enough, and then there came PLCC.';

export const visitPoints = [
  'Arrive about 30 minutes early.',
  'Come as you are.',
  'You will not be asked to stand. You may raise a hand.',
  'Worship is contemporary and traditional, with lyrics on the screen.',
  'Bring a Bible.',
  'Children’s programmes run every service, with background-checked workers.',
  'Parking is on the church grounds, with security present.',
  'Visit the Welcome Desk.',
];

export const homePageBody: Prisma.InputJsonValue = [
  { type: 'paragraph', text: 'Changing Hearts. Transforming Lives.' },
  { type: 'heading', text: 'A word from our pastor', level: 2 },
  { type: 'paragraph', text: 'We know visiting a new church can feel like a big step. Come as you are. There is a place for you here, wherever you are in your walk with Christ.' },
  { type: 'heading', text: 'Service times', level: 2 },
  { type: 'paragraph', text: 'Sunday\n10:00 a.m.–12:30 p.m.\nSunday\nSunday Service. Church building.' },
  { type: 'paragraph', text: 'Wednesday\n5:00–6:00 p.m.\nWednesday Upper Room\nUpper Room Service.' },
  { type: 'paragraph', text: 'Friday\n6:00–8:00 p.m.\nFriday Intercessors\nIntercessors’ Service. First floor.' },
  { type: 'paragraph', text: 'Sunday\n9:00–10:00 a.m.\nNew Members & New Believers\nBefore the Sunday service.' },
  { type: 'paragraph', text: 'Wednesday\n1:00–2:00 p.m.\nWednesday Evangelism Outreach\nOutreach.' },
  { type: 'paragraph', text: 'Tuesday\n10:00 a.m.–3:00 p.m.\nTuesday Counselling\nFree.' },
  { type: 'paragraph', text: 'Daily\n6:30–7:30 a.m.\nDaily Morning Glory\nWith Ps. GraceLove Hiire.' },
  { type: 'paragraph', text: 'Daily\n1:30–2:00 p.m.\nLunch Hour Service\nMidday worship and the Word.' },
  { type: 'paragraph', text: 'Daily\n10:30 p.m.–12:30 a.m.\nMidnight Watch\nNight prayer.' },
  { type: 'paragraph', text: 'Monthly\n9:00 p.m.–5:00 a.m.\nMonthly overnight prayer\nThe current website says the end of every month. The day is still being confirmed.' },
  { type: 'heading', text: 'Plan a visit', level: 2 },
  ...visitPoints.map((text) => ({ type: 'paragraph' as const, text })),
];

export const aboutPageBody: Prisma.InputJsonValue = [
  { type: 'paragraph', text: 'Promised Land Christian Center gathers in Kira-Kitukutwe, Wakiso District. Come as you are.' },
  { type: 'heading', text: 'Mission', level: 2 },
  { type: 'paragraph', text: missionText },
  { type: 'heading', text: 'Vision', level: 2 },
  { type: 'paragraph', text: visionText },
  { type: 'heading', text: 'Story', level: 2 },
  { type: 'paragraph', text: storyText },
];

export const leadershipPageBody: Prisma.InputJsonValue = [
  { type: 'paragraph', text: 'Pastor Grace Hiire and Pastor Kennedy Hiire serve as Senior Pastors.' },
];

export const leaders = [
  { name: 'Pastor Grace Hiire', also: ['Pastor GraceLove Hiire'], role: 'Senior Pastor', bio: 'Pastor Grace is a woman of deep faith and prayer, passionate about seeing lives transformed by the gospel of Christ.', sortOrder: 0, isPlaceholder: true },
  { name: 'Pastor Kennedy Hiire', also: [] as string[], role: 'Senior Pastor', bio: 'Pastor Kennedy is a devoted servant of God, committed to teaching the Word and leading the church in worship and mission.', sortOrder: 1, isPlaceholder: true },
];

export const faqs = [
  { question: 'What time should I arrive?', answer: 'Arrive about 30 minutes before the service. That gives you time to park, visit the Welcome Desk, and be shown to a seat.', sortOrder: 0 },
  { question: 'What should I wear?', answer: 'Come as you are. Casual clothes, jeans, or business casual are all welcome. Dress in a way that is comfortable, modest, and respectful.', sortOrder: 1 },
  { question: 'Will I be singled out as a visitor?', answer: 'You will not be asked to stand. You may raise a hand. The welcome team will greet you and give you a visitor’s form.', sortOrder: 2 },
  { question: 'What’s the music like?', answer: 'Worship is contemporary and traditional, with modern praise and updated hymns. The lyrics are shown on the screen.', sortOrder: 3 },
  { question: 'Do I need to bring a Bible?', answer: 'Bring a Bible if you can, and a notebook if you like. Scripture is also shown on the screens.', sortOrder: 4 },
  { question: 'What’s available for my children?', answer: 'Children’s programmes run during the services. The workers are background-checked. Children get age-appropriate Bible lessons, music, and activities.', sortOrder: 5 },
  { question: 'Where do I park?', answer: 'Parking is on the church grounds. Ushers can guide you, and security is present during services.', sortOrder: 6 },
  { question: 'Are counselling sessions paid for?', answer: 'No. Counselling is free. Sessions are on Tuesday from 10:00 a.m. to 3:00 p.m. Please keep the time you booked.', sortOrder: 7 },
  { question: 'Can I attend services online?', answer: 'Yes. Services are on the church YouTube channel, @PLCCGRACELOVE.', sortOrder: 8 },
  { question: 'Where is the church located?', answer: 'Kira-Kitukutwe Trading Center, Wakiso District, Uganda.', sortOrder: 9 },
];

export const faithSermon = {
  title: 'The Power of Faith',
  speaker: 'Pastor GraceLove Hiire',
  scripture: 'Matthew 17:20',
  preachedOn: '2025-09-11',
  youtubeUrl: 'https://www.youtube.com/live/loQt6FfHuEA',
  notes: 'Faith the size of a seed is enough when it rests on God.',
};

export const youtubeChannel = '@PLCCGRACELOVE';

export const retiredPlaceholderEvents = [
  'Sunday worship',
  '[PLACEHOLDER] Sunday worship',
  'Community prayer night',
  '[PLACEHOLDER] Community prayer night',
  'Youth gathering',
  '[PLACEHOLDER] Youth gathering',
];

export const retiredPlaceholderLeaders = ['Worship team', 'Children ministry'];
