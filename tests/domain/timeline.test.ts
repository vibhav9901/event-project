import { describe, expect, it } from 'vitest';
import { parseIsoDate } from '../../src/domain/dates';
import { planTimeline } from '../../src/domain/timeline';

const today = parseIsoDate('2026-10-22') as Date;
const day = (iso: string) => parseIsoDate(iso) as Date;

describe('planTimeline', () => {
  it('keeps ideal lead times when there is plenty of time', () => {
    const plan = planTimeline('wedding', day('2027-12-01'), today);
    expect(plan.compressed).toBe(false);
    expect(plan.tasks[0]?.dueDate).toBe('2026-12-01');
    expect(plan.tasks.every((task) => task.urgency === 'on-track')).toBe(true);
    expect(plan.warnings).toHaveLength(0);
  });

  it('compresses the schedule and flags overdue-by-design tasks as urgent', () => {
    const plan = planTimeline('wedding', day('2027-01-30'), today);
    expect(plan.compressed).toBe(true);
    expect(plan.tasks.find((task) => task.id === 'venue')?.urgency).toBe('urgent');
    expect(plan.tasks.find((task) => task.id === 'run-of-show')?.urgency).toBe('on-track');
  });

  it('never schedules a task before today and keeps tasks in date order', () => {
    for (const iso of ['2026-10-22', '2026-10-29', '2027-01-30', '2028-01-01']) {
      const { tasks } = planTimeline('community', day(iso), today);
      const dates = tasks.map((task) => task.dueDate);
      expect(dates.every((date) => date >= '2026-10-22')).toBe(true);
      expect(dates).toEqual([...dates].sort());
    }
  });

  it('handles an event happening today', () => {
    const plan = planTimeline('birthday', day('2026-10-22'), today);
    expect(plan.tasks.every((task) => task.dueDate === '2026-10-22')).toBe(true);
    expect(plan.warnings).toHaveLength(1);
  });

  it('warns when the date is inside the minimum viable window', () => {
    const plan = planTimeline('birthday', day('2026-10-29'), today);
    expect(plan.warnings.join(' ')).toContain('Only 7 days');
  });
});
