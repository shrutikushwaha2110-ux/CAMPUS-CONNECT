// /faculty/clubs: "My club". A faculty member heads ONE club: view / edit / delete it.
// Any faculty member may still register a NEW club (its head and manager are then assigned in Users).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppData } from '../../state/AppData';
import { eventsToCancelOnDelete } from '../../lib/clubs';
import { canAddClub, canDeleteClub, canEditClub } from '../../lib/permissions';
import { getToday } from '../../lib/date';
import { Button, ButtonLink, Card, ConfirmDialog, EmptyState, PageHeader, Pill, useToast } from '../../components/ui';

export function ManageClubs() {
  const { session, clubs, units, events, clubMemberCount, users, deleteClub, logout } = useAppData();
  const toast = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const club = clubs.find(c => c.id === session?.clubId);
  const toCancel = club ? eventsToCancelOnDelete(club.id, events, getToday()) : [];

  const confirmDelete = async () => {
    if (!club || !canDeleteClub(session, club.id)) return;
    const r = await deleteClub(club.id);
    setDeleting(false);
    if (!r.ok) { toast(r.error); return; }
    toast(`${club.name} deleted. ${toCancel.length} upcoming event(s) cancelled.`);
    // Rule 20: the club's staff (including you, its head) lose access with it
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Admin dashboard</Link>
      <div className="mt-4">
        <PageHeader eyebrow="Faculty head" title="My club"
          subtitle="As a faculty member you head one club and manage only that club. You can also register a new club; its faculty head and manager are then assigned under Users."
          actions={canAddClub(session) && <ButtonLink to="/faculty/clubs/new">+ Add club</ButtonLink>} />
      </div>

      {!club ? <EmptyState>You are not assigned to a club.</EmptyState> : (() => {
        const manager = users.find(u => u.role === 'clubManager' && u.clubId === club.id && u.active);
        const upcoming = events.filter(e => e.hostType === 'club' && e.hostId === club.id && e.status === 'active' && e.date >= getToday()).length;
        return (
          <Card className="p-6 flex flex-col gap-3" data-club-row={club.id}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-lg text-text">{club.name}</p>
                <p className="text-xs text-text-muted">{units.find(u => u.id === club.unitId)?.name} · {club.category}</p>
              </div>
              <Pill tone="purple">{clubMemberCount(club)} members</Pill>
            </div>
            <p className="text-sm text-text-muted">{club.description}</p>
            <p className="text-xs text-text-muted">
              Club manager: {manager ? <strong className="text-text">{manager.name}</strong> : <span className="text-[#991B1B] font-semibold">none assigned</span>}
              {' · '}{upcoming} upcoming event(s)
            </p>
            <div className="flex gap-2 flex-wrap mt-2">
              <ButtonLink variant="ghost" to={`/faculty/clubs/${club.id}`}>View members & events</ButtonLink>
              {canEditClub(session, club.id) && <ButtonLink variant="secondary" to={`/faculty/clubs/${club.id}/edit`}>Edit</ButtonLink>}
              {canDeleteClub(session, club.id) && <Button variant="danger" onClick={() => setDeleting(true)}>Delete</Button>}
            </div>
          </Card>
        );
      })()}

      <p className="text-xs text-text-muted mt-6">
        Other clubs ({Math.max(0, clubs.length - 1)}) are managed by their own faculty heads. You can see their public pages under <Link to="/clubs" className="font-semibold text-primary">Clubs</Link>.
      </p>

      <ConfirmDialog
        open={deleting}
        title="Are you sure?"
        message={<>Delete <strong>{club?.name}</strong>? It disappears from the Clubs page and students’ dashboards, its <strong>{toCancel.length}</strong> upcoming event(s) are cancelled, and its manager <strong>and you</strong> lose access to it. You will be logged out.</>}
        confirmLabel="Delete club"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
