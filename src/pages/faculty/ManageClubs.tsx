// /faculty/clubs: every club, with View / Edit / Delete and Add club (C1, C3, C4)
import { useState } from 'react';
import { Link } from 'react-router';
import { useAppData } from '../../state/AppData';
import { memberCount } from '../../lib/memberships';
import { eventsToCancelOnDelete } from '../../lib/clubs';
import { getToday } from '../../lib/date';
import type { AppClub } from '../../data/types';
import { Button, ButtonLink, Card, ConfirmDialog, EmptyState, PageHeader, Pill, useToast } from '../../components/ui';

export function ManageClubs() {
  const { clubs, units, events, memberships, users, deleteClub } = useAppData();
  const toast = useToast();
  const [deleting, setDeleting] = useState<AppClub | null>(null);
  const toCancel = deleting ? eventsToCancelOnDelete(deleting.id, events, getToday()) : [];

  const confirmDelete = () => {
    if (!deleting) return;
    deleteClub(deleting.id);
    toast(`${deleting.name} deleted. ${toCancel.length} upcoming event(s) cancelled.`);
    setDeleting(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Admin dashboard</Link>
      <div className="mt-4">
        <PageHeader eyebrow="Faculty / Admin" title="Clubs" subtitle="Faculty/Admin can view and manage every club."
          actions={<ButtonLink to="/faculty/clubs/new">+ Add club</ButtonLink>} />
      </div>
      {clubs.length === 0 ? <EmptyState>No clubs.</EmptyState> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="clubs-admin-list">
          {clubs.map(c => {
            const manager = users.find(u => u.role === 'clubManager' && u.clubId === c.id && u.active);
            const upcoming = events.filter(e => e.hostType === 'club' && e.hostId === c.id && e.status === 'active' && e.date >= getToday()).length;
            return (
              <Card key={c.id} className="p-5 flex flex-col gap-3" data-club-row={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-text">{c.name}</p>
                    <p className="text-xs text-text-muted">{units.find(u => u.id === c.unitId)?.name} · {c.category}</p>
                  </div>
                  <Pill tone="purple">{memberCount(c, memberships)} members</Pill>
                </div>
                <p className="text-sm text-text-muted">{c.description}</p>
                <p className="text-xs text-text-muted">
                  Manager account: {manager ? <strong className="text-text">{manager.name}</strong> : <span className="text-[#991B1B] font-semibold">none assigned</span>}
                  {' · '}{upcoming} upcoming event(s)
                </p>
                <div className="flex gap-2 flex-wrap mt-auto">
                  <ButtonLink variant="ghost" to={`/faculty/clubs/${c.id}`}>View</ButtonLink>
                  <ButtonLink variant="secondary" to={`/faculty/clubs/${c.id}/edit`}>Edit</ButtonLink>
                  <Button variant="danger" onClick={() => setDeleting(c)}>Delete</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!deleting}
        title="Are you sure?"
        message={<>Delete <strong>{deleting?.name}</strong>? It disappears from the Clubs page and from students’ dashboards, its manager can no longer log in, and its <strong>{toCancel.length}</strong> upcoming event(s) will be cancelled.</>}
        confirmLabel="Delete club"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
