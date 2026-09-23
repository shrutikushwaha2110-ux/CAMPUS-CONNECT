// /faculty/users: Faculty/Admin manages accounts: add, change role / club assignment, deactivate (U1, U2)
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAppData } from '../../state/AppData';
import type { User } from '../../data/types';
import { ROLE_LABELS, type Role } from '../../lib/constants';
import { validateUser, type Errors } from '../../lib/validation';
import { Button, Card, ConfirmDialog, Field, PageHeader, Pill, SelectInput, TextInput, useToast } from '../../components/ui';

type Draft = { id?: string; name: string; email: string; role: Role; clubId: string; password: string };
const blank: Draft = { name: '', email: '', role: 'student', clubId: '', password: '' };

export function ManageUsers() {
  const { users, clubs, liveClubIds, saveUser, session, registrations, memberships, newId } = useAppData();
  const toast = useToast();
  const [roleFilter, setRoleFilter] = useState<'' | Role>('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [toggling, setToggling] = useState<User | null>(null);

  const list = users.filter(u => !roleFilter || u.role === roleFilter);

  const startEdit = (u: User) => { setErrors({}); setDraft({ id: u.id, name: u.name, email: u.email, role: u.role, clubId: u.clubId ?? '', password: '' }); };
  const startNew = () => { setErrors({}); setDraft({ ...blank }); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const input = { ...draft, clubId: draft.role === 'clubManager' ? draft.clubId : undefined, password: draft.id ? undefined : draft.password };
    const errs = validateUser(input, users, liveClubIds);
    if (draft.id && draft.id === session?.userId && draft.role !== 'faculty') errs.role = "You can't remove your own admin access";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const prev = draft.id ? users.find(u => u.id === draft.id) : undefined;
    const user: User = {
      id: draft.id ?? newId(draft.name),
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      password: prev?.password ?? draft.password,
      role: draft.role,
      clubId: draft.role === 'clubManager' ? draft.clubId : undefined,
      active: prev?.active ?? true,
    };
    saveUser(user);
    toast(prev ? `Updated ${user.name}` : `Created ${ROLE_LABELS[user.role]} account for ${user.name}`);
    setDraft(null);
  };

  const confirmToggle = () => {
    if (!toggling) return;
    saveUser({ ...toggling, active: !toggling.active });
    toast(`${toggling.name} ${toggling.active ? 'deactivated. They can no longer log in' : 'reactivated'}`);
    setToggling(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Admin dashboard</Link>
      <div className="mt-4">
        <PageHeader eyebrow="Faculty / Admin" title="Users" subtitle="Add accounts, assign Club Managers to clubs, and deactivate accounts."
          actions={<Button onClick={startNew}>+ Add user</Button>} />
      </div>

      {draft && (
        <Card className="p-6 mb-8" data-testid="user-form-card">
          <h2 className="font-bold text-lg text-text mb-4">{draft.id ? `Edit ${draft.name}` : 'New user'}</h2>
          <form onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="user-form">
            <Field label="Full name" htmlFor="u-name" error={errors.name}><TextInput id="u-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} invalid={!!errors.name} /></Field>
            <Field label="Email" htmlFor="u-email" error={errors.email}><TextInput id="u-email" type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} invalid={!!errors.email} /></Field>
            <Field label="Role" htmlFor="u-role" error={errors.role}>
              <SelectInput id="u-role" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABELS) as Role[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </SelectInput>
            </Field>
            {draft.role === 'clubManager' ? (
              <Field label="Assigned club" htmlFor="u-club" error={errors.clubId} hint="The manager will only see this club.">
                <SelectInput id="u-club" value={draft.clubId} onChange={e => setDraft({ ...draft, clubId: e.target.value })} invalid={!!errors.clubId}>
                  <option value="">Select a club…</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectInput>
              </Field>
            ) : <div />}
            {!draft.id && (
              <Field label="Temporary password" htmlFor="u-password" error={errors.password} hint="Demo only. At least 6 characters.">
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

      <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label="Filter by role">
        {(['', 'student', 'clubManager', 'faculty'] as const).map(r => (
          <button key={r || 'all'} onClick={() => setRoleFilter(r)}
            className={`px-4 h-10 rounded-full text-sm font-medium border ${roleFilter === r ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border'}`}>
            {r ? ROLE_LABELS[r] : 'All'} ({users.filter(u => !r || u.role === r).length})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3" data-testid="users-list">
        {list.map(u => {
          const club = u.clubId ? clubs.find(c => c.id === u.clubId) : undefined;
          const activity = u.role === 'student'
            ? `${registrations.filter(r => r.userId === u.id).length} registrations · ${memberships.filter(m => m.userId === u.id).length} clubs`
            : u.role === 'clubManager' ? (club ? `Manages ${club.name}` : 'No active club') : 'Full admin access';
          return (
            <Card key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3" data-user={u.id}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text">{u.name} {u.id === session?.userId && <span className="text-xs text-text-muted">(you)</span>}</p>
                <p className="text-xs text-text-muted">{u.email} · {activity}</p>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Pill tone={u.role === 'faculty' ? 'grey' : 'purple'}>{ROLE_LABELS[u.role]}</Pill>
                {u.active ? <Pill tone="green">Active</Pill> : <Pill tone="red">Deactivated</Pill>}
                <Button variant="ghost" onClick={() => startEdit(u)}>Edit</Button>
                {u.id !== session?.userId && (
                  <Button variant={u.active ? 'danger' : 'success'} onClick={() => setToggling(u)}>{u.active ? 'Deactivate' : 'Activate'}</Button>
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
