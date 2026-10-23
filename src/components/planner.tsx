'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  interpretResponse,
  type FieldErrors,
  type PlanField,
  type PlanOutcome,
} from '../lib/api-client';
import { toPayload } from '../lib/form-payload';
import type { PlanResponse } from '../server/plan-service';
import { PlanForm } from './plan-form';
import { PlanResults } from './plan-results';

const REQUEST_TIMEOUT_MS = 35_000;

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: PlanResponse }
  | { status: 'error'; message: string; fields: FieldErrors };

function toState(outcome: PlanOutcome): State {
  switch (outcome.kind) {
    case 'success':
      return { status: 'success', data: outcome.data };
    case 'field-errors':
      return { status: 'error', message: outcome.message, fields: outcome.fields };
    case 'rate-limited':
    case 'error':
      return { status: 'error', message: outcome.message, fields: {} };
  }
}

export function Planner() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const problemRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Move focus to the outcome so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (state.status === 'success') resultsHeadingRef.current?.focus();
    if (state.status === 'error') problemRef.current?.focus();
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === 'loading') return;

    const payload = toPayload(new FormData(event.currentTarget));
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    setState({ status: 'loading' });

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      setState(
        toState(interpretResponse(response.status, body, response.headers.get('Retry-After'))),
      );
    } catch {
      if (abortRef.current !== controller) return; // superseded or unmounted
      setState({
        status: 'error',
        message: 'The request failed or took too long. Check your connection and try again.',
        fields: {},
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const loading = state.status === 'loading';
  const announcement = loading
    ? 'Creating your plan…'
    : state.status === 'success'
      ? 'Your plan is ready.'
      : '';
  const fieldErrors = state.status === 'error' ? state.fields : {};

  return (
    <div className="workspace">
      <PlanForm pending={loading} errors={fieldErrors} onSubmit={handleSubmit} />

      <div className="output" aria-busy={loading}>
        <p role="status" className="visually-hidden">
          {announcement}
        </p>

        {state.status === 'error' && (
          <section
            ref={problemRef}
            tabIndex={-1}
            className="problem"
            aria-labelledby="problem-title"
          >
            <h2 id="problem-title">There is a problem</h2>
            <p>{state.message}</p>
            <ul>
              {(Object.keys(state.fields) as PlanField[]).map((field) => (
                <li key={field}>
                  <a href={`#${field}`}>{state.fields[field]}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {state.status === 'success' && (
          <PlanResults response={state.data} headingRef={resultsHeadingRef} />
        )}

        {(state.status === 'idle' || loading) && (
          <div className="empty">
            <h2>{loading ? 'Creating your plan…' : 'Your plan will appear here'}</h2>
            <p>
              {loading
                ? 'This usually takes a few seconds.'
                : 'Fill in the form and choose Create my plan. You get a budget, a dated checklist, vendors to book and ideas.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
