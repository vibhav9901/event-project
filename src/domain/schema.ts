import { z } from 'zod';
import { stripControlChars } from '../lib/text';
import { parseIsoDate } from './dates';
import { CURRENCIES, EVENT_TYPES } from './types';

const freeText = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform((value) => stripControlChars(value).trim());

/**
 * Single source of truth for user input. Every API request is validated here;
 * unknown keys are rejected rather than silently ignored.
 */
export const planInputSchema = z
  .object({
    eventType: z.enum(EVENT_TYPES),
    guestCount: z.number().int().min(1).max(2000),
    totalBudget: z.number().int().min(100).max(10_000_000),
    currency: z.enum(CURRENCIES),
    eventDate: z
      .string()
      .refine((value) => parseIsoDate(value) !== null, 'Use a real date in YYYY-MM-DD format'),
    location: freeText(100).default(''),
    preferences: freeText(500).default(''),
  })
  .strict();

export type PlanInput = z.infer<typeof planInputSchema>;
