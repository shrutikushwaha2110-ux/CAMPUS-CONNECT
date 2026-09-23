import { MAX_CLUBS_PER_STUDENT } from '../lib/constants';

// The two student rules, shown on the Clubs page and the student dashboard (F9a, F5a)
export function StudentRules({ joined }: { joined?: number }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col sm:flex-row gap-4 border" data-testid="student-rules"
      style={{ backgroundColor: '#EEECFB', borderColor: '#D9D4F7' }}>
      <div className="flex-1 flex gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ backgroundColor: '#4637D2' }} aria-hidden="true">2</span>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#1F1D2B' }}>You can join a maximum of {MAX_CLUBS_PER_STUDENT} clubs.</p>
          <p className="text-xs mt-0.5" style={{ color: '#2B2093' }}>
            {joined === undefined
              ? 'Log in as a student to join clubs.'
              : `You've joined ${joined} of ${MAX_CLUBS_PER_STUDENT}.${joined >= MAX_CLUBS_PER_STUDENT ? ' Leave a club to join a different one.' : ''}`}
          </p>
        </div>
      </div>
      <div className="flex-1 flex gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: '#1C1750' }} aria-hidden="true">✓</span>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#1F1D2B' }}>You can attend/register for events from any club.</p>
          <p className="text-xs mt-0.5" style={{ color: '#2B2093' }}>Club membership is not needed to register for an event.</p>
        </div>
      </div>
    </div>
  );
}
