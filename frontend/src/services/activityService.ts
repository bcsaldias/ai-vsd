// Lesson loading and student-work persistence.
// Placeholder: localStorage. Later: HTTP calls to the FastAPI backend, same signatures.
//
// Every activity has its own report (status + a snapshot of the state when it was saved).
// Activities with a `stateKey` also share one current state, so several steps can work on
// the same board.

import type { ActivityDefinition, ActivityReport, Lesson, LessonSummary } from '../types/contracts';
import { LESSONS } from './mockData';

const reportKey = (activityId: string) => `activity-report:${activityId}`;
const sharedKey = (stateKey: string) => `activity-state:${stateKey}`;

interface SharedState {
  state: unknown;
  updatedAt: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — work stays in memory for this session.
  }
}

export async function getLessons(): Promise<LessonSummary[]> {
  return LESSONS.map(({ id, title, accent, symbol }) => ({ id, title, accent, symbol }));
}

export async function getLesson(id: string): Promise<Lesson> {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) throw new Error(`Unknown lesson: ${id}`);
  return lesson;
}

/** The current shared state for a stateKey, e.g. to bring stakeholders into another lesson. */
export async function loadSharedState(stateKey: string): Promise<unknown | null> {
  return read<SharedState>(sharedKey(stateKey))?.state ?? null;
}

export async function loadReport(definition: ActivityDefinition): Promise<ActivityReport | null> {
  const report = read<ActivityReport>(reportKey(definition.id));
  const shared = definition.stateKey ? read<SharedState>(sharedKey(definition.stateKey)) : null;
  if (!shared) return report;
  // The shared state may have moved on in another step since this one was submitted.
  const upToDate = report !== null && report.updatedAt >= shared.updatedAt;
  return {
    activityId: definition.id,
    kind: definition.kind,
    status: upToDate ? report.status : 'in-progress',
    state: shared.state,
    updatedAt: shared.updatedAt,
  };
}

export async function saveReport(definition: ActivityDefinition, report: ActivityReport): Promise<void> {
  write(reportKey(report.activityId), report);
  if (definition.stateKey) write(sharedKey(definition.stateKey), { state: report.state, updatedAt: report.updatedAt });
}

/** Deletes saved work for these activities, including any state they share ("Start over"). */
export async function clearWork(definitions: ActivityDefinition[]): Promise<void> {
  try {
    for (const d of definitions) {
      localStorage.removeItem(reportKey(d.id));
      if (d.stateKey) localStorage.removeItem(sharedKey(d.stateKey));
    }
  } catch {
    // Storage unavailable — nothing was saved.
  }
}

// ---------- Export / import files ----------

const EXPORT_FORMAT = 'vsd-activity-export';

interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  activityKind: ActivityDefinition['kind'];
  /** The shared state's key, or the activity id when the activity has its own state. */
  stateKey: string;
  exportedAt: string;
  state: unknown;
}

/** A downloadable file holding an activity's current state. */
export function exportWork(definition: ActivityDefinition, state: unknown): { filename: string; text: string } {
  const exportedAt = new Date().toISOString();
  const key = definition.stateKey ?? definition.id;
  const file: ExportFile = { format: EXPORT_FORMAT, version: 1, activityKind: definition.kind, stateKey: key, exportedAt, state };
  return { filename: `${key}-${exportedAt.slice(0, 10)}.json`, text: JSON.stringify(file, null, 2) };
}

/** Reads an exported file back, checking it was made by the same kind of activity. */
export function importWork(definition: ActivityDefinition, text: string): { state: unknown } | { error: string } {
  let file: Partial<ExportFile>;
  try {
    file = JSON.parse(text);
  } catch {
    return { error: 'That file isn’t a saved board (it isn’t valid JSON).' };
  }
  if (file?.format !== EXPORT_FORMAT || file.state == null) {
    return { error: 'That file isn’t a board exported from this workspace.' };
  }
  if (file.activityKind !== definition.kind) {
    return { error: `That file is from a different kind of activity (${file.activityKind}).` };
  }
  return { state: file.state };
}
