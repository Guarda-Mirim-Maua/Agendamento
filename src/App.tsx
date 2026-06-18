import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import PublicLayout from './components/PublicLayout';

// Pages
import Booking from './pages/Booking';
import Confirmation from './pages/Confirmation';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Appointments from './pages/admin/Appointments';
import Schedule from './pages/admin/Schedule';
import Collaborators from './pages/admin/Collaborators';
import AuditLogs from './pages/admin/AuditLogs';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Booking Pages */}
          <Route element={<PublicLayout />}>
            <Route path="/agendar" element={<Booking />} />
            <Route path="/confirmacao" element={<Confirmation />} />
          </Route>

          {/* Root redirect to agendar */}
          <Route path="/" element={<Navigate to="/agendar" replace />} />

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />

          {/* Protected Administrative Area */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="agendamentos" element={<Appointments />} />
            <Route path="horarios" element={<Schedule />} />
            <Route path="colaboradores" element={<Collaborators />} />
            <Route path="logs" element={<AuditLogs />} />
          </Route>

          {/* Fallback Catch-all redirection */}
          <Route path="*" element={<Navigate to="/agendar" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
