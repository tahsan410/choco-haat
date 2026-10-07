import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-caramel-600 text-white hover:bg-caramel-700 focus-visible:ring-caramel-600 shadow-sm',
  dark: 'bg-cocoa-800 text-cream hover:bg-cocoa-700 focus-visible:ring-cocoa-800 shadow-sm',
  secondary: 'bg-white text-cocoa-800 border border-cocoa-200 hover:border-cocoa-400 hover:bg-cream focus-visible:ring-cocoa-400',
  ghost: 'text-cocoa-700 hover:bg-cocoa-50 focus-visible:ring-cocoa-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  dangerGhost: 'text-red-700 hover:bg-red-50 focus-visible:ring-red-400',
};
const SIZES = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-5 text-sm gap-2', lg: 'h-12 px-7 text-base gap-2' };

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `inline-flex select-none items-center justify-center rounded-full font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export default function Button({ variant, size, loading = false, disabled, className, children, to, href, type = 'button', ...rest }) {
  const cls = buttonClasses({ variant, size, className });
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
