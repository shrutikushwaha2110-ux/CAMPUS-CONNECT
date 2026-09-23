// /faculty/clubs/new and /faculty/clubs/:id/edit (C1, C2, C3)
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAppData } from '../../state/AppData';
import type { AppClub } from '../../data/types';
import { CLUB_CATEGORIES, type ClubCategory } from '../../lib/constants';
import { validateClub, type Errors } from '../../lib/validation';
import { Button, Card, EmptyState, Field, PageHeader, SelectInput, TextArea, TextInput, useToast } from '../../components/ui';

export function ClubForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clubs, units, saveClub, newId } = useAppData();
  const existing = id ? clubs.find(c => c.id === id) : undefined;
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    category: existing?.category ?? '',
    unitId: existing?.unitId ?? units[0]?.id ?? '',
    description: existing?.description ?? '',
    managerName: existing?.managerName ?? '',
  });
  const [errors, setErrors] = useState<Errors>({});

  if (id && !existing) return <div className="max-w-[640px] mx-auto px-4 py-16"><EmptyState>Club not found.</EmptyState></div>;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateClub({ ...form, id: existing?.id }, clubs);
    if (!units.some(u => u.id === form.unitId)) errs.unitId = 'Pick a supervising unit';
    setErrors(errs);
    if (Object.keys(errs).length) return; // C2: nothing is saved when invalid
    const club: AppClub = {
      id: existing?.id ?? newId(form.name),
      name: form.name.trim(),
      category: form.category as ClubCategory,
      unitId: form.unitId,
      description: form.description.trim(),
      managerName: form.managerName.trim(),
      memberCount: existing?.memberCount ?? 0,
    };
    saveClub(club);
    toast(existing ? `Saved ${club.name}` : `${club.name} added. Assign a manager account in Users.`);
    navigate('/faculty/clubs');
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty/clubs" className="text-sm font-semibold text-primary">← Clubs</Link>
      <div className="mt-4"><PageHeader eyebrow={existing ? 'Edit club' : 'New club'} title={existing ? existing.name : 'Add a club'} /></div>
      <Card className="p-6">
        <form onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-testid="club-form">
          <div className="sm:col-span-2">
            <Field label="Club name" htmlFor="club-name" error={errors.name}><TextInput id="club-name" value={form.name} onChange={set('name')} invalid={!!errors.name} /></Field>
          </div>
          <Field label="Category" htmlFor="club-category" error={errors.category}>
            <SelectInput id="club-category" value={form.category} onChange={set('category')} invalid={!!errors.category}>
              <option value="">Select…</option>
              {CLUB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </SelectInput>
          </Field>
          <Field label="Supervising unit" htmlFor="club-unit" error={errors.unitId}>
            <SelectInput id="club-unit" value={form.unitId} onChange={set('unitId')}>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="club-description" error={errors.description}><TextArea id="club-description" value={form.description} onChange={set('description')} invalid={!!errors.description} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Student manager name" htmlFor="club-manager" error={errors.managerName} hint="The login account is assigned separately under Users.">
              <TextInput id="club-manager" value={form.managerName} onChange={set('managerName')} invalid={!!errors.managerName} />
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Link to="/faculty/clubs" className="inline-flex items-center rounded-xl font-semibold text-sm px-4 min-h-[40px] border border-border text-text-muted">Cancel</Link>
            <Button type="submit">{existing ? 'Save changes' : 'Add club'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
