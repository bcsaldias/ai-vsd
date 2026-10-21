// Draggable, keyboard-accessible splitter. `value` is the size of the pane
// after the handle (to its right, or below it) as a fraction of the container.

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

interface Props {
  /** Direction of the divider line: 'vertical' resizes columns, 'horizontal' resizes rows. */
  orientation: 'vertical' | 'horizontal';
  label: string;
  /** id of the pane whose size `value` describes. */
  controls: string;
  value: number;
  min: number;
  max: number;
  /** Pixel floor the CSS also enforces; keeps value from drifting below what's rendered. */
  minPx: number;
  defaultValue: number;
  containerRef: RefObject<HTMLElement | null>;
  onChange: (value: number) => void;
  className?: string;
}

const KEY_STEP = 0.02;
const BODY_CLASSES = ['resizing-col', 'resizing-row'];

export function ResizeHandle({
  orientation, label, controls, value, min, max, minPx, defaultValue, containerRef, onChange, className = '',
}: Props) {
  const drag = useRef<{ start: number; startValue: number; size: number } | null>(null);
  const vertical = orientation === 'vertical';
  const clamp = (v: number, size: number) => {
    const effectiveMin = size > 0 ? Math.min(max, Math.max(min, minPx / size)) : min;
    return Math.min(max, Math.max(effectiveMin, v));
  };

  // Don't leave the page stuck in "resizing" mode if we unmount mid-drag.
  useEffect(() => () => document.body.classList.remove(...BODY_CLASSES), []);

  /** Container's content-box size along the resize axis (grid percentages resolve against it). */
  const contentSize = () => {
    const el = containerRef.current;
    if (!el) return 0;
    const s = getComputedStyle(el);
    return vertical
      ? el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
      : el.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const size = contentSize();
    if (size <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Start from the rendered size, in case the stored value sits below the pixel floor.
    drag.current = { start: vertical ? e.clientX : e.clientY, startValue: clamp(value, size), size };
    document.body.classList.add(vertical ? 'resizing-col' : 'resizing-row');
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = (vertical ? e.clientX : e.clientY) - d.start;
    // Moving the handle left/up grows the pane after it.
    onChange(clamp(d.startValue - delta / d.size, d.size));
  };

  const endDrag = () => {
    drag.current = null;
    document.body.classList.remove(...BODY_CLASSES);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const size = contentSize();
    const current = clamp(value, size);
    // Arrow keys move the handle in the arrow's direction.
    const keys: Record<string, number> = vertical
      ? { ArrowLeft: current + KEY_STEP, ArrowRight: current - KEY_STEP }
      : { ArrowUp: current + KEY_STEP, ArrowDown: current - KEY_STEP };
    const next = e.key === 'Enter' ? defaultValue : keys[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(clamp(next, size));
  };

  const reset = () => onChange(clamp(defaultValue, contentSize()));

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
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
