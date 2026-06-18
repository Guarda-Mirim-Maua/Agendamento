/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getScheduleConfig, getOverridesForMonth, type ScheduleConfig, type DayOverride, type TimeRange, type Appointment } from '../../lib/availability';
import { ChevronLeft, ChevronRight, Ban, Plus, Save, Trash2, Loader2, Clock, CalendarOff, CalendarPlus, Settings } from 'lucide-react';

const DAY_MAP: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
const DAY_LABELS: Record<string, string> = { sun: 'Domingo', mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado' };

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [overrides, setOverrides] = useState<Map<string, DayOverride>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);

  // Override form state
  const [overrideType, setOverrideType] = useState<'blocked' | 'extra'>('blocked');
  const [extraSlots, setExtraSlots] = useState<TimeRange[]>([{ start: '08:00', end: '11:00' }]);
  const [blockedSlots, setBlockedSlots] = useState<TimeRange[]>([{ start: '08:00', end: '11:00' }]);
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');

  // Config editor state
  const [editConfig, setEditConfig] = useState<ScheduleConfig | null>(null);

  // Appointments for selected date
  const [dateAppointments, setDateAppointments] = useState<Appointment[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [cfg, ovr] = await Promise.all([
        getScheduleConfig(),
        getOverridesForMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
      ]);
      setConfig(cfg);
      setEditConfig(JSON.parse(JSON.stringify(cfg)));
      setOverrides(ovr);
    } catch (err) {
      console.error('Error loading schedule data:', err);
    }
    setLoading(false);
  }

  async function loadDateAppointments() {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      const q = query(
        collection(db, 'appointments'),
        where('date', '==', dateStr),
        where('status', '==', 'confirmed'),
        orderBy('time')
      );
      const snapshot = await getDocs(q);
      setDateAppointments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Appointment[]);
    } catch {
      setDateAppointments([]);
    }
  }

  useEffect(() => { loadData(); }, [currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      loadDateAppointments();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const override = overrides.get(dateStr);
      if (override) {
        setOverrideType(override.type);
        setOverrideReason(override.reason || '');
        if (override.type === 'extra') {
          setExtraSlots(override.slots || [{ start: '08:00', end: '11:00' }]);
          setBlockedSlots([{ start: '08:00', end: '11:00' }]);
          setBlockAllDay(true);
        } else if (override.type === 'blocked') {
          if (override.slots && override.slots.length > 0) {
            setBlockedSlots(override.slots);
            setBlockAllDay(false);
          } else {
            setBlockedSlots([{ start: '08:00', end: '11:00' }]);
            setBlockAllDay(true);
          }
          setExtraSlots([{ start: '08:00', end: '11:00' }]);
        }
      } else {
        setOverrideType('blocked');
        setOverrideReason('');
        setExtraSlots([{ start: '08:00', end: '11:00' }]);
        setBlockedSlots([{ start: '08:00', end: '11:00' }]);
        setBlockAllDay(true);
      }
    }
  }, [selectedDate]);

  function getDayInfo(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const override = overrides.get(dateStr);
    const dayKey = DAY_MAP[date.getDay()];
    const hasDefault = config?.defaultSchedule[dayKey];
    return { override, hasDefault: !!hasDefault, dateStr, dayKey };
  }

  async function handleSaveOverride() {
    if (!selectedDate) return;
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      const data: DayOverride = {
        date: dateStr,
        type: overrideType,
        ...(overrideType === 'extra' ? { slots: extraSlots } : {}),
        ...(overrideType === 'blocked' && !blockAllDay ? { slots: blockedSlots } : {}),
        ...(overrideReason ? { reason: overrideReason } : {}),
      };
      await setDoc(doc(db, 'overrides', dateStr), data);
      overrides.set(dateStr, data);
      setOverrides(new Map(overrides));
    } catch (err) {
      console.error('Error saving override:', err);
      alert('Erro ao salvar.');
    }
    setSaving(false);
  }

  async function handleDeleteOverride() {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    if (!confirm('Remover esta alteração de horário?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'overrides', dateStr));
      overrides.delete(dateStr);
      setOverrides(new Map(overrides));
    } catch (err) {
      console.error('Error deleting override:', err);
    }
    setSaving(false);
  }

  async function handleSaveConfig() {
    if (!editConfig) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'schedule'), editConfig);
      setConfig(editConfig);
      setShowConfigEditor(false);
      alert('Configuração salva com sucesso!');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Erro ao salvar configuração.');
    }
    setSaving(false);
  }

  function toggleDay(dayKey: string) {
    if (!editConfig) return;
    const updated = { ...editConfig };
    if (updated.defaultSchedule[dayKey]) {
      delete updated.defaultSchedule[dayKey];
    } else {
      updated.defaultSchedule[dayKey] = [
        { start: '08:00', end: '11:00' },
        { start: '14:30', end: '18:00' },
      ];
    }
    setEditConfig({ ...updated });
  }

  function updateRange(dayKey: string, index: number, field: 'start' | 'end', value: string) {
    if (!editConfig) return;
    const updated = { ...editConfig };
    updated.defaultSchedule[dayKey][index][field] = value;
    setEditConfig({ ...updated });
  }

  function addRange(dayKey: string) {
    if (!editConfig) return;
    const updated = { ...editConfig };
    updated.defaultSchedule[dayKey].push({ start: '08:00', end: '12:00' });
    setEditConfig({ ...updated });
  }

  function removeRange(dayKey: string, index: number) {
    if (!editConfig) return;
    const updated = { ...editConfig };
    updated.defaultSchedule[dayKey].splice(index, 1);
    if (updated.defaultSchedule[dayKey].length === 0) {
      delete updated.defaultSchedule[dayKey];
    }
    setEditConfig({ ...updated });
  }

  // Calendar render
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Horários</h1>
        <button
          onClick={() => setShowConfigEditor(!showConfigEditor)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-light transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          {showConfigEditor ? 'Fechar Configuração' : 'Editar Grade Padrão'}
        </button>
      </div>

      {/* Config Editor */}
      {showConfigEditor && editConfig && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Grade Padrão de Horários
          </h2>
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700">Duração do atendimento (min)</label>
            <input
              type="number"
              value={editConfig.slotDuration}
              onChange={(e) => setEditConfig({ ...editConfig, slotDuration: Number(e.target.value) })}
              className="ml-3 w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <div className="space-y-3">
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((dayKey) => {
              const ranges = editConfig.defaultSchedule[dayKey];
              const active = !!ranges;
              return (
                <div key={dayKey} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <label className="flex items-center gap-2 w-28 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleDay(dayKey)}
                      className="rounded"
                    />
                    <span className={`text-sm font-medium ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                      {DAY_LABELS[dayKey]}
                    </span>
                  </label>
                  {active && (
                    <div className="flex-1 space-y-2">
                      {ranges.map((range, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={range.start}
                            onChange={(e) => updateRange(dayKey, i, 'start', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-gray-400">até</span>
                          <input
                            type="time"
                            value={range.end}
                            onChange={(e) => updateRange(dayKey, i, 'end', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={() => removeRange(dayKey, i)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addRange(dayKey)}
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        + Adicionar período
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-light transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Configuração
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="font-semibold text-gray-800 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const inMonth = isSameMonth(d, currentMonth);
                  const info = getDayInfo(d);
                  const selected = selectedDate && isSameDay(d, selectedDate);
                  const isBlocked = info.override?.type === 'blocked';
                  const isBlockedAllDay = isBlocked && (!info.override?.slots || info.override.slots.length === 0);
                  const isBlockedPartial = isBlocked && (info.override?.slots && info.override.slots.length > 0);
                  const isExtra = info.override?.type === 'extra';
                  const hasDefault = info.hasDefault;
                  const isPast = isBefore(d, startOfDay(new Date()));

                  return (
                    <button
                      key={i}
                      onClick={() => inMonth && setSelectedDate(d)}
                      className={`aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-all cursor-pointer relative
                        ${!inMonth ? 'text-gray-300' : ''}
                        ${inMonth && isPast ? 'text-gray-400' : ''}
                        ${selected ? 'bg-primary text-white font-bold ring-2 ring-primary ring-offset-2' : ''}
                        ${!selected && isBlockedAllDay ? 'bg-red-50 text-red-400 line-through' : ''}
                        ${!selected && isBlockedPartial ? 'bg-orange-50 text-orange-600 border border-orange-200' : ''}
                        ${!selected && isExtra ? 'bg-green-50 text-green-700 font-medium border border-green-200' : ''}
                        ${!selected && !isBlocked && !isExtra && hasDefault && inMonth && !isPast ? 'bg-blue-50 text-primary font-medium' : ''}
                        ${!selected && inMonth ? 'hover:ring-2 hover:ring-gray-300' : ''}
                      `}
                    >
                      {format(d, 'd')}
                      {isBlockedAllDay && !selected && <Ban className="w-2.5 h-2.5 absolute bottom-0.5" />}
                      {isBlockedPartial && !selected && <Ban className="w-2.5 h-2.5 absolute bottom-0.5 text-orange-400" />}
                      {isExtra && !selected && <Plus className="w-2.5 h-2.5 absolute bottom-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /><span>Padrão</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-50 border border-red-200" /><span>Bloqueado (Dia)</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-50 border border-orange-200" /><span>Bloqueado (Parcial)</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-50 border border-green-200" /><span>Extra</span></div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div>
          {selectedDate ? (
            <div className="space-y-4">
              {/* Date info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-1 capitalize">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h3>
                {(() => {
                  const info = getDayInfo(selectedDate);
                  if (info.override?.type === 'blocked') {
                    const isAllDay = !info.override.slots || info.override.slots.length === 0;
                    return (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg mt-2">
                        <CalendarOff className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>
                          {isAllDay ? 'Dia bloqueado' : `Bloqueado parcial: ${info.override.slots?.map(s => `${s.start}-${s.end}`).join(', ')}`}
                          {info.override.reason ? ` (${info.override.reason})` : ''}
                        </span>
                      </div>
                    );
                  }
                  if (info.override?.type === 'extra') {
                    return (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg mt-2">
                        <CalendarPlus className="w-4 h-4" />
                        <span>Horário extra: {info.override.slots?.map(s => `${s.start}-${s.end}`).join(', ')}</span>
                      </div>
                    );
                  }
                  if (info.hasDefault) {
                    return (
                      <div className="flex items-center gap-2 text-sm text-primary bg-blue-50 p-2 rounded-lg mt-2">
                        <Clock className="w-4 h-4" />
                        <span>Horário padrão ({DAY_LABELS[info.dayKey]})</span>
                      </div>
                    );
                  }
                  return (
                    <p className="text-sm text-gray-500 mt-2">Sem horários configurados.</p>
                  );
                })()}

                {/* Appointments for this date */}
                {dateAppointments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      {dateAppointments.length} agendamento{dateAppointments.length > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {dateAppointments.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-primary">{a.time}</span>
                          <span className="text-gray-600">{a.childName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Override form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Alterar este dia</h3>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setOverrideType('blocked')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      overrideType === 'blocked' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    <Ban className="w-4 h-4 inline mr-1" />
                    Bloquear
                  </button>
                  <button
                    onClick={() => setOverrideType('extra')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      overrideType === 'extra' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Horário Extra
                  </button>
                </div>

                {overrideType === 'blocked' && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Bloqueio</label>
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBlockAllDay(true)}
                        className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          blockAllDay ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Dia Inteiro
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockAllDay(false)}
                        className={`flex-1 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                          !blockAllDay ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Horários Específicos
                      </button>
                    </div>
                  </div>
                )}

                {overrideType === 'blocked' && !blockAllDay && (
                  <div className="mb-3 space-y-2">
                    <label className="text-xs font-medium text-gray-600">Períodos para Bloquear</label>
                    {blockedSlots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => {
                            const updated = [...blockedSlots];
                            updated[i].start = e.target.value;
                            setBlockedSlots(updated);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                        />
                        <span className="text-gray-400 text-xs">até</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => {
                            const updated = [...blockedSlots];
                            updated[i].end = e.target.value;
                            setBlockedSlots(updated);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                        />
                        {blockedSlots.length > 1 && (
                          <button
                            onClick={() => setBlockedSlots(blockedSlots.filter((_, j) => j !== i))}
                            className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setBlockedSlots([...blockedSlots, { start: '08:00', end: '11:00' }])}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      + Adicionar período
                    </button>
                  </div>
                )}

                {overrideType === 'extra' && (
                  <div className="mb-3 space-y-2">
                    <label className="text-xs font-medium text-gray-600">Períodos</label>
                    {extraSlots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => {
                            const updated = [...extraSlots];
                            updated[i].start = e.target.value;
                            setExtraSlots(updated);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                        />
                        <span className="text-gray-400 text-xs">até</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => {
                            const updated = [...extraSlots];
                            updated[i].end = e.target.value;
                            setExtraSlots(updated);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
                        />
                        {extraSlots.length > 1 && (
                          <button
                            onClick={() => setExtraSlots(extraSlots.filter((_, j) => j !== i))}
                            className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setExtraSlots([...extraSlots, { start: '14:00', end: '17:00' }])}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      + Adicionar período
                    </button>
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600">Motivo (opcional)</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Ex: Reunião, feriado, evento especial..."
                    className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveOverride}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-light cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                  {getDayInfo(selectedDate).override && (
                    <button
                      onClick={handleDeleteOverride}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Selecione um dia no calendário para ver detalhes ou fazer alterações.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
