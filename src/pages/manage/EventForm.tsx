// /manage/events/new and /manage/events/:id/edit (O1, O2, O3, O4, O5)
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAppData } from '../../state/AppData';
import type { AppEvent } from '../../data/types';
import { EVENT_CATEGORIES, type EventCategory } from '../../lib/constants';
import { allowedHosts, canManageEvent } from '../../lib/permissions';
import { validateEvent, type Errors } from '../../lib/validation';
import { seatsTakenNow } from '../../lib/seats';
import { NotAllowed } from '../../components/RequireRole';
import { Button, Card, EmptyState, Field, PageHeader, SelectInput, TextArea, TextInput, useToast } from '../../components/ui';

export function EventForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, events, clubs, units, saveEvent, localTaken, newId } = useAppData();
  const existing = id ? events.find(e => e.id === id) : undefined;
  const hosts = allowedHosts(session, clubs, units);

  const initialHost = existing ? `${existing.hostType}:${existing.hostId}` : (params.get('host') && hosts.some(h => `${h.type}:${h.id}` === params.get('host')) ? params.get('host')! : hosts[0] ? `${hosts[0].type}:${hosts[0].id}` : '');
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    category: existing?.category ?? '',
    date: existing?.date ?? '',
    time: existing?.time ?? '',
    venue: existing?.venue ?? '',
    description: existing?.description ?? '',
    seatsTotal: existing ? String(existing.seatsTotal) : '',
    host: initialHost,
    requiresApproval: existing?.requiresApproval ?? false,
  });
  const [errors, setErrors] = useState<Errors>({});

  if (id && !existing) return <div className="max-w-[640px] mx-auto px-4 py-16"><EmptyState>Event not found.</EmptyState></div>;
  // O4: the edit URL of an event outside this person's scope is blocked, even if typed directly
  if (existing && !canManageEvent(session, existing)) {
    return <NotAllowed message="This event belongs to another club. You can only edit your own club's events." />;
  }
  if (existing && existing.status === 'cancelled') {
    return <div className="max-w-[640px] mx-auto px-4 py-16"><EmptyState>This event was cancelled and can no longer be edited.</EmptyState></div>;
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));
  // Rule 15: seats can't drop below seats already taken (baseline + site registrations)
  const takenNow = existing ? seatsTakenNow(existing.seatsTaken, localTaken(existing.id)) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateEvent({ ...form, seatsTotal: Number(form.seatsTotal) }, takenNow);
    const [hostType, hostId] = form.host.split(':');
    if (!hosts.some(h => h.type === hostType && h.id === hostId)) errs.host = 'Pick a host you are allowed to use';
    setErrors(errs);
    if (Object.keys(errs).length) return; // O2: no event is created when the form is invalid

    const event: AppEvent = {
      ...(existing ?? { seatsTaken: 0, posterUrl: '', status: 'active' as const, registrations: [] }),
      id: existing?.id ?? newId(form.title),
      title: form.title.trim(),
      category: form.category as EventCategory,
      date: form.date,
      time: form.time,
      venue: form.venue.trim(),
      description: form.description.trim(),
      seatsTotal: Number(form.seatsTotal),
      hostType: hostType as AppEvent['hostType'],
      hostId,
      requiresApproval: form.requiresApproval,
    };
    saveEvent(event);
    toast(existing ? `Saved changes to ${event.title}` : `${event.title} created. It's now on the Events page.`);
    navigate('/events');
  };

  const back = '/events';

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12">
      <Link to={back} className="text-sm font-semibold text-primary">← Back</Link>
      <div className="mt-4"><PageHeader eyebrow={existing ? 'Edit event' : 'New event'} title={existing ? existing.title : 'Create an event'} /></div>
      <Card className="p-6">
        <form onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-testid="event-form">
          <div className="sm:col-span-2">
            <Field label="Title" htmlFor="title" error={errors.title}><TextInput id="title" value={form.title} onChange={set('title')} invalid={!!errors.title} /></Field>
          </div>
          <Field label="Category" htmlFor="category" error={errors.category}>
            <SelectInput id="category" value={form.category} onChange={set('category')} invalid={!!errors.category}>
              <option value="">Select…</option>
              {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </SelectInput>
          </Field>
          <Field label="Host" htmlFor="host" error={errors.host} hint={session?.role === 'clubManager' ? 'Club Managers post as their own club.' : undefined}>
            <SelectInput id="host" value={form.host} onChange={set('host')} disabled={hosts.length <= 1} invalid={!!errors.host}>
              {hosts.map(h => <option key={`${h.type}:${h.id}`} value={`${h.type}:${h.id}`}>{h.name}{h.type === 'unit' ? ' (unit)' : ''}</option>)}
            </SelectInput>
          </Field>
          <Field label="Date" htmlFor="date" error={errors.date}><TextInput id="date" type="date" value={form.date} onChange={set('date')} invalid={!!errors.date} /></Field>
          <Field label="Time" htmlFor="time" error={errors.time}><TextInput id="time" type="time" value={form.time} onChange={set('time')} invalid={!!errors.time} /></Field>
          <Field label="Venue" htmlFor="venue" error={errors.venue}><TextInput id="venue" value={form.venue} onChange={set('venue')} invalid={!!errors.venue} /></Field>
          <Field label="Total seats" htmlFor="seats" error={errors.seatsTotal} hint={existing ? `${takenNow} seats already taken` : undefined}>
            <TextInput id="seats" type="number" min={1} value={form.seatsTotal} onChange={set('seatsTotal')} invalid={!!errors.seatsTotal} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" error={errors.description}><TextArea id="description" value={form.description} onChange={set('description')} invalid={!!errors.description} /></Field>
          </div>
          <label className="sm:col-span-2 flex items-center gap-3 text-sm text-text cursor-pointer">
            <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} className="w-4 h-4 accent-[#4637D2]" />
            Registrations need my approval (students start as “Pending”)
          </label>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <Link to={back} className="inline-flex items-center rounded-xl font-semibold text-sm px-4 min-h-[40px] border border-border text-text-muted">Cancel</Link>
            <Button type="submit">{existing ? 'Save changes' : 'Create event'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
