import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const panel = useRef(null);
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel.current?.querySelector('[data-autofocus],input,select,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-cocoa-900/55 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`relative flex max-h-[92vh] w-full ${widths[size]} animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl`}>
        <div className="flex items-center justify-between border-b border-cocoa-100 px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-cocoa-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-cocoa-500 hover:bg-cocoa-50 hover:text-cocoa-800" aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-cocoa-100 bg-cream/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <p className="text-[15px] leading-relaxed text-cocoa-700">{message}</p>
    </Modal>
  );
}
