// Lesson loading and student-work persistence.
// Placeholder: localStorage. Later: HTTP calls to the FastAPI backend, same signatures.
//
// Every activity has its own report (status + a snapshot of the state when it was saved).
// Activities with a `stateKey` also share one current state, so several steps can work on
// the same board.

import type { ActivityDefinition, ActivityReport, Lesson } from '../types/contracts';
import { MOCK_LESSON } from './mockData';

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

export async function getLesson(): Promise<Lesson> {
  return MOCK_LESSON;
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
