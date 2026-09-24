// /faculty/users: faculty manage accounts (U1–U3, rule 26)
// - students: add / edit / deactivate
// - club managers: only for the club this faculty member heads
// - other faculty: view only. Never edit, demote or deactivate them.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAppData } from '../../state/AppData';
import type { User } from '../../data/types';
import { ROLE_LABELS, type Role } from '../../lib/constants';
import { validateUser, type Errors } from '../../lib/validation';
import { assignableClubs, canDeactivateUser, canEditUser, canReviewSignup } from '../../lib/permissions';
import { Button, Card, ConfirmDialog, Field, PageHeader, Pill, SelectInput, TextInput, useToast } from '../../components/ui';

type Draft = { id?: string; name: string; email: string; role: Role; clubId: string; password: string };
const blank: Draft = { name: '', email: '', role: 'student', clubId: '', password: '' };

export function ManageUsers() {
  const { users, clubs, liveClubIds, saveUser, setUserActive, reviewSignup, session, registrations, memberships, newId } = useAppData();
  const toast = useToast();
  const [roleFilter, setRoleFilter] = useState<'' | Role>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [toggling, setToggling] = useState<User | null>(null);
  const actor = session ? { ...session } : null;
  const myClub = clubs.find(c => c.id === session?.clubId);

  const pending = users.filter(u => u.status === 'pending');
  const list = users.filter(u => u.status !== 'pending' && (!roleFilter || u.role === roleFilter));
  const editingSelf = !!draft?.id && draft.id === session?.userId;
  const clubChoices = draft ? assignableClubs(actor, draft.role, clubs, users, draft.id) : [];
  // Adding: students, managers for my club, or a faculty head for a club that has none
  const roleChoices: Role[] = editingSelf ? ['faculty'] : ['student', 'clubManager', 'faculty'];

  const startEdit = (u: User) => { setErrors({}); setDraft({ id: u.id, name: u.name, email: u.email, role: u.role, clubId: u.clubId ?? '', password: '' }); };
  const startNew = () => { setErrors({}); setDraft({ ...blank }); };
  const setRole = (role: Role) => {
    if (!draft) return;
    const choices = assignableClubs(actor, role, clubs, users, draft.id);
    setDraft({ ...draft, role, clubId: choices.length === 1 ? choices[0].id : '' });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const needsClub = draft.role === 'clubManager' || draft.role === 'faculty';
    const input = { ...draft, clubId: needsClub ? draft.clubId : undefined, password: draft.id ? undefined : draft.password };
    const errs = validateUser(input, users, liveClubIds);
    const prev = draft.id ? users.find(u => u.id === draft.id) : undefined;
    if (prev && !canEditUser(actor, prev)) errs.role = 'You cannot change this account';
    if (editingSelf && draft.role !== 'faculty') errs.role = "You can't remove your own faculty access";
    if (needsClub && !editingSelf && !clubChoices.some(c => c.id === draft.clubId)) {
      errs.clubId = draft.role === 'clubManager'
        ? 'You can only assign club managers to the club you head'
        : 'Pick a club that has no faculty head yet';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const user: User = {
      id: draft.id ?? newId(draft.name),
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      role: draft.role,
      clubId: needsClub ? draft.clubId : undefined,
      active: prev?.active ?? true,
      status: prev?.status ?? 'approved',
    };
    // The server hashes the temporary password; it is never stored or returned in plain text
    const r = await saveUser(user, prev ? undefined : draft.password);
    if (!r.ok) { setErrors(r.errors ?? {}); toast(r.error); return; }
    toast(prev ? `Updated ${user.name}` : `Created ${ROLE_LABELS[user.role]} account for ${user.name}`);
    setDraft(null);
  };

  const confirmToggle = async () => {
    if (!toggling || !canDeactivateUser(actor, toggling)) { setToggling(null); return; }
    const r = await setUserActive(toggling.id, !toggling.active);
    toast(r.ok ? `${toggling.name} ${toggling.active ? 'deactivated. They can no longer log in' : 'reactivated'}` : r.error);
    setToggling(null);
  };

  const review = async (u: User, decision: 'approve' | 'decline') => {
    const r = await reviewSignup(u.id, decision);
    toast(r.ok ? `${u.name}'s ${ROLE_LABELS[u.role]} account ${decision === 'approve' ? 'approved. They can log in now' : 'declined'}` : r.error);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Admin dashboard</Link>
      <div className="mt-4">
        <PageHeader eyebrow="Faculty / Admin" title="Users"
          subtitle={<>You can manage students and the club managers of <strong>{myClub?.name ?? 'your club'}</strong>. Other faculty members' accounts are protected: you can see them but not edit or deactivate them.</>}
          actions={<Button onClick={startNew}>+ Add user</Button>} />
      </div>

      {draft && (
        <Card className="p-6 mb-8" data-testid="user-form-card">
          <h2 className="font-bold text-lg text-text mb-4">{draft.id ? `Edit ${draft.name}` : 'New user'}</h2>
          <form onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="user-form">
            <Field label="Full name" htmlFor="u-name" error={errors.name}><TextInput id="u-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="u-email" error={errors.email} hint="Must end with @atria.edu.in"><TextInput id="u-email" type="email" placeholder="name@atria.edu.in" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} invalid={!!errors.email} /></Field>
            <Field label="Role" htmlFor="u-role" error={errors.role} hint={editingSelf ? 'You cannot change your own role.' : undefined}>
              <SelectInput id="u-role" value={draft.role} onChange={e => setRole(e.target.value as Role)} disabled={editingSelf}>
                {roleChoices.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </SelectInput>
            </Field>
            {(draft.role === 'clubManager' || draft.role === 'faculty') && !editingSelf ? (
              <Field label={draft.role === 'faculty' ? 'Club they head' : 'Assigned club'} htmlFor="u-club" error={errors.clubId}
                hint={draft.role === 'faculty' ? 'Only clubs without a faculty head are listed.' : 'Managers can only be assigned to the club you head.'}>
                <SelectInput id="u-club" value={draft.clubId} onChange={e => setDraft({ ...draft, clubId: e.target.value })} invalid={!!errors.clubId}>
                  <option value="">{clubChoices.length ? 'Select a club…' : 'No club available'}</option>
                  {clubChoices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
              </Field>
            ) : <div />}
            {!draft.id && (
              <Field label="Temporary password" htmlFor="u-password" error={errors.password} hint="Share it with them privately; it is stored hashed. At least 6 characters.">
                <TextInput id="u-password" type="text" value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} invalid={!!errors.password} />
              </Field>
            )}
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit">{draft.id ? 'Save user' : 'Create user'}</Button>
            </div>
          </form>
        </Card>
      )}

      <section className="mb-8" aria-label="Sign-up requests" data-testid="signup-requests">
        <h2 className="font-bold text-lg text-text mb-3">Sign-up requests ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-text-muted">No pending requests. Club Manager and Faculty sign-ups appear here until they are approved.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map(u => {
              const club = clubs.find(c => c.id === u.clubId);
              const reviewable = canReviewSignup(actor, u, users);
              return (
                <Card key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3" data-pending={u.email}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-text">{u.name}</p>
                    <p className="text-xs text-text-muted">{u.email} · wants to be {ROLE_LABELS[u.role]} {u.role === 'faculty' ? 'head of' : 'of'} {club?.name ?? 'a club'}</p>
                  </div>
                  <Pill tone="amber">Pending</Pill>
                  {reviewable ? (
                    <div className="flex gap-2">
                      <Button variant="success" onClick={() => review(u, 'approve')}>Approve</Button>
                      <Button variant="danger" onClick={() => review(u, 'decline')}>Decline</Button>
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted">For {club?.name ?? 'that club'}'s faculty head</span>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label="Filter by role">
        {(['', 'student', 'clubManager', 'faculty'] as const).map(r => (
          <button key={r || 'all'} onClick={() => setRoleFilter(r)}
            className={`px-4 h-10 rounded-full text-sm font-medium border ${roleFilter === r ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border'}`}>
            {r ? ROLE_LABELS[r] : 'All'} ({users.filter(u => u.status !== 'pending' && (!r || u.role === r)).length})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3" data-testid="users-list">
        {list.map(u => {
          const club = u.clubId ? clubs.find(c => c.id === u.clubId) : undefined;
          const activity = u.role === 'student'
            ? `${registrations.filter(r => r.userId === u.id).length} registrations · ${memberships.filter(m => m.userId === u.id).length} clubs`
            : u.role === 'clubManager' ? (club ? `Manages ${club.name}` : 'No active club')
              : (club ? `Head of ${club.name}` : 'No active club');
          const editable = canEditUser(actor, u);
          const deactivatable = canDeactivateUser(actor, u);
          return (
            <Card key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3" data-user={u.id}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text">{u.name} {u.id === session?.userId && <span className="text-xs text-text-muted">(you)</span>}</p>
                <p className="text-xs text-text-muted">{u.email} · {activity}</p>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Pill tone={u.role === 'faculty' ? 'grey' : 'purple'}>{ROLE_LABELS[u.role]}</Pill>
                {u.status === 'declined' ? <Pill tone="grey">Sign-up declined</Pill> : u.active ? <Pill tone="green">Active</Pill> : <Pill tone="red">Deactivated</Pill>}
                {editable && u.status === 'approved' && <Button variant="ghost" onClick={() => startEdit(u)}>Edit</Button>}
                {deactivatable && u.status === 'approved' && (
                  <Button variant={u.active ? 'danger' : 'success'} onClick={() => setToggling(u)}>{u.active ? 'Deactivate' : 'Activate'}</Button>
                )}
                {!editable && (
                  <span className="text-xs text-text-muted" data-protected>
                    {u.role === 'faculty' ? 'Protected: faculty account' : `Managed by the ${club?.name ?? 'club'}'s faculty head`}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!toggling}
        title="Are you sure?"
        message={toggling?.active ? <>Deactivate <strong>{toggling?.name}</strong>? They will be logged out and can't log in again until reactivated.</> : <>Reactivate <strong>{toggling?.name}</strong>?</>}
        confirmLabel={toggling?.active ? 'Deactivate' : 'Activate'}
        danger={!!toggling?.active}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
    </div>
  );
}
