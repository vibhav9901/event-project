import type { EventType, VendorItem } from './types';

interface VendorTemplate extends VendorItem {
  /** Only included when the guest list is at least this large. */
  readonly minGuests?: number;
}

const VENDORS: Readonly<Record<EventType, readonly VendorTemplate[]>> = {
  wedding: [
    {
      id: 'venue',
      name: 'Venue',
      budgetCategory: 'venue',
      priority: 'essential',
      keyQuestion: 'What is the all-in price including tax, service charge and overtime?',
    },
    {
      id: 'caterer',
      name: 'Caterer',
      budgetCategory: 'catering',
      priority: 'essential',
      keyQuestion:
        'Can you cover our dietary needs, and what is the per-head price at our final count?',
    },
    {
      id: 'photographer',
      name: 'Photographer / videographer',
      budgetCategory: 'photography',
      priority: 'essential',
      keyQuestion: 'How many edited photos do we get, and how fast?',
    },
    {
      id: 'attire',
      name: 'Attire and tailoring',
      budgetCategory: 'attire',
      priority: 'recommended',
      keyQuestion: 'What are alteration costs and the final fitting deadline?',
    },
    {
      id: 'florist',
      name: 'Florist / decorator',
      budgetCategory: 'decor',
      priority: 'recommended',
      keyQuestion: 'What happens if a flower is out of season or unavailable?',
    },
    {
      id: 'music',
      name: 'DJ or band',
      budgetCategory: 'entertainment',
      priority: 'recommended',
      keyQuestion: 'Do you bring backup equipment and your own sound system?',
    },
    {
      id: 'parking',
      name: 'Parking / shuttle service',
      budgetCategory: 'contingency',
      priority: 'recommended',
      keyQuestion: 'Is on-site parking enough for our guest count?',
      minGuests: 150,
    },
  ],
  birthday: [
    {
      id: 'venue',
      name: 'Venue',
      budgetCategory: 'venue',
      priority: 'essential',
      keyQuestion: 'What is the hire period and is setup time included?',
    },
    {
      id: 'caterer',
      name: 'Caterer or bakery',
      budgetCategory: 'catering',
      priority: 'essential',
      keyQuestion: 'Can you handle allergies and what is the order cut-off?',
    },
    {
      id: 'entertainer',
      name: 'Entertainer / DJ',
      budgetCategory: 'entertainment',
      priority: 'recommended',
      keyQuestion: 'Is the act suitable for the age range of our guests?',
    },
    {
      id: 'decor',
      name: 'Decor and balloons',
      budgetCategory: 'decor',
      priority: 'recommended',
      keyQuestion: 'Is delivery and setup included in the price?',
    },
    {
      id: 'favors',
      name: 'Favors and gifts supplier',
      budgetCategory: 'favors',
      priority: 'recommended',
      keyQuestion: 'What is the minimum order and lead time?',
    },
  ],
  community: [
    {
      id: 'permits',
      name: 'Local authority (permits)',
      budgetCategory: 'permits',
      priority: 'essential',
      keyQuestion:
        'Which permits and insurance proof are required, and how long does approval take?',
    },
    {
      id: 'venue',
      name: 'Venue or public space',
      budgetCategory: 'venue',
      priority: 'essential',
      keyQuestion: 'What is the maximum capacity and are there noise limits?',
    },
    {
      id: 'equipment',
      name: 'Equipment hire (stage, sound, tents)',
      budgetCategory: 'equipment',
      priority: 'essential',
      keyQuestion: 'What is the delivery, setup and breakdown schedule?',
    },
    {
      id: 'food',
      name: 'Caterer or food vendors',
      budgetCategory: 'catering',
      priority: 'recommended',
      keyQuestion: 'Do vendors hold the licences needed for this site?',
    },
    {
      id: 'promotion',
      name: 'Printer / social promotion',
      budgetCategory: 'promotion',
      priority: 'recommended',
      keyQuestion: 'What is the turnaround time for printed materials?',
    },
    {
      id: 'accessibility',
      name: 'Accessibility services',
      budgetCategory: 'equipment',
      priority: 'recommended',
      keyQuestion: 'Can you provide ramps, seating and interpreters where needed?',
    },
    {
      id: 'first-aid',
      name: 'First aid and safety stewards',
      budgetCategory: 'contingency',
      priority: 'essential',
      keyQuestion: 'What staffing ratio do you advise for our expected crowd?',
      minGuests: 100,
    },
  ],
};

/** Returns the vendor checklist for an event, filtered by context (e.g. guest count). */
export function planVendors(eventType: EventType, guestCount: number): VendorItem[] {
  return VENDORS[eventType]
    .filter((vendor) => guestCount >= (vendor.minGuests ?? 0))
    .map(({ minGuests: _minGuests, ...item }) => item);
}
