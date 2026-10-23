// Helpers every activity model uses: ids, list updates, unlocking tools by step, and the building
// blocks for writing work out in plain language. Plain functions, no React.

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function patchIn<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

/** A model's step helpers, from its table of the step at which each tool becomes available.
    `allows`: whether a step has reached a tool (earlier tools stay available in later steps).
    `guide`: marks where a tool lives (data-guide, so the step card can spotlight it) and flags it
    in the step that introduces it (data-new). */
export function stepTools<T extends string>(steps: Record<T, number>) {
  return {
    allows: (step: number, tool: T) => step >= steps[tool],
    guide: (step: number, tool: T) => ({ 'data-guide': tool, 'data-new': steps[tool] === step ? '' : undefined }),
  };
}

// ---------- Plain language ({{student_work}}) ----------

/** The text, or `empty` when there is none. */
export const filled = (text: string | undefined, empty: string) => text?.trim() || empty;

/** "Heading:" and its lines, or `none` when it has none (false / empty lines are skipped). */
export function section(heading: string, lines: (string | false | undefined)[], none: string): string {
  const kept = lines.filter(Boolean);
  return [`${heading}:`, ...(kept.length ? kept : [none])].join('\n');
}
