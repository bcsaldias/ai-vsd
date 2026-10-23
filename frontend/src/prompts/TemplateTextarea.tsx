// A textarea that colors {{variables}} as you type. A textarea can't style parts of its text, so a
// copy of the text is drawn behind it with the variables marked, and the textarea's own text is
// transparent: typing, the caret, selection, and undo stay the textarea's.

import { useRef, type Ref } from 'react';
import { TEMPLATE_VARIABLES, templateParts } from '../services/promptService';

/** Fills each known variable with itself, so templateParts marks it without changing the text. */
const AS_TYPED = Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v, `{{${v}}}`]));

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows: number;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TemplateTextarea({ value, onChange, rows, ref }: Props) {
  const backdrop = useRef<HTMLDivElement>(null);
  return (
    <div className="template-input">
      <div className="template-backdrop" ref={backdrop} aria-hidden="true">
        {templateParts(value, AS_TYPED).map((part, i) =>
          part.variable ? <span key={i} className={part.unknown ? 'unknown' : 'variable'}>{part.text}</span> : part.text,
        )}
        {/* Keeps a trailing empty line as tall as in the textarea. */}
        {' '}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => backdrop.current && (backdrop.current.scrollTop = e.currentTarget.scrollTop)}
        rows={rows}
        spellCheck={false}
      />
    </div>
  );
}
