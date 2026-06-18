import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { generateReminderLink } from '../../lib/whatsapp';
import type { Appointment } from '../../lib/availability';
import {
  Search,
  MessageCircle,
  XCircle,
  CheckCircle,
  Loader2,
  Filter,
  RefreshCw,
} from 'lucide-react';

type StatusFilter = 'all' | 'confirmed' | 'cancelled';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    setLoading(true);
    try {
      const q = query(collection(db, 'appointments'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Appointment)
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      setAppointments(data);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
    setLoading(false);
  }

  async function handleCancel(apt: Appointment) {
    if (!apt.id || !confirm(`Cancelar agendamento de ${apt.parentName}?`)) return;
    setActionLoading(apt.id);
    try {
      await updateDoc(doc(db, 'appointments', apt.id), { status: 'cancelled' });
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, status: 'cancelled' } : a))
      );
    } catch (err) {
      console.error('Error cancelling:', err);
      alert('Erro ao cancelar agendamento.');
    }
    setActionLoading(null);
  }

  async function handleRestore(apt: Appointment) {
    if (!apt.id) return;
    setActionLoading(apt.id);
    try {
      await updateDoc(doc(db, 'appointments', apt.id), { status: 'confirmed' });
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, status: 'confirmed' } : a))
      );
    } catch (err) {
      console.error('Error restoring:', err);
    }
    setActionLoading(null);
  }

  const filtered = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (dateFilter && apt.date !== dateFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        apt.parentName.toLowerCase().includes(term) ||
        apt.childName.toLowerCase().includes(term) ||
        apt.phone.includes(term)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Agendamentos</h1>
        <button
          onClick={loadAppointments}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          >
            <option value="all">Todos</option>
            <option value="confirmed">Confirmados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <Filter className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Horário</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Responsável</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Criança</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((apt) => {
                  const dateObj = new Date(apt.date + 'T12:00:00');
                  return (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 capitalize">
                        {format(dateObj, "dd/MM/yyyy (EEE)", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{apt.time}</td>
                      <td className="px-4 py-3">{apt.parentName}</td>
                      <td className="px-4 py-3">{apt.childName}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {apt.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                      </td>
                      <td className="px-4 py-3">
                        {apt.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Confirmado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Cancelado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {apt.status === 'confirmed' && (
                            <>
                              <a
                                href={generateReminderLink(apt.phone, apt.parentName, apt.childName, apt.date, apt.time)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Enviar lembrete WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleCancel(apt)}
                                disabled={actionLoading === apt.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Cancelar agendamento"
                              >
                                {actionLoading === apt.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                          {apt.status === 'cancelled' && (
                            <button
                              onClick={() => handleRestore(apt)}
                              disabled={actionLoading === apt.id}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Restaurar agendamento"
                            >
                              {actionLoading === apt.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
            {filtered.length} agendamento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
