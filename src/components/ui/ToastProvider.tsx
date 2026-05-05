'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'error' | 'success' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => removeToast(id), 4500);
    },
    [removeToast],
  );

  const showError = useCallback(
    (message: string) => {
      showToast(message, 'error');
    },
    [showToast],
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      showError,
      showSuccess,
    }),
    [showError, showSuccess, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => removeToast(toast.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm shadow-lg backdrop-blur-md ${
              toast.type === 'error'
                ? 'border-red-400/40 bg-red-500/15 text-red-100'
                : toast.type === 'success'
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                  : 'border-sky-400/35 bg-sky-500/15 text-sky-100'
            }`}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
