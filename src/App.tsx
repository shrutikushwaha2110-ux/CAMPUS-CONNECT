import { RouterProvider } from 'react-router';
import { router } from './app/routes';
import { AppDataProvider } from './state/AppData';
import { ToastProvider } from './components/ui';

export default function App() {
  return (
    <AppDataProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AppDataProvider>
  );
}
