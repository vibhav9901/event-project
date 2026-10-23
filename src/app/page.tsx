import { Planner } from '../components/planner';

export default function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="page">
      <header className="hero">
        <h1>Plan your wedding, birthday or community event</h1>
        <p className="lead">
          Tell us the basics. You get a budget split, a dated checklist, the vendors to book and
          ideas that fit your event.
        </p>
        <details className="how">
          <summary>How this planner works</summary>
          <ul>
            <li>
              Your budget split, dated timeline and vendor checklist come from fixed rules that
              react to your event type, guest count and date. The same answers always give the same
              result.
            </li>
            <li>
              Only the ideas come from AI (Google Gemini). If the AI is unavailable, you still get
              the full plan.
            </li>
            <li>
              The AI takes no actions for you and sees only what you type in this form. Do not enter
              personal details.
            </li>
          </ul>
        </details>
      </header>
      <Planner />
    </main>
  );
}
