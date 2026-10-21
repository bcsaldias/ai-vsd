// Presentational only: renders whatever Feedback object it is given.
// Swapping mock -> real AI happens in feedbackService, not here.

import type { Feedback } from '../types/contracts';

interface Props {
  feedback: Feedback | null;
  loading: boolean;
}

export function FeedbackPanel({ feedback, loading }: Props) {
  return (
    <section id="feedback-panel" className="panel feedback-panel" aria-label="AI feedback" aria-live="polite">
      <header className="panel-header">
        <h2>Feedback</h2>
        {feedback?.source === 'mock' && <span className="badge">Placeholder</span>}
      </header>
      <div className="panel-body">
        {loading && <p className="hint">Thinking…</p>}
        {!loading && !feedback && <p className="hint">Click “Check my work” to get feedback.</p>}
        {!loading && feedback && (
          <>
            <p>{feedback.summary}</p>
            <ul className="feedback-items">
              {feedback.items.map((item) => (
                <li key={item.id} className={`feedback-item ${item.tone}`}>
                  <span className="tone">{item.tone}</span>
                  {item.message}
                </li>
              ))}
            </ul>
            <p className="meta">
              Prompt {feedback.promptVersionId ?? '—'} · {new Date(feedback.generatedAt).toLocaleTimeString()}
            </p>
            <div className="rating">
              <span className="hint">Helpful?</span>
              <button disabled title="Not wired up yet">Yes</button>
              <button disabled title="Not wired up yet">No</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
