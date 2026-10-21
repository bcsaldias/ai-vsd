// Lesson loading and student-work persistence.
// Placeholder: localStorage. Later: HTTP calls to the FastAPI backend, same signatures.

import type { ActivityReport, Lesson } from '../types/contracts';
import { MOCK_LESSON } from './mockData';

const storageKey = (activityId: string) => `activity-report:${activityId}`;

export async function getLesson(): Promise<Lesson> {
  return MOCK_LESSON;
}

export async function loadReport(activityId: string): Promise<ActivityReport | null> {
  try {
    const raw = localStorage.getItem(storageKey(activityId));
    return raw ? (JSON.parse(raw) as ActivityReport) : null;
  } catch {
    return null;
  }
}

export async function saveReport(report: ActivityReport): Promise<void> {
  try {
    localStorage.setItem(storageKey(report.activityId), JSON.stringify(report));
  } catch {
    // Storage unavailable — work stays in memory for this session.
  }
}
