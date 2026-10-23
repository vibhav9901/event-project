export interface PlanPayload {
  eventType: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  eventDate: string;
  location: string;
  preferences: string;
}

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}

/** Converts form fields to the API payload. The server remains the authority on validity. */
export function toPayload(data: FormData): PlanPayload {
  return {
    eventType: text(data, 'eventType'),
    guestCount: Number(text(data, 'guestCount')),
    totalBudget: Number(text(data, 'totalBudget')),
    currency: text(data, 'currency'),
    eventDate: text(data, 'eventDate'),
    location: text(data, 'location'),
    preferences: text(data, 'preferences'),
  };
}
