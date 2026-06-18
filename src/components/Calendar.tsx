/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getScheduleConfig,
  getOverridesForMonth,
  type ScheduleConfig,
  type DayOverride,
} from '../lib/availability';

interface CalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed',
  4: 'thu', 5: 'fri', 6: 'sat',
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [overrides, setOverrides] = useState<Map<string, DayOverride>>(new Map());
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [cfg, ovr] = await Promise.all([
        getScheduleConfig(),
        getOverridesForMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
      ]);
      setConfig(cfg);
      setOverrides(ovr);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  function isDayAvailable(date: Date): boolean {
    if (!config) return false;
    if (isBefore(date, startOfDay(new Date()))) return false;

    const dateStr = format(date, 'yyyy-MM-dd');
    if (config.startDate && dateStr < config.startDate) return false;
    if (config.endDate && dateStr > config.endDate) return false;

    const override = overrides.get(dateStr);

    if (override?.type === 'blocked') {
      if (override.slots && override.slots.length > 0) return true;
      return false;
    }
    if (override?.type === 'extra') return true;

    const dayKey = DAY_MAP[date.getDay()];
    return !!config.defaultSchedule[dayKey];
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (isBefore(day, addDays(calEnd, 1))) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="font-semibold text-gray-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEK_DAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, currentMonth);
            const available = inMonth && isDayAvailable(d);
            const selected = selectedDate && isSameDay(d, selectedDate);
            const isToday = isSameDay(d, new Date());

            return (
              <button
                key={i}
                onClick={() => available && onSelectDate(d)}
                disabled={!available}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg
                  transition-all cursor-pointer
                  ${!inMonth ? 'text-gray-300' : ''}
                  ${inMonth && !available ? 'text-gray-400 cursor-not-allowed' : ''}
                  ${available && !selected ? 'text-primary font-medium bg-blue-50 hover:bg-blue-100 border border-blue-200' : ''}
                  ${selected ? 'bg-primary text-white font-bold shadow-md' : ''}
                  ${isToday && !selected ? 'ring-2 ring-accent ring-offset-1' : ''}
                `}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded ring-2 ring-accent" />
          <span>Hoje</span>
        </div>
      </div>
    </div>
  );
}
