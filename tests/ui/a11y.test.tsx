// @vitest-environment jsdom
import axe from 'axe-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlanForm } from '../../src/components/plan-form';
import { PlanResults } from '../../src/components/plan-results';
import { parseIsoDate } from '../../src/domain/dates';
import { buildPlan } from '../../src/domain/plan';

const plan = buildPlan(
  {
    eventType: 'wedding',
    guestCount: 180,
    totalBudget: 5000,
    currency: 'USD',
    eventDate: '2026-12-01',
    location: '',
    preferences: '',
  },
  parseIsoDate('2026-10-22') as Date,
);

const ideas = {
  summary: 'A warm, relaxed celebration.',
  ideas: ['Lantern aisle', 'Potluck dessert table', 'Playlist from guests'].map((title) => ({
    title,
    description: 'Simple and personal.',
    costLevel: 'low' as const,
  })),
};

/** WCAG 2.x A/AA rules. Colour contrast is excluded: jsdom cannot compute styles. */
async function violationsFor(markup: string) {
  document.body.innerHTML = `<main>${markup}</main>`;
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe('accessibility (axe-core)', () => {
  it('the form has no WCAG violations, with and without errors', async () => {
    const noop = () => {};
    expect(
      await violationsFor(
        renderToStaticMarkup(<PlanForm pending={false} errors={{}} onSubmit={noop} />),
      ),
    ).toEqual([]);
    const errors = {
      guestCount: 'Enter a whole number of guests.',
      eventDate: 'Choose a real date.',
    };
    expect(
      await violationsFor(
        renderToStaticMarkup(<PlanForm pending errors={errors} onSubmit={noop} />),
      ),
    ).toEqual([]);
  });

  it('the results have no WCAG violations with AI ideas or without', async () => {
    const notices = ['Details that looked like personal data were removed before writing ideas.'];
    const withIdeas = { plan, ideas, aiStatus: 'ok' as const, aiNotices: notices };
    const withoutIdeas = { plan, ideas: null, aiStatus: 'unavailable' as const, aiNotices: [] };
    for (const response of [withIdeas, withoutIdeas]) {
      const markup = renderToStaticMarkup(
        <PlanResults response={response} headingRef={{ current: null }} />,
      );
      expect(await violationsFor(markup)).toEqual([]);
    }
  });
});
