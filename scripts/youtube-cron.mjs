const base = (process.env.APP_URL || '').replace(/\/$/, '');
const secret = process.env.CRON_SECRET || '';
if (!base || !secret) {
  console.error('APP_URL and CRON_SECRET are required.');
  process.exit(1);
}

const response = await fetch(`${base}/api/cron/youtube-import`, {
  method: 'POST',
  headers: { 'x-cron-secret': secret },
});
if (!response.ok) {
  console.error(`YouTube import returned ${response.status}`);
  process.exit(1);
}
console.log('YouTube import finished');
