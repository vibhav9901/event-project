import { stripControlChars } from '../lib/text';

/**
 * Deterministic safeguards that run OUTSIDE the model, because instructions inside a
 * prompt cannot be relied on to stop injection or leakage.
 * Covers OWASP LLM01 (injection), LLM02 (sensitive data), LLM05 (output handling)
 * and LLM07 (system prompt leakage).
 */

const API_KEY = /\b(?:AIza[\w-]{35}|sk-[A-Za-z0-9]{20,})\b/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Digit runs with separators. Only removed when they hold 10+ digits (phones, cards), so dates survive.
const NUMBER_RUN = /\+?\d[\d\s().-]{7,}\d/g;
const REMOVED = '[removed]';

const INJECTION_PATTERNS: readonly RegExp[] = [
  /\bignore\b.{0,30}\b(previous|prior|above|earlier|all)\b.{0,30}\b(instructions?|prompts?|rules?)\b/i,
  /\b(reveal|show|print|repeat|output|leak)\b.{0,30}\b(system|initial|hidden)\b.{0,15}\b(prompt|instructions?)\b/i,
  /\bdisregard\b.{0,40}\b(instructions?|rules?|above)\b/i,
  /<\s*\/?\s*(system|assistant|instructions?)\s*>/i,
  /\b(jailbreak|developer mode|DAN mode)\b/i,
];

export const IGNORED_NOTICE =
  'Part of your text looked like instructions to the AI, so it was ignored when writing ideas.';
export const REDACTED_NOTICE =
  'Details that looked like personal data were removed before writing ideas.';

export interface RedactionResult {
  readonly text: string;
  readonly redacted: boolean;
}

/** Removes emails, API keys and long digit runs (phone or card numbers) before text leaves the server. */
export function redactSensitive(text: string): RedactionResult {
  const cleaned = text
    .replace(API_KEY, REMOVED)
    .replace(EMAIL, REMOVED)
    .replace(NUMBER_RUN, (run) => (run.replace(/\D/g, '').length >= 10 ? REMOVED : run));
  return { text: cleaned, redacted: cleaned !== text };
}

/** Heuristic only: a first filter that is cheap and can miss attacks, never the sole defence. */
export function looksLikeInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export interface GuardedText {
  readonly location: string;
  readonly preferences: string;
  readonly notices: readonly string[];
}

function guardField(value: string) {
  if (looksLikeInjection(value)) return { text: '', ignored: true, redacted: false };
  const { text, redacted } = redactSensitive(value);
  return { text, ignored: false, redacted };
}

/**
 * Prepares free text for the model. Suspicious text is dropped and the rest is redacted,
 * so a flagged message never blocks the user from getting their full plan.
 */
export function guardUserText(fields: { location: string; preferences: string }): GuardedText {
  const location = guardField(fields.location);
  const preferences = guardField(fields.preferences);
  const notices: string[] = [];
  if (location.ignored || preferences.ignored) notices.push(IGNORED_NOTICE);
  if (location.redacted || preferences.redacted) notices.push(REDACTED_NOTICE);
  return { location: location.text, preferences: preferences.text, notices };
}

/** Strips markup and control characters from model output (defence in depth; React also escapes). */
export function sanitizeModelText(text: string): string {
  return stripControlChars(text)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

/** Per-request marker planted in the instructions. If it shows up in output, the prompt leaked. */
export function createCanary(): string {
  return `CANARY_${crypto.randomUUID().replaceAll('-', '')}`;
}
