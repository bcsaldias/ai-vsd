// Prompt version history. Compare and restore are placeholders for now.

import { useEffect, useState } from 'react';
import type { LessonSummary, PromptRole, PromptVersion } from '../types/contracts';
import { listPromptVersions } from '../services/promptService';
import { LessonPicker, lessonAccent } from '../lessons/LessonPicker';

const ROLES: PromptRole[] = ['system', 'user', 'assistant'];

interface Props {
  lessons: LessonSummary[];
  lessonId: string | null;
  onLessonChange: (id: string) => void;
  /** Changes whenever a new version is saved elsewhere. */
  refreshKey: number;
}

/** Prompt history for one lesson at a time. */
export function VersionsTab({ lessons, lessonId, onLessonChange, refreshKey }: Props) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    listPromptVersions(lessonId).then((list) => {
      setVersions(list);
      setSelectedId((id) => (list.some((v) => v.id === id) ? id : (list[0]?.id ?? null)));
    });
  }, [refreshKey, lessonId]);

  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="tab-page versions-page" style={lessonAccent(lessons, lessonId)}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Versions.</h1>
          <LessonPicker lessons={lessons} value={lessonId} onChange={onLessonChange} />
          <p className="hint">Prompt history. Every saved prompt change appears here; feedback records which version produced it.</p>
        </div>
      </div>

      <div className="versions-grid">
        <ol className="version-list" aria-label="Versions, newest first">
          {versions.map((v, i) => (
            <li key={v.id}>
              <button className={v.id === selectedId ? 'version active' : 'version'} onClick={() => setSelectedId(v.id)}>
                <strong>v{v.number}</strong>
                {i === 0 && <span className="badge">Latest</span>}
                <span className="version-note">{v.note}</span>
                <span className="meta">{v.author} · {new Date(v.createdAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ol>

        {selected && (
          <section className="panel version-detail">
            <header className="panel-header">
              <h3>Version {selected.number}</h3>
              <div className="actions">
                <button disabled title="Coming soon">Compare with previous</button>
                <button disabled title="Coming soon">Restore</button>
              </div>
            </header>
            <div className="panel-body">
              {ROLES.map((role) => (
                <div key={role} className="preview-message">
                  <span className="role-label">{role}</span>
                  <pre>{selected.prompts[role] || '(empty)'}</pre>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
