// Feedback source for the FeedbackPanel.
// Placeholder: returns mock feedback. Later: call the backend (and stream), same signature.

import type { ActivityReport, Feedback } from '../types/contracts';
import { getLatestPromptVersion } from './promptService';

/** Uses the latest prompts of the lesson the activity belongs to. `report.state` is already limited
    to the activity's step, and `workText` is that work in plain language (null: the activity has
    none, so the JSON is used). The backend stores the JSON and fills {{student_work}} with the text
    (see templateVariables); it never converts the work itself. */
export async function requestFeedback(report: ActivityReport, lessonId: string, workText: string | null): Promise<Feedback> {
  const promptVersion = await getLatestPromptVersion(lessonId);
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
        message: workText
          ? `The AI would read your work as ${workText.split('\n').length} lines of text (see the Prompts tab). Real feedback will appear here.`
          : `Your saved work has ${Object.keys(report.state ?? {}).length} top-level field(s). Real feedback will appear here.`,
      },
    ],
  };
}
