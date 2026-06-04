import { useEffect, useRef } from 'react';
import { hasRichTextMarkup, sanitizeRichText } from '../features/tasks/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
  placeholder?: string;
}

const COMMANDS: Array<{ command: string; label: React.ReactNode; title: string }> = [
  { command: 'bold', label: <strong>B</strong>, title: 'Bold' },
  { command: 'italic', label: <em>I</em>, title: 'Italic' },
  { command: 'underline', label: <u>U</u>, title: 'Underline' },
  { command: 'strikeThrough', label: <s>S</s>, title: 'Strikethrough' },
  { command: 'insertChecklist', label: '☐ Check', title: 'Checklist' },
  { command: 'insertUnorderedList', label: '• List', title: 'Bullet list' },
  { command: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
];

// Controlled contentEditable that emits sanitized HTML in the exact format the
// backend validates and legacy cards render. Ports the legacy execCommand-based
// editor including the custom checklist insert.
export const RichTextEditor = ({ value, onChange, ariaLabel, placeholder }: RichTextEditorProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Sync external value into the DOM only when it diverges, to avoid clobbering
  // the caret while the user types.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const current = surface.innerHTML;
    if (current === value) return;
    if (hasRichTextMarkup(value)) {
      surface.innerHTML = sanitizeRichText(value);
    } else {
      surface.textContent = value;
    }
  }, [value]);

  const emit = () => {
    const surface = surfaceRef.current;
    if (!surface) return;
    onChange(sanitizeRichText(surface.innerHTML));
  };

  const runCommand = (command: string) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.focus();

    if (command === 'insertChecklist') {
      const id = `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      document.execCommand(
        'insertHTML',
        false,
        `<div><label class="rich-check-item"><input id="${id}" class="rich-check-input" data-rich-checklist="true" type="checkbox"> <span class="rich-check-text">Checklist item</span></label></div>`,
      );
    } else {
      document.execCommand(command, false);
    }
    emit();
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar" aria-label={ariaLabel}>
        {COMMANDS.map((item) => (
          <button
            key={item.command}
            type="button"
            title={item.title}
            // Prevent the surface from losing selection on mousedown.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(item.command)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={surfaceRef}
        className="rich-editor-surface"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
};
