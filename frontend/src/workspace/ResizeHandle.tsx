// Draggable, keyboard-accessible splitter. `value` is the size of the pane on one
// side of the handle (`pane`), either as a fraction of a container or in pixels (`unit`).

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

interface Props {
  /** Direction of the divider line: 'vertical' resizes columns, 'horizontal' resizes rows. */
  orientation: 'vertical' | 'horizontal';
  label: string;
  /** id of the pane whose size `value` describes. */
  controls: string;
  /** Which side of the handle that pane is on: before (left/above) or after (right/below). */
  pane: 'before' | 'after';
  /** 'fraction': share of containerRef's content box. 'px': absolute pixels. */
  unit: 'fraction' | 'px';
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  /** Fraction unit only: pixel floor the CSS also enforces; keeps value from drifting below what's rendered. */
  minPx?: number;
  /** Required for the fraction unit. */
  containerRef?: RefObject<HTMLElement | null>;
  onChange: (value: number) => void;
  /** Overrides resetting to defaultValue (Enter / double-click), e.g. to go back to an automatic size. */
  onReset?: () => void;
  className?: string;
}

const KEY_STEP = { fraction: 0.02, px: 24 };
const BODY_CLASSES = ['resizing-col', 'resizing-row'];

export function ResizeHandle({
  orientation, label, controls, pane, unit, value, min, max, defaultValue, minPx = 0, containerRef, onChange, onReset, className = '',
}: Props) {
  const drag = useRef<{ start: number; startValue: number; unitPx: number } | null>(null);
  const vertical = orientation === 'vertical';

  // Don't leave the page stuck in "resizing" mode if we unmount mid-drag.
  useEffect(() => () => document.body.classList.remove(...BODY_CLASSES), []);

  /** Pixels per unit of `value`: the container's content-box size for fractions, 1 for px. */
  const unitPx = () => {
    if (unit === 'px') return 1;
    const el = containerRef?.current;
    if (!el) return 0;
    const s = getComputedStyle(el);
    return vertical
      ? el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
      : el.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
  };

  const clamp = (v: number, perUnit: number) => {
    const floor = unit === 'fraction' && perUnit > 0 ? minPx / perUnit : 0;
    const effectiveMin = Math.min(max, Math.max(min, floor));
    return Math.min(max, Math.max(effectiveMin, v));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const perUnit = unitPx();
    if (perUnit <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Start from the rendered size, in case the stored value sits below the pixel floor.
    drag.current = { start: vertical ? e.clientX : e.clientY, startValue: clamp(value, perUnit), unitPx: perUnit };
    document.body.classList.add(vertical ? 'resizing-col' : 'resizing-row');
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = ((vertical ? e.clientX : e.clientY) - d.start) / d.unitPx;
    // Moving the handle right/down grows a pane before it and shrinks a pane after it.
    onChange(clamp(d.startValue + (pane === 'before' ? delta : -delta), d.unitPx));
  };

  const endDrag = () => {
    drag.current = null;
    document.body.classList.remove(...BODY_CLASSES);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const perUnit = unitPx();
    const current = clamp(value, perUnit);
    const step = KEY_STEP[unit];
    // Arrow keys move the handle in the arrow's direction.
    const [back, forward] = vertical ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
    const sign = pane === 'before' ? 1 : -1;
    const keys: Record<string, number> = { [back]: current - sign * step, [forward]: current + sign * step };
    if (e.key === 'Enter' && onReset) {
      e.preventDefault();
      onReset();
      return;
    }
    const next = e.key === 'Enter' ? defaultValue : keys[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(clamp(next, perUnit));
  };

  const reset = () => (onReset ? onReset() : onChange(clamp(defaultValue, unitPx())));

  const toAria = (v: number) => Math.round(unit === 'fraction' ? v * 100 : v);

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={toAria(value)}
      aria-valuemin={toAria(min)}
      aria-valuemax={toAria(max)}
      aria-valuetext={unit === 'fraction' ? `${toAria(value)}%` : `${toAria(value)} pixels`}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      className={`resize-handle ${orientation} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={reset}
      onKeyDown={onKeyDown}
    />
  );
}
