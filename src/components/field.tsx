import type { ReactNode } from 'react';
import type { PlanField } from '../lib/api-client';

interface ControlProps {
  id: string;
  name: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface FieldProps {
  id: PlanField;
  label: string;
  hint?: string;
  error: string | undefined;
  children: (control: ControlProps) => ReactNode;
}

/** Label, hint and error wired to the control with ids, so assistive tech announces all three. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {children({
        id,
        name: id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {error && (
        <p id={errorId} className="error">
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
    </div>
  );
}
