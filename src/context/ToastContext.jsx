import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONES = {
  success: 'border-emerald-200 text-emerald-900',
  error: 'border-red-200 text-red-900',
  info: 'border-cocoa-100 text-cocoa-800',
};
const ICON_TONES = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-caramel-600' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((message, type = 'success', ms = 2800) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    if (ms) setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error', 5000),
    info: (m) => push(m, 'info'),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite" role="status">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lift ${TONES[t.type]}`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_TONES[t.type]}`} aria-hidden />
              <p className="flex-1 text-sm font-medium">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-cocoa-400 hover:text-cocoa-700" aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
