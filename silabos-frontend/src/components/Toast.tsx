import { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

function getToastStyles(type: ToastType) {
  if (type === 'success') return 'bg-green-800 text-white';
  if (type === 'error') return 'bg-red-800 text-white';
  if (type === 'warning') return 'bg-yellow-700 text-white';
  return 'bg-blue-800 text-white';
}

function ToastMessage({ toast, removeToast }: { toast: ToastItem; removeToast: (id: string) => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      removeToast(toast.id);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [removeToast, toast.id]);

  return (
    <div
      className={`w-full min-w-[280px] max-w-sm rounded-xl px-4 py-3 shadow-xl flex items-start gap-3 ${getToastStyles(
        toast.type,
      )} toast-slide-in`}
    >
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="text-white/80 hover:text-white text-lg leading-none"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <>
      <style>
        {`
          @keyframes toast-slide-in {
            from {
              opacity: 0;
              transform: translateX(24px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .toast-slide-in {
            animation: toast-slide-in 0.25s ease-out;
          }
        `}
      </style>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => {
          return (
            <div key={toast.id}>
              <ToastMessage toast={toast} removeToast={removeToast} />
            </div>
          );
        })}
      </div>
    </>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, message, type }]);
    return id;
  }, []);

  return {
    showToast,
    toasts,
    removeToast,
  };
}
