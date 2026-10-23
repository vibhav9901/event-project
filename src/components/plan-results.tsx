import type { RefObject } from 'react';
import { EVENT_LABELS, formatDate, formatMoney, pluralize } from '../lib/format';
import type { PlanResponse } from '../server/plan-service';

const COST_LABELS = { low: 'Low cost', medium: 'Medium cost', high: 'High cost' } as const;

/** Decorative bar; the numbers beside it carry the information. Uses attributes, not inline styles (CSP). */
function Bar({ percent, max }: { percent: number; max: number }) {
  const width = max > 0 ? (percent / max) * 100 : 0;
  return (
    <svg
      className="bar"
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="bar-track" width="100" height="6" />
      <rect className="bar-fill" width={width} height="6" />
    </svg>
  );
}

interface PlanResultsProps {
  response: PlanResponse;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function PlanResults({ response, headingRef }: PlanResultsProps) {
  const { plan, ideas, aiStatus, aiNotices } = response;
  const { currency, budget, timeline, vendors } = plan;
  const maxPercent = Math.max(...budget.lines.map((line) => line.percent));
  const total = budget.lines.reduce((sum, line) => sum + line.amount, 0);
  const lineById = new Map(budget.lines.map((line) => [line.id, line]));

  return (
    <article className="results" aria-labelledby="results-title">
      <h2 id="results-title" ref={headingRef} tabIndex={-1} className="results-title">
        Your {EVENT_LABELS[plan.eventType]} plan
      </h2>
      <p className="results-summary">
        {pluralize(plan.guestCount, 'guest')} on {formatDate(plan.eventDate)}.{' '}
        {pluralize(plan.daysUntilEvent, 'day')} left to plan, about{' '}
        {formatMoney(budget.perGuest, currency)} per guest.
      </p>
      <p className="hint rules-note">
        The budget, timeline and vendor list are calculated with fixed rules from your answers, so
        the same answers always give the same result. Only the ideas are written by AI.
      </p>

      {plan.warnings.length > 0 && (
        <section className="notice" aria-labelledby="watch-title">
          <h3 id="watch-title">Things to watch</h3>
          <ul>
            {plan.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="budget-title">
        <h3 id="budget-title">Budget</h3>
        {plan.decisions.length > 0 && (
          <ul className="reasons">
            {plan.decisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ul>
        )}
        <table className="budget">
          <caption className="visually-hidden">Budget by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Share</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <tr key={line.id}>
                <th scope="row">
                  {line.label}
                  <Bar percent={line.percent} max={maxPercent} />
                </th>
                <td>{line.percent}%</td>
                <td>{formatMoney(line.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>100%</td>
              <td>{formatMoney(total, currency)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section aria-labelledby="timeline-title">
        <h3 id="timeline-title">Timeline</h3>
        <ol className="timeline">
          {timeline.tasks.map((task) => (
            <li className="step" key={task.id}>
              <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>
              <span className="step-title">
                {task.title}
                {task.urgency === 'urgent' && <span className="tag">Start now</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="vendors-title">
        <h3 id="vendors-title">Vendors to book</h3>
        <ul className="vendors">
          {vendors.map((vendor) => {
            const line = lineById.get(vendor.budgetCategory);
            return (
              <li key={vendor.id}>
                <p className="vendor-name">
                  {vendor.name}
                  <span className="tag">
                    {vendor.priority === 'essential' ? 'Essential' : 'Recommended'}
                  </span>
                </p>
                <p>Ask: {vendor.keyQuestion}</p>
                {line && (
                  <p className="hint">
                    Budget line: {line.label}, {formatMoney(line.amount, currency)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ideas-title">
        <h3 id="ideas-title">Ideas for you</h3>
        <p className="hint">Written by AI. Check prices and availability before you book.</p>
        {aiNotices.map((notice) => (
          <p className="hint" key={notice}>
            {notice}
          </p>
        ))}
        {ideas ? (
          <>
            <p>{ideas.summary}</p>
            <ul className="ideas">
              {ideas.ideas.map((idea) => (
                <li key={idea.title}>
                  <h4>{idea.title}</h4>
                  <p>{idea.description}</p>
                  <p className="hint">{COST_LABELS[idea.costLevel]}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            {aiStatus === 'disabled'
              ? 'Personalised ideas are switched off on this deployment. The plan above does not depend on them.'
              : 'Personalised ideas are temporarily unavailable. Your budget, timeline and vendor list are complete. Try again in a minute for ideas.'}
          </p>
        )}
      </section>
    </article>
  );
}
