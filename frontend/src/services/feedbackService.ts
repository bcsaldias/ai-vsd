// Feedback source for the FeedbackPanel.
// Placeholder: returns mock feedback. Later: call the backend (and stream), same signature.

import type { ActivityReport, Feedback } from '../types/contracts';
import { getLatestPromptVersion } from './promptService';

export async function requestFeedback(report: ActivityReport): Promise<Feedback> {
  const promptVersion = await getLatestPromptVersion();
  await new Promise((resolve) => setTimeout(resolve, 400)); // simulate latency

  return {
    activityId: report.activityId,
    source: 'mock',
    promptVersionId: promptVersion.id,
    generatedAt: new Date().toISOString(),
    summary: 'Placeholder feedback — no AI is connected yet.',
    items: [
      { id: 'f1', tone: 'praise', message: 'You submitted your work. Nice!' },
      {
        id: 'f2',
        tone: 'suggestion',
        message: `Your saved work has ${Object.keys(report.state ?? {}).length} top-level field(s). Real feedback will appear here.`,
      },
    ],
  };
}
