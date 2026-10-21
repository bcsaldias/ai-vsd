// Placeholder annotation activity: SVG regions that can be hovered, selected, and annotated.

import { useState } from 'react';
import type { ActivityProps } from '../../types/contracts';

export interface AnnotationState {
  /** regionId -> student's note */
  annotations: Record<string, string>;
}

const REGIONS = [
  { id: 'sun', name: 'Sun', shape: <circle cx="70" cy="60" r="35" /> },
  { id: 'cloud', name: 'Cloud', shape: <ellipse cx="330" cy="55" rx="90" ry="35" /> },
  { id: 'rain', name: 'Rain', shape: <rect x="270" y="100" width="120" height="70" rx="6" /> },
  { id: 'lake', name: 'Lake', shape: <ellipse cx="200" cy="215" rx="170" ry="30" /> },
];

export function AnnotationActivity({ prompt, savedState, onChange }: ActivityProps<AnnotationState>) {
  const [state, setState] = useState<AnnotationState>(savedState ?? { annotations: {} });
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const setNote = (regionId: string, note: string) => {
    const next = { annotations: { ...state.annotations, [regionId]: note } };
    setState(next);
    onChange(next);
  };

  const selectedRegion = REGIONS.find((r) => r.id === selected);

  return (
    <div className="activity">
      <p className="activity-prompt">{prompt}</p>
      <div className="annotation-layout">
        <svg className="canvas" viewBox="0 0 460 260" role="img" aria-label="Water cycle picture">
          {REGIONS.map((r) => (
            <g
              key={r.id}
              className={[
                'region',
                hovered === r.id && 'hovered',
                selected === r.id && 'selected',
                state.annotations[r.id] && 'annotated',
              ].filter(Boolean).join(' ')}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(r.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelected(r.id)}
              aria-label={r.name}
            >
              {r.shape}
            </g>
          ))}
        </svg>
        <div className="annotation-editor">
          {selectedRegion ? (
            <label>
              <span>Note for <strong>{selectedRegion.name}</strong></span>
              <textarea
                value={state.annotations[selectedRegion.id] ?? ''}
                onChange={(e) => setNote(selectedRegion.id, e.target.value)}
                placeholder="Which stage does this show?"
                rows={4}
              />
            </label>
          ) : (
            <p className="hint">Select a part of the picture to annotate it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
