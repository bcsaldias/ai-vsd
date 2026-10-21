// AppShell: switches between tabs. Tabs stay mounted so unsaved drafts survive switching.

import { useEffect, useState } from 'react';
import type { LessonSummary } from './types/contracts';
import { getLessons } from './services/activityService';
import { WorkspaceTab } from './workspace/WorkspaceTab';
import { PromptsTab } from './prompts/PromptsTab';
import { VersionsTab } from './versions/VersionsTab';

type TabId = 'workspace' | 'prompts' | 'versions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'versions', label: 'Versions' },
];

export function App() {
  const [tab, setTab] = useState<TabId>('workspace');
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  // Which lesson's prompts the Prompts and Versions tabs show (shared, so they stay in step).
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [promptLessonId, setPromptLessonId] = useState<string | null>(null);
  useEffect(() => {
    getLessons().then((list) => {
      setLessons(list);
      setPromptLessonId(list[0]?.id ?? null);
    });
  }, []);
  const lessonProps = { lessons, lessonId: promptLessonId, onLessonChange: setPromptLessonId };

  return (
    <div className="app" data-tab={tab}>
      <nav className="tab-bar" role="tablist" aria-label="Sections">
        <span className="app-title"><span>VSD Learning</span> <span>Workspace</span></span>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="rules" aria-hidden="true" />

      <main className="tab-content">
        <div role="tabpanel" id="panel-workspace" aria-labelledby="tab-workspace" hidden={tab !== 'workspace'}>
          <WorkspaceTab />
        </div>
        <div role="tabpanel" id="panel-prompts" aria-labelledby="tab-prompts" hidden={tab !== 'prompts'}>
          <PromptsTab {...lessonProps} onSaved={() => setVersionsRefreshKey((k) => k + 1)} />
        </div>
        <div role="tabpanel" id="panel-versions" aria-labelledby="tab-versions" hidden={tab !== 'versions'}>
          <VersionsTab {...lessonProps} refreshKey={versionsRefreshKey} />
        </div>
      </main>
    </div>
  );
}
