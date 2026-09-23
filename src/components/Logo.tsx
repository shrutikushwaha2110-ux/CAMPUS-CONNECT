import { Link } from 'react-router';
import logoImg from '../assets/logo2.png';

interface LogoProps {
  variant?: 'light' | 'dark';
}

export function Logo({ variant = 'light' }: LogoProps) {
  return (
    <Link to="/" className="flex items-center gap-2.5 no-underline">
      <img src={logoImg} alt="CampusConnect" className="w-9 h-9 rounded-lg flex-shrink-0" />
      <span
        className="font-bold text-lg leading-none tracking-tight"
        style={{ color: variant === 'dark' ? '#CBD5E1' : '#1C1750' }}
      >
        CampusConnect
      </span>
    </Link>
  );
}
