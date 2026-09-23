import { Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export function Root() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F7FC' }}>
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
