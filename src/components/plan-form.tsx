import { useEffect, useState, type FormEvent } from 'react';
import { CURRENCIES } from '../domain/types';
import type { FieldErrors } from '../lib/api-client';
import { Field } from './field';

const EVENT_OPTIONS = [
  { value: 'wedding', title: 'Wedding', hint: 'Ceremony, reception and everything around them' },
  { value: 'birthday', title: 'Birthday', hint: 'A party for any age' },
  {
    value: 'community',
    title: 'Community event',
    hint: 'Fairs, fundraisers, meetups and festivals',
  },
] as const;

interface PlanFormProps {
  pending: boolean;
  errors: FieldErrors;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function PlanForm({ pending, errors, onSubmit }: PlanFormProps) {
  // Set after mount so server and client markup match.
  const [today, setToday] = useState<string | undefined>(undefined);
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);

  return (
    <form className="planner-form" onSubmit={onSubmit} aria-describedby="privacy-note">
      <fieldset className="choices">
        <legend>What are you celebrating?</legend>
        {EVENT_OPTIONS.map((option, index) => (
          <label className="choice" key={option.value}>
            <input
              type="radio"
              name="eventType"
              value={option.value}
              id={index === 0 ? 'eventType' : undefined}
              defaultChecked={index === 0}
              required
            />
            <span className="choice-title">{option.title}</span>
            <span className="choice-hint">{option.hint}</span>
          </label>
        ))}
        {errors.eventType && <p className="error">{errors.eventType}</p>}
      </fieldset>

      <Field
        id="guestCount"
        label="Number of guests"
        hint="Whole number, 1 to 2,000"
        error={errors.guestCount}
      >
        {(control) => (
          <input
            {...control}
            type="number"
            inputMode="numeric"
            min={1}
            max={2000}
            step={1}
            defaultValue={80}
            required
          />
        )}
      </Field>

      <div className="field-row">
        <Field
          id="totalBudget"
          label="Total budget"
          hint="Whole amount you can spend"
          error={errors.totalBudget}
        >
          {(control) => (
            <input
              {...control}
              type="number"
              inputMode="numeric"
              min={100}
              max={10000000}
              step={1}
              defaultValue={20000}
              required
            />
          )}
        </Field>
        <Field id="currency" label="Currency" error={errors.currency}>
          {(control) => (
            <select {...control} defaultValue="USD" required>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field id="eventDate" label="Event date" error={errors.eventDate}>
        {(control) => <input {...control} type="date" min={today} required />}
      </Field>

      <Field
        id="location"
        label="Location (optional)"
        hint="City or venue type, for example a lakeside garden"
        error={errors.location}
      >
        {(control) => <input {...control} type="text" maxLength={100} autoComplete="off" />}
      </Field>

      <Field
        id="preferences"
        label="Preferences (optional)"
        hint="Themes, food, music, must-haves. Up to 500 characters."
        error={errors.preferences}
      >
        {(control) => <textarea {...control} rows={4} maxLength={500} />}
      </Field>

      <p id="privacy-note" className="hint">
        Do not enter names, phone numbers or other personal details. Your preferences are sent to
        Google&rsquo;s Gemini service to write ideas.
      </p>

      <button type="submit" className="button" aria-disabled={pending}>
        {pending ? 'Creating your plan…' : 'Create my plan'}
      </button>
    </form>
  );
}
