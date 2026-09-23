// Small shared UI kit for staff/dashboard pages, using the Figma design tokens (primary #4637D2, night #1C1750).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router';

const CARD_SHADOW = '0 1px 3px rgba(31,29,43,0.07), 0 4px 16px rgba(31,29,43,0.05)';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark border border-primary',
  secondary: 'bg-white text-primary border border-primary hover:bg-primary-tint',
  danger: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] hover:bg-[#FECACA]',
  success: 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] hover:bg-[#BBF7D0]',
  ghost: 'bg-white text-text-muted border border-border hover:border-primary hover:text-primary',
};
const btnBase = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-sm px-4 min-h-[40px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// React 19: `ref` is a normal prop, so ComponentProps<'button'> lets callers focus the button
export function Button({ variant = 'primary', className = '', ...rest }: { variant?: Variant } & React.ComponentProps<'button'>) {
  return <button type="button" className={`${btnBase} ${variantClass[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({ to, variant = 'primary', className = '', children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return <Link to={to} className={`${btnBase} ${variantClass[variant]} ${className}`}>{children}</Link>;
}

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-white rounded-2xl border border-border ${className}`} style={{ boxShadow: CARD_SHADOW }} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">{eyebrow}</div>}
        <h1 className="font-bold text-text" style={{ fontSize: 'clamp(26px,4vw,36px)', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ title, action, children, id }: { title: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="mb-10" id={id} aria-label={typeof title === 'string' ? title : undefined}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-bold text-lg text-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="font-bold text-text mt-1" style={{ fontSize: 28 }} data-stat={label}>{value}</p>
      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
    </Card>
  );
}

type PillTone = 'green' | 'amber' | 'red' | 'grey' | 'purple';
const pillTone: Record<PillTone, string> = {
  green: 'bg-[#DCFCE7] text-[#166534]',
  amber: 'bg-[#FEF3C7] text-[#78350F]',
  red: 'bg-[#FEE2E2] text-[#991B1B]',
  grey: 'bg-[#E2E8F0] text-[#334155]',
  purple: 'bg-primary-tint text-primary-ink',
};
export function Pill({ tone = 'purple', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${pillTone[tone]}`}>{children}</span>;
}

export function RegStatusPill({ status, eventCancelled }: { status: string; eventCancelled?: boolean }) {
  if (eventCancelled) return <Pill tone="grey">Cancelled by organiser</Pill>;
  if (status === 'confirmed') return <Pill tone="green">Confirmed</Pill>;
  if (status === 'pending') return <Pill tone="amber">Pending approval</Pill>;
  return <Pill tone="red">Rejected</Pill>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-border text-sm font-medium" style={{ color: '#64748b' }}>
      {children}
    </div>
  );
}

// ---------- forms ----------
const inputClass = 'w-full px-4 py-3 rounded-xl border bg-white outline-none text-sm text-text focus:border-primary focus:ring-2 focus:ring-primary-tint';

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-text">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-[#B91C1C]" role="alert" data-error={htmlFor}>{error}</p>}
    </div>
  );
}

export function TextInput({ invalid, ...rest }: { invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${invalid ? 'border-[#F87171]' : 'border-border'}`} aria-invalid={invalid || undefined} {...rest} />;
}
export function SelectInput({ invalid, children, ...rest }: { invalid?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClass} ${invalid ? 'border-[#F87171]' : 'border-border'}`} aria-invalid={invalid || undefined} {...rest}>{children}</select>;
}
export function TextArea({ invalid, ...rest }: { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[110px] ${invalid ? 'border-[#F87171]' : 'border-border'}`} aria-invalid={invalid || undefined} {...rest} />;
}

// ---------- confirm dialog ("Are you sure?") ----------
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, danger = true }: {
  open: boolean; title: string; message: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(28,23,80,0.45)' }} onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 id="confirm-title" className="font-bold text-lg text-text mb-2">{title}</h2>
        <div className="text-sm text-text-muted mb-6">{message}</div>
        <div className="flex gap-2 justify-end flex-wrap">
          <Button variant="ghost" ref={cancelRef} onClick={onCancel}>Keep it</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- toasts (F12) ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div role="status" className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold z-[70] shadow-xl max-w-[90vw]"
          style={{ backgroundColor: '#1C1750', color: '#fff' }}>
          <svg width="15" height="15" fill="none" stroke="#4ADE80" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
