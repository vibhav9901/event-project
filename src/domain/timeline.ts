import { addDays, daysBetween, formatIsoDate } from './dates';
import type { EventType, TimelinePlan, TimelineTask } from './types';

interface TaskTemplate {
  readonly id: string;
  readonly title: string;
  /** Ideal number of days before the event that the task should be done. */
  readonly leadDays: number;
}

const TEMPLATES: Readonly<Record<EventType, readonly TaskTemplate[]>> = {
  wedding: [
    { id: 'budget-guests', title: 'Set budget and draft guest list', leadDays: 365 },
    { id: 'venue', title: 'Book venue', leadDays: 330 },
    { id: 'photographer', title: 'Book photographer and videographer', leadDays: 300 },
    { id: 'caterer', title: 'Book caterer and hold tasting', leadDays: 240 },
    { id: 'attire', title: 'Order attire and schedule fittings', leadDays: 180 },
    { id: 'invitations', title: 'Send invitations', leadDays: 90 },
    { id: 'final-count', title: 'Confirm final guest count with vendors', leadDays: 14 },
    { id: 'run-of-show', title: 'Share day-of schedule with all vendors', leadDays: 3 },
  ],
  birthday: [
    { id: 'theme-guests', title: 'Choose theme and guest list', leadDays: 45 },
    { id: 'venue', title: 'Book venue', leadDays: 40 },
    { id: 'invitations', title: 'Send invitations', leadDays: 21 },
    { id: 'food-cake', title: 'Order food and cake', leadDays: 14 },
    { id: 'entertainment', title: 'Book entertainment', leadDays: 14 },
    { id: 'rsvps', title: 'Confirm RSVPs and dietary needs', leadDays: 5 },
    { id: 'setup', title: 'Set up decor and supplies', leadDays: 1 },
  ],
  community: [
    { id: 'goals-roles', title: 'Define goals and assign roles', leadDays: 120 },
    { id: 'permits', title: 'Apply for permits and insurance', leadDays: 90 },
    { id: 'venue', title: 'Secure venue', leadDays: 90 },
    { id: 'promotion', title: 'Launch promotion', leadDays: 45 },
    { id: 'volunteers', title: 'Recruit volunteers', leadDays: 30 },
    { id: 'vendors-equipment', title: 'Confirm vendors and equipment', leadDays: 14 },
    { id: 'safety-access', title: 'Finalise safety and accessibility plan', leadDays: 10 },
    { id: 'volunteer-brief', title: 'Brief volunteers', leadDays: 2 },
  ],
};

/** Below this many days, the event is considered high-risk to organise. */
const MIN_VIABLE_DAYS: Readonly<Record<EventType, number>> = {
  wedding: 90,
  birthday: 14,
  community: 30,
};

/**
 * Builds a dated task list counting back from the event date. When there is
 * less time than the ideal schedule needs, every lead time is scaled down
 * proportionally and tasks that "should already have started" are flagged urgent.
 */
export function planTimeline(eventType: EventType, eventDate: Date, today: Date): TimelinePlan {
  const daysUntilEvent = daysBetween(today, eventDate);
  const templates = TEMPLATES[eventType];
  const idealLead = Math.max(...templates.map((template) => template.leadDays));
  const compressed = daysUntilEvent < idealLead;
  const ratio = compressed ? daysUntilEvent / idealLead : 1;

  const tasks: TimelineTask[] = templates
    .map((template) => {
      const daysBeforeEvent = Math.round(template.leadDays * ratio);
      return {
        id: template.id,
        title: template.title,
        daysBeforeEvent,
        dueDate: formatIsoDate(addDays(eventDate, -daysBeforeEvent)),
        urgency: template.leadDays > daysUntilEvent ? ('urgent' as const) : ('on-track' as const),
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));

  const warnings: string[] = [];
  const minimum = MIN_VIABLE_DAYS[eventType];
  if (daysUntilEvent < minimum) {
    warnings.push(
      `Only ${daysUntilEvent} days remain; a ${eventType} normally needs ${minimum}+. Prioritise the urgent tasks this week.`,
    );
  } else if (compressed) {
    warnings.push(
      'The ideal schedule was compressed to fit your date. Start the earliest tasks now.',
    );
  }

  return { tasks, compressed, warnings };
}
