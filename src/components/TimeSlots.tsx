/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Loader2 } from 'lucide-react';
import { getAvailableSlots } from '../lib/availability';

interface TimeSlotsProps {
  date: Date;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export default function TimeSlots({ date, selectedTime, onSelectTime }: TimeSlotsProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSlots() {
    setLoading(true);
    try {
      const available = await getAvailableSlots(date);
      setSlots(available);
    } catch (err) {
      console.error('Error loading slots:', err);
      setSlots([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSlots();
  }, [date]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Carregando horários...</span>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>Nenhum horário disponível para este dia.</p>
      </div>
    );
  }

  // Group slots by period (morning / afternoon)
  const morning = slots.filter((s) => s < '12:00');
  const afternoon = slots.filter((s) => s >= '12:00');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Horários disponíveis
      </h3>
      <p className="text-sm text-gray-500 mb-4 capitalize">
        {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>

      {morning.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
            Manhã
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {morning.map((slot) => (
              <button
                key={slot}
                onClick={() => onSelectTime(slot)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  selectedTime === slot
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-primary border border-gray-200'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
            Tarde
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {afternoon.map((slot) => (
              <button
                key={slot}
                onClick={() => onSelectTime(slot)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  selectedTime === slot
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-primary border border-gray-200'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
