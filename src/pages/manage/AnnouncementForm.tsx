// /manage/announcements/new and /manage/announcements/:id/edit (M5, F-A1)
// Club Managers post to their own club; Faculty post university-wide or to the club they head.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAppData } from '../../state/AppData';
import { canManageAnnouncement } from '../../lib/permissions';
import { validateAnnouncement, type Errors } from '../../lib/validation';
import { NotAllowed } from '../../components/RequireRole';
import { Button, Card, EmptyState, Field, PageHeader, SelectInput, TextArea, TextInput, useToast } from '../../components/ui';

export function AnnouncementForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, announcements, clubs, saveAnnouncement } = useAppData();
  const existing = id ? announcements.find(a => a.id === id) : undefined;
  const isFaculty = session?.role === 'faculty';

  const defaultScope = existing
    ? existing.clubId ?? ''
    : isFaculty ? (params.get('club') === session?.clubId ? params.get('club')! : '') : session?.clubId ?? '';
  const [form, setForm] = useState({ title: existing?.title ?? '', body: existing?.body ?? '', scope: defaultScope });
  const [errors, setErrors] = useState<Errors>({});

  if (id && !existing) return <div className="max-w-[640px] mx-auto px-4 py-16"><EmptyState>Announcement not found.</EmptyState></div>;
  if (existing && !canManageAnnouncement(session, existing)) return <NotAllowed message="This announcement belongs to another club." />;

  const back = '/events';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAnnouncement(form);
    const clubId = isFaculty ? (form.scope || null) : session?.clubId ?? null;
    if (!canManageAnnouncement(session, { clubId })) errs.scope = 'You can only post to your own club';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const r = await saveAnnouncement({ id: existing?.id, title: form.title.trim(), body: form.body.trim(), clubId });
    if (!r.ok) { setErrors(r.errors ?? {}); toast(r.error); return; }
    toast(existing ? 'Announcement updated' : 'Announcement posted');
    navigate(back);
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 py-12">
      <Link to={back} className="text-sm font-semibold text-primary">← Back</Link>
      <div className="mt-4"><PageHeader eyebrow={existing ? 'Edit announcement' : 'New announcement'} title={existing ? existing.title : 'Post an announcement'} /></div>
      <Card className="p-6">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5" data-testid="announcement-form">
          <Field label="Audience" htmlFor="scope" error={errors.scope}>
            <SelectInput id="scope" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} disabled={!isFaculty}>
              {isFaculty && <option value="">Everyone (university-wide)</option>}
              {clubs.filter(c => c.id === session?.clubId).map(c => <option key={c.id} value={c.id}>{c.name} members</option>)}
            </SelectInput>
          </Field>
          <Field label="Title" htmlFor="ann-title" error={errors.title}>
            <TextInput id="ann-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} invalid={!!errors.title} />
          </Field>
          <Field label="Message" htmlFor="ann-body" error={errors.body}>
            <TextArea id="ann-body" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} invalid={!!errors.body} />
          </Field>
          <div className="flex gap-2 justify-end">
            <Link to={back} className="inline-flex items-center rounded-xl font-semibold text-sm px-4 min-h-[40px] border border-border text-text-muted">Cancel</Link>
            <Button type="submit">{existing ? 'Save changes' : 'Post announcement'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
