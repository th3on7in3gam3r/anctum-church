import { describe, expect, it } from 'vitest';
import { serviceTimes } from '../shared/plccContent.ts';
import { groupSchedule, scheduleFromHome, scheduleFromServiceTimes } from '../site/lib/schedule.ts';

const rows = serviceTimes.map((time, index) => ({ ...time, id: `t${index}` }));

describe('homepage schedule', () => {
  it('shows every service, grouped by cadence', () => {
    const { weekly, daily, monthly } = groupSchedule(scheduleFromServiceTimes(rows));
    expect(weekly.length + daily.length + monthly.length).toBe(serviceTimes.length);
    expect(daily.map((item) => item.name)).toEqual(['Daily Morning Glory', 'Lunch Hour Service', 'Midnight Watch']);
    expect(monthly.map((item) => item.name)).toEqual(['Monthly overnight prayer']);
  });

  it('orders the week Sunday first and uses full service names', () => {
    const { weekly } = groupSchedule(scheduleFromServiceTimes(rows));
    expect(weekly.map((item) => item.day)).toEqual(['SUN', 'SUN', 'TUE', 'WED', 'WED', 'FRI']);
    expect(weekly[1]).toMatchObject({ name: 'Sunday Service', time: '10:00 a.m.–12:30 p.m.', detail: 'Church building' });
  });

  it('features the services marked for the home page', () => {
    const featured = scheduleFromServiceTimes(rows).filter((item) => item.featured).map((item) => item.name);
    expect(featured).toEqual(['Sunday Service', 'Wednesday Upper Room Service', "Friday Intercessors' Service"]);
  });

  it('falls back to the home page body when no service times exist', () => {
    const items = scheduleFromHome([
      { day: 'Sunday', time: '10:00 a.m.–12:30 p.m.', name: 'Sunday', line: 'Sunday Service. Church building.' },
      { day: 'Daily', time: '6:30–7:30 a.m.', name: 'Daily Morning Glory', line: '6:30–7:30 a.m.' },
    ]);
    expect(items[0]).toMatchObject({ cadence: 'WEEKLY', day: 'SUN', featured: true });
    expect(items[1]).toMatchObject({ cadence: 'DAILY', day: '', detail: '', featured: false });
  });
});
