import { useId } from 'react';

const base = 'w-full rounded-xl border bg-white px-3.5 text-[15px] text-cocoa-900 placeholder:text-cocoa-300 transition focus:outline-none focus:ring-2 disabled:bg-cocoa-50 disabled:text-cocoa-400';
const tone = (error) => (error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-cocoa-200 hover:border-cocoa-300 focus:border-caramel-600 focus:ring-caramel-200');

function Wrap({ id, label, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cocoa-800">
          {label}{required && <span className="ml-0.5 text-red-600" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-cocoa-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
const aria = (id, error, hint) => ({ 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined });

export function Input({ label, error, hint, className, wrapClass, required, ...props }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={required} className={wrapClass}>
      <input id={id} required={required} className={`${base} h-11 ${tone(error)} ${className || ''}`} {...aria(id, error, hint)} {...props} />
    </Wrap>
  );
}

export function Textarea({ label, error, hint, className, wrapClass, required, rows = 3, ...props }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={required} className={wrapClass}>
      <textarea id={id} rows={rows} required={required} className={`${base} py-2.5 ${tone(error)} ${className || ''}`} {...aria(id, error, hint)} {...props} />
    </Wrap>
  );
}

export function Select({ label, error, hint, className, wrapClass, required, children, ...props }) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={required} className={wrapClass}>
      <select id={id} required={required} className={`${base} h-11 ${tone(error)} ${className || ''}`} {...aria(id, error, hint)} {...props}>{children}</select>
    </Wrap>
  );
}

export function Checkbox({ label, className = '', ...props }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`inline-flex cursor-pointer items-center gap-2 text-sm text-cocoa-800 ${className}`}>
      <input id={id} type="checkbox" className="h-4 w-4 rounded border-cocoa-300 text-caramel-600 focus:ring-caramel-500" {...props} />
      {label}
    </label>
  );
}
