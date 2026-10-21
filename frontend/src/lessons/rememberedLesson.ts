// The lesson last open in this browser — one choice shared by every tab.
// A UI preference (like panel sizes), not student data, so it stays out of the services layer.

const KEY = 'workspace-lesson';

export function rememberedLesson(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberLesson(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage unavailable — the first lesson opens next time.
  }
}
