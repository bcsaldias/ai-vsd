// Panel sizes for the workspace tab, remembered per browser.
// This is a UI preference, not student data, so it stays out of the services layer.

import { useEffect, useState } from 'react';

export interface WorkspaceLayout {
  /** Feedback panel width, as a fraction of the workspace width. */
  feedback: number;
  /** Activity panel height in pixels. The page scrolls, so it can be taller than the window. */
  activityHeight: number;
  /** Height of the top panels in pixels, or null to fit their content. Shorter panels scroll inside. */
  topHeight: number | null;
}

/** feedback.minPx must match the max(…px, …) floor in .workspace-grid (styles.css). */
export const LAYOUT_LIMITS = {
  feedback: { min: 0.15, max: 0.6, minPx: 220, default: 0.28 },
  activityHeight: { min: 240, max: 4000, default: 520 },
  topHeight: { min: 120, max: 4000, default: 0 }, // default unused: the top panels fit their content
} satisfies Record<keyof WorkspaceLayout, { min: number; max: number; minPx?: number; default: number }>;

const STORAGE_KEY = 'workspace-layout';

function sanitize(key: keyof WorkspaceLayout, value: unknown): number {
  const { min, max, default: fallback } = LAYOUT_LIMITS[key];
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function load(): WorkspaceLayout {
  let saved: Partial<WorkspaceLayout> = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    // Unavailable or corrupt storage — fall back to defaults.
  }
  return {
    feedback: sanitize('feedback', saved.feedback),
    activityHeight: sanitize('activityHeight', saved.activityHeight),
    topHeight: saved.topHeight == null ? null : sanitize('topHeight', saved.topHeight),
  };
}

export function useWorkspaceLayout() {
  const [layout, setLayout] = useState<WorkspaceLayout>(load);

  // Debounced so dragging doesn't write on every pointer move.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      } catch {
        // Storage unavailable — sizes just won't persist.
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [layout]);

  return [layout, setLayout] as const;
}
