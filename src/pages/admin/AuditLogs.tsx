/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ScrollText,
  Search,
  MessageCircle,
  XCircle,
  CheckCircle,
  UserPlus,
  RefreshCw,
  Loader2,
  CalendarDays,
  Settings,
} from 'lucide-react';
import type { AuditLog } from '../../lib/audit';

type LogTypeFilter = 'all' | 'whatsapp_reminder' | 'cancel_appointment' | 'restore_appointment' | 'save_override' | 'delete_override' | 'update_config' | 'create_collaborator';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<LogTypeFilter>('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Load recent 150 logs
      const logsRef = collection(db, 'audit_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(150));
      const snapsDoc = await getDocs(q);
      const data = snapsDoc.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }) as AuditLog);
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'whatsapp_reminder':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 border border-green-200/50 rounded-full text-xs font-semibold">
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </span>
        );
      case 'cancel_appointment':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 border border-red-200/50 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            Cancelamento
          </span>
        );
      case 'restore_appointment':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200/50 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Restauração
          </span>
        );
      case 'save_override':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full text-xs font-semibold">
            <CalendarDays className="w-3.5 h-3.5" />
            Alt. Grade
          </span>
        );
      case 'delete_override':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200/50 rounded-full text-xs font-semibold">
            <XCircle className="w-3.5 h-3.5 text-orange-500" />
            Rem. Alt. Grade
          </span>
        );
      case 'update_config':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200/50 rounded-full text-xs font-semibold">
            <Settings className="w-3.5 h-3.5" />
            Config Grade
          </span>
        );
      case 'create_collaborator':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200/50 rounded-full text-xs font-semibold">
            <UserPlus className="w-3.5 h-3.5" />
            Novo Registro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-xs font-semibold">
            Ação Geral
          </span>
        );
    }
  };

  // Local filtering
  const filteredLogs = logs.filter((log) => {
    const matchesType = typeFilter === 'all' || log.action === typeFilter;
    if (!matchesType) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = log.userName?.toLowerCase().includes(term);
      const matchEmail = log.userEmail?.toLowerCase().includes(term);
      const matchDetails = log.details?.toLowerCase().includes(term);
      return matchName || matchEmail || matchDetails;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-primary" />
            Histórico e Logs de Auditoria
          </h1>
          <p className="text-gray-500 text-sm">
            Rastreie todas as ações feitas pelos colaboradores, como o envio de mensagens e alterações de horários.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 shadow-sm cursor-pointer self-start sm:self-auto"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Atualizar Histórico
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador (ex: Yasmin) ou detalhes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </div>
          <div className="w-full sm:w-60">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LogTypeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white font-medium text-gray-700"
            >
              <option value="all">Filtro: Todos os Eventos</option>
              <option value="whatsapp_reminder">Apenas Mensagem WhatsApp</option>
              <option value="cancel_appointment">Apenas Cancelamentos</option>
              <option value="restore_appointment">Apenas Restaurações</option>
              <option value="save_override">Apenas Alterações de Grade</option>
              <option value="delete_override">Apenas Remoções de Grade</option>
              <option value="update_config">Apenas Configurações Gerais</option>
              <option value="create_collaborator">Apenas Novos Colaboradores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table view for Desktop, List cards for Mobile */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm mt-2">Carregando logs do sistema...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center text-gray-400">
          <p className="text-sm font-medium">Nenhum evento correspondente encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 text-left">
                  <th className="px-6 py-3.5">Data/Horário</th>
                  <th className="px-6 py-3.5">Colaborador</th>
                  <th className="px-6 py-3.5">Ação</th>
                  <th className="px-6 py-3.5">Detalhes do Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const dateValue = log.timestamp ? log.timestamp.toDate?.() || new Date(log.timestamp) : new Date();
                  const formattedTimeStr = format(dateValue, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 text-xs font-mono text-gray-505 shrink-0">
                        {formattedTimeStr}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-800 block text-sm">
                          {log.userName || 'Administrador'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          {log.userEmail}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden divide-y divide-gray-100">
            {filteredLogs.map((log) => {
              const dateValue = log.timestamp ? log.timestamp.toDate?.() || new Date(log.timestamp) : new Date();
              const formattedTimeStr = format(dateValue, "dd/MM 'às' HH:mm", { locale: ptBR });

              return (
                <div key={log.id} className="p-4 space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      {formattedTimeStr}
                    </span>
                    {getActionBadge(log.action)}
                  </div>

                  <div>
                    <span className="text-xs font-extrabold text-gray-800">
                      {log.userName || 'Administrador'}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {log.userEmail}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                    {log.details}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
            <span>Visualizando últimos {filteredLogs.length} logs</span>
          </div>
        </div>
      )}
    </div>
  );
}
