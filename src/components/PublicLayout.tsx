import { Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Guarda Mirim de Mauá</h1>
            <p className="text-sm text-blue-200">Agendamento de Matrícula</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-primary-dark text-blue-200 text-center text-sm py-4">
        <p>Guarda Mirim de Mauá &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
