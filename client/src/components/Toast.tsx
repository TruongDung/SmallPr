import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error';

interface ToastState {
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone, options?: { persist?: boolean }) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>((message, tone = 'success', options = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, tone });
    if (options.persist) return;
    timerRef.current = setTimeout(
      () => {
        setToast(null);
        timerRef.current = null;
      },
      tone === 'error' ? 3500 : 2000,
    );
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          id="status-toast"
          className={`status-toast${toast.tone === 'error' ? ' status-toast-error' : ''}`}
          role="status"
          onClick={hideToast}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
