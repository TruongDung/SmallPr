import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleId?: string;
  className?: string;
  children: ReactNode;
}

// Mirrors the legacy markup: .modal-backdrop > .modal so the existing
// styles.css applies unchanged. Closes on backdrop click and Escape.
export const Modal = ({ open, onClose, title, titleId, className, children }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modal${className ? ` ${className}` : ''}`}>
        {title && <h3 id={titleId}>{title}</h3>}
        {children}
      </div>
    </div>
  );
};
