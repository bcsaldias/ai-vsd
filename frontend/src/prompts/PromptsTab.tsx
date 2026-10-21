// Edit the system / user / assistant prompts. Saving always creates a new version.

import { useEffect, useState } from 'react';
import type { ActivityDefinition, PromptRole, PromptSet, PromptVersion } from '../types/contracts';
import { getLatestPromptVersion, renderTemplate, savePromptVersion, TEMPLATE_VARIABLES } from '../services/promptService';
import { getLesson } from '../services/activityService';

const ROLES: { role: PromptRole; label: string; help: string }[] = [
  { role: 'system', label: 'System', help: "The tutor's role, tone, and rules." },
  { role: 'user', label: 'User', help: 'Template sent with each request. Use {{variables}} below.' },
  { role: 'assistant', label: 'Assistant', help: 'Optional prefill or example response.' },
];

const SAMPLE_STUDENT_WORK = JSON.stringify(
  { nodes: [{ id: 'n1', label: 'Evaporation' }, { id: 'n2', label: 'Rain' }], edges: [{ source: 'n1', target: 'n2' }] },
  null,
  2,
);

export function PromptsTab({ onSaved }: { onSaved: () => void }) {
  const [base, setBase] = useState<PromptVersion | null>(null);
  const [draft, setDraft] = useState<PromptSet | null>(null);
  const [note, setNote] = useState('');
  const [sampleActivity, setSampleActivity] = useState<ActivityDefinition | null>(null);

  useEffect(() => {
    getLatestPromptVersion().then((v) => {
      setBase(v);
      setDraft(v.prompts);
    });
    getLesson().then((l) => setSampleActivity(l.activities[0] ?? null));
  }, []);

  if (!base || !draft) return <p className="hint">Loading prompts…</p>;

  const dirty = ROLES.some(({ role }) => draft[role] !== base.prompts[role]);

  const save = async () => {
    const v = await savePromptVersion(draft, note);
    setBase(v);
    setNote('');
    onSaved();
  };

  const preview = renderTemplate(draft.user, {
    activity_title: sampleActivity?.title ?? '',
    activity_prompt: sampleActivity?.prompt ?? '',
    objectives: sampleActivity?.objectives.map((o) => `- ${o}`).join('\n') ?? '',
    student_work: SAMPLE_STUDENT_WORK,
  });

  return (
    <div className="tab-page prompts-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Prompts.</h1>
          <p className="hint">
            Editing from version {base.number}
            {dirty && <span className="badge">Unsaved changes</span>}
          </p>
        </div>
        <div className="save-row">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed?" aria-label="Version note" />
          <button className="primary" onClick={save} disabled={!dirty}>Save as new version</button>
        </div>
      </div>

      <div className="prompts-grid">
        <div className="prompt-editors">
          {ROLES.map(({ role, label, help }) => (
            <label key={role} className="prompt-editor">
              <span className="role-label">{label}</span>
              <span className="hint">{help}</span>
              <textarea
                value={draft[role]}
                onChange={(e) => setDraft({ ...draft, [role]: e.target.value })}
                rows={role === 'user' ? 8 : 4}
                spellCheck={role !== 'user'}
              />
            </label>
          ))}
          <div className="variables">
            <span className="hint">Variables:</span>
            {TEMPLATE_VARIABLES.map((v) => <code key={v}>{`{{${v}}}`}</code>)}
          </div>
        </div>

        <aside className="panel prompt-preview">
          <header className="panel-header">
            <h3>Preview</h3>
            <span className="badge">Sample data</span>
          </header>
          <div className="panel-body">
            {ROLES.filter(({ role }) => draft[role].trim()).map(({ role, label }) => (
              <div key={role} className="preview-message">
                <span className="role-label">{label}</span>
                <pre>{role === 'user' ? preview : draft[role]}</pre>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
