// AppShell: switches between tabs. Tabs stay mounted so unsaved drafts survive switching.

import { useState } from 'react';
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

  return (
    <div className="app">
      <nav className="tab-bar" role="tablist" aria-label="Sections">
        <span className="app-title">Learning Workspace</span>
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

      <main className="tab-content">
        <div role="tabpanel" id="panel-workspace" aria-labelledby="tab-workspace" hidden={tab !== 'workspace'}>
          <WorkspaceTab />
        </div>
        <div role="tabpanel" id="panel-prompts" aria-labelledby="tab-prompts" hidden={tab !== 'prompts'}>
          <PromptsTab onSaved={() => setVersionsRefreshKey((k) => k + 1)} />
        </div>
        <div role="tabpanel" id="panel-versions" aria-labelledby="tab-versions" hidden={tab !== 'versions'}>
          <VersionsTab refreshKey={versionsRefreshKey} />
        </div>
      </main>
    </div>
  );
}
