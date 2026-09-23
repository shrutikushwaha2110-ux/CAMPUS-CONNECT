// /faculty/announcements: all announcements, university-wide and per club
import { Link } from 'react-router';
import { useAppData } from '../../state/AppData';
import { AnnouncementsList } from '../../components/staff';
import { ButtonLink, PageHeader } from '../../components/ui';

export function FacultyAnnouncements() {
  const { announcements } = useAppData();
  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Admin dashboard</Link>
      <div className="mt-4">
        <PageHeader eyebrow="Faculty / Admin" title="Announcements" subtitle="University-wide news goes to every student; club news goes to that club's members."
          actions={<ButtonLink to="/manage/announcements/new">+ New announcement</ButtonLink>} />
      </div>
      <AnnouncementsList items={announcements} showScope />
    </div>
  );
}
