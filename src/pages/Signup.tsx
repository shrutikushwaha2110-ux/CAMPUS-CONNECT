// /signup: create a new account (SU1–SU3). Stored in the database with a hashed password.
// Students can use CampusConnect straight away; Club Manager and Faculty accounts wait for approval.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAppData } from '../state/AppData';
import { validateSignup, type Errors } from '../lib/validation';
import { ROLE_HOME, ROLE_LABELS, ROLE_SLUGS, type Role } from '../lib/constants';
import { Shell } from './Login';

const inputClass = 'w-full px-4 py-3 rounded-xl border outline-none text-sm focus:border-primary';

export function Signup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signup, clubs, liveClubIds, openHeadClubs } = useAppData();
  const initialRole = (['student', 'clubManager', 'faculty'] as Role[]).includes(params.get('role') as Role) ? (params.get('role') as Role) : 'student';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: initialRole as Role, clubId: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [pendingDone, setPendingDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const openHeads = new Set(openHeadClubs);
  const clubChoices = form.role === 'faculty' ? clubs.filter(c => openHeads.has(c.id)) : clubs;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // Same rules the server applies; checked here too for instant feedback (email uniqueness is checked by the server)
    const errs = validateSignup(form, [], liveClubIds, openHeads);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    const r = await signup({ ...form, clubId: form.role === 'student' ? undefined : form.clubId });
    setBusy(false);
    if (!r.ok) { setErrors(r.errors ?? {}); setServerError(r.error); return; }
    if (r.status === 'approved') navigate(ROLE_HOME.student, { replace: true });
    else setPendingDone(true);
  };

  if (pendingDone) {
    const club = clubs.find(c => c.id === form.clubId);
    return (
      <Shell>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-border text-center" data-testid="signup-pending" style={{ boxShadow: '0 4px 24px rgba(31,29,43,0.08)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-primary-tint text-2xl" aria-hidden="true">⏳</div>
          <h1 className="font-bold text-xl mt-4" style={{ color: '#1F1D2B' }}>Request sent</h1>
          <p className="text-sm mt-2" style={{ color: '#454242' }}>
            Your {ROLE_LABELS[form.role]} account for <strong>{club?.name}</strong> is waiting for approval
            {form.role === 'clubManager' ? ' by the club’s faculty head' : ' by a faculty member'}. Once approved, log in with the email and password you just chose.
          </p>
          <Link to={`/login/${ROLE_SLUGS[form.role]}`} className="inline-block mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary">Go to {ROLE_LABELS[form.role]} login</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 border border-border" style={{ boxShadow: '0 4px 24px rgba(31,29,43,0.08)' }}>
        <h1 className="font-bold text-2xl mb-1" style={{ color: '#1F1D2B' }}>Create your account</h1>
        <p className="text-sm mb-6" style={{ color: '#454242' }}>
          Already registered? <Link to="/login" className="font-semibold" style={{ color: '#4637D2' }}>Log in</Link>
        </p>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="signup-form">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold mb-1" style={{ color: '#1F1D2B' }}>I am a…</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['student', 'clubManager', 'faculty'] as Role[]).map(r => (
                <label key={r} className={`text-center text-xs font-semibold px-2 py-3 rounded-xl border cursor-pointer ${form.role === r ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border'}`}>
                  <input type="radio" name="role" value={r} checked={form.role === r} className="sr-only"
                    onChange={() => setForm(f => ({ ...f, role: r, clubId: '' }))} />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
            <p className="text-xs" style={{ color: '#64748b' }}>
              {form.role === 'student'
                ? 'Student accounts work straight away.'
                : form.role === 'clubManager'
                  ? 'Club Manager accounts are approved by that club’s faculty head before you can log in.'
                  : 'Faculty accounts head one club and are approved by a faculty member before you can log in.'}
            </p>
          </fieldset>

          <Row id="su-name" label="Full name" error={errors.name}>
            <input id="su-name" autoComplete="name" value={form.name} onChange={set('name')} className={`${inputClass} ${errors.name ? 'border-[#F87171]' : 'border-border'}`} />
          </Row>
          <Row id="su-email" label="Email" error={errors.email}>
            <input id="su-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={`${inputClass} ${errors.email ? 'border-[#F87171]' : 'border-border'}`} />
          </Row>
          {form.role !== 'student' && (
            <Row id="su-club" label={form.role === 'faculty' ? 'Club you will head' : 'Club you manage'} error={errors.clubId}
              hint={form.role === 'faculty' ? 'Only clubs without a faculty head are listed.' : undefined}>
              <select id="su-club" value={form.clubId} onChange={set('clubId')} className={`${inputClass} bg-white ${errors.clubId ? 'border-[#F87171]' : 'border-border'}`}>
                <option value="">{clubChoices.length ? 'Select a club…' : 'No club available'}</option>
                {clubChoices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Row>
          )}
          <Row id="su-password" label="Password" error={errors.password} hint="At least 8 characters, with letters and numbers.">
            <input id="su-password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className={`${inputClass} ${errors.password ? 'border-[#F87171]' : 'border-border'}`} />
          </Row>
          <Row id="su-confirm" label="Confirm password" error={errors.confirm}>
            <input id="su-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} className={`${inputClass} ${errors.confirm ? 'border-[#F87171]' : 'border-border'}`} />
          </Row>

          {serverError && !Object.keys(errors).length && <p role="alert" className="text-sm font-medium px-4 py-3 rounded-xl" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>{serverError}</p>}
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-60">
            {busy ? 'Creating account…' : form.role === 'student' ? 'Create account' : 'Request account'}
          </button>
        </form>
      </div>
    </Shell>
  );
}

function Row({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold" style={{ color: '#1F1D2B' }}>{label}</label>
      {children}
      {hint && !error && <p className="text-xs" style={{ color: '#64748b' }}>{hint}</p>}
      {error && <p className="text-xs font-medium text-[#B91C1C]" role="alert" data-error={id}>{error}</p>}
    </div>
  );
}
