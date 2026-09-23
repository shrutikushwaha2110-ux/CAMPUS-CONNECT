// /faculty/clubs/:id: Faculty/Admin sees the same management view a club's manager sees, for any club
import { Link, useParams } from 'react-router';
import { ClubAdminView } from '../manage/ClubAdminView';

export function FacultyClubDetail() {
  const { id = '' } = useParams();
  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-8 flex gap-4">
        <Link to="/faculty/clubs" className="text-sm font-semibold text-primary">← All clubs</Link>
        <Link to={`/faculty/clubs/${id}/edit`} className="text-sm font-semibold text-primary">Edit club info</Link>
      </div>
      <ClubAdminView clubId={id} eyebrow="Faculty / Admin · club view" />
    </>
  );
}
