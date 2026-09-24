// /faculty/clubs/:id: the faculty head sees the same management view the club's manager sees (own club only)
import { Link, useParams } from 'react-router';
import { ClubAdminView } from '../manage/ClubAdminView';

export function FacultyClubDetail() {
  const { id = '' } = useParams();
  return (
    <>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-8 flex gap-4">
        <Link to="/faculty/clubs" className="text-sm font-semibold text-primary">← My club</Link>
      </div>
      <ClubAdminView clubId={id} eyebrow="Faculty head · club view" />
    </>
  );
}
