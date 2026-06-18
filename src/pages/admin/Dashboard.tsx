/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import { generateReminderLink } from '../../lib/whatsapp';
import { seedDefaultConfig } from '../../lib/seed';
import type { Appointment } from '../../lib/availability';
import {
  CalendarCheck,
  Clock,
  Users,
  MessageCircle,
  AlertTriangle,
  Database,
  Loader2,
} from 'lucide-react';

export default function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  async function loadAppointments() {
    setLoading(true);
    try {
      const startStr = format(weekStart, 'yyyy-MM-dd');
      const endStr = format(weekEnd, 'yyyy-MM-dd');

      const q = query(collection(db, 'appointments'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Appointment)
        .filter(
          (a) =>
            a.status === 'confirmed' &&
            a.date >= startStr &&
            a.date <= endStr
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
      setAppointments(data);
    } catch (err) {
      console.error('Error loading appointments:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDefaultConfig();
      alert('Configuração padrão criada com sucesso!');
    } catch (err) {
      console.error('Error seeding:', err);
      alert('Erro ao criar configuração.');
    }
    setSeeding(false);
  }

  // Group by date
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = [];
    acc[apt.date].push(apt);
    return acc;
  }, {});

  const todayStr = format(today, 'yyyy-MM-dd');
  const todayCount = appointments.filter((a) => a.date === todayStr).length;
  const weekCount = appointments.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Semana de {format(weekStart, "dd/MM", { locale: ptBR })} a{' '}
            {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors cursor-pointer disabled:opacity-50"
          title="Criar configuração padrão de horários no Firestore"
        >
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Inicializar Config
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{todayCount}</p>
              <p className="text-xs text-gray-500">Hoje</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{weekCount}</p>
              <p className="text-xs text-gray-500">Esta semana</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">30min</p>
              <p className="text-xs text-gray-500">Duração</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week appointments */}
      <h2 className="font-semibold text-gray-800 mb-4">Agendamentos da semana</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nenhum agendamento nesta semana.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateStr, apts]) => {
              const dateObj = new Date(dateStr + 'T12:00:00');
              return (
                <div key={dateStr} className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                    <h3 className="font-medium text-gray-700 capitalize text-sm">
                      {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      <span className="ml-2 text-gray-400">({apts.length} agendamento{apts.length > 1 ? 's' : ''})</span>
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {apts.map((apt) => (
                      <div key={apt.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded">
                            {apt.time}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{apt.parentName}</p>
                            <p className="text-xs text-gray-500">Criança: {apt.childName}</p>
                          </div>
                        </div>
                        <a
                          href={generateReminderLink(apt.phone, apt.parentName, apt.childName, apt.date, apt.time)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          title="Enviar lembrete via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
