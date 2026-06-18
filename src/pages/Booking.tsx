import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Calendar from '../components/Calendar';
import TimeSlots from '../components/TimeSlots';
import { CalendarCheck, User, Baby, Phone, Loader2 } from 'lucide-react';

export default function Booking() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function formatPhoneInput(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setError('');
    setSubmitting(true);

    try {
      const docRef = await addDoc(collection(db, 'appointments'), {
        parentName: parentName.trim(),
        childName: childName.trim(),
        phone: phone.replace(/\D/g, ''),
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        status: 'confirmed',
        createdAt: Date.now(),
        reminderSent: false,
      });

      navigate('/confirmacao', {
        state: {
          appointmentId: docRef.id,
          parentName: parentName.trim(),
          childName: childName.trim(),
          phone: phone.replace(/\D/g, ''),
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
        },
      });
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError('Erro ao criar agendamento. Tente novamente.');
    }
    setSubmitting(false);
  }

  const canSubmit =
    selectedDate && selectedTime && parentName.trim() && childName.trim() && phone.replace(/\D/g, '').length >= 10;

  return (
    <div>
      <div className="relative mb-8 text-center flex flex-col items-center justify-center">
        {/* Main Header Container with Mascots flanking the Title */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 md:gap-10 w-full max-w-4xl px-2">
          {/* Left Mascot (Boy Cadet - mascote_menino) */}
          <div className="w-20 h-36 sm:w-32 sm:h-56 md:w-40 md:h-72 shrink-0 transition-all duration-300">
            <img 
              src="https://cdn.phototourl.com/free/2026-06-18-dbbbf891-d286-42dc-a89a-831aa02cee66.png" 
              alt="Mascote Menino Guarda Mirim" 
              className="w-full h-full object-contain mix-blend-multiply" 
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Central Title Block */}
          <div className="flex flex-col items-center justify-center">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-2 sm:mb-4">
              <CalendarCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-gray-800 uppercase tracking-tight">
              Agendar Matrícula
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 font-medium max-w-xs sm:max-w-md">
              Escolha o melhor dia e horário para a visita presencial
            </p>
          </div>

          {/* Right Mascot (Girl Cadet - mascote_menina) */}
          <div className="w-20 h-36 sm:w-32 sm:h-56 md:w-40 md:h-72 shrink-0 transition-all duration-300">
            <img 
              src="https://cdn.phototourl.com/free/2026-06-18-df78d485-3def-4100-a2c9-edabba7a2375.png" 
              alt="Mascote Menina Guarda Mirim" 
              className="w-full h-full object-contain mix-blend-multiply" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Step 1: Calendar */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
            1
          </span>
          <h3 className="font-semibold text-gray-700">Escolha o dia</h3>
        </div>
        <Calendar selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(null); }} />
      </div>

      {/* Step 2: Time Slots */}
      {selectedDate && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="font-semibold text-gray-700">Escolha o horário</h3>
          </div>
          <TimeSlots date={selectedDate} selectedTime={selectedTime} onSelectTime={setSelectedTime} />
        </div>
      )}

      {/* Step 3: Form */}
      {selectedDate && selectedTime && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="font-semibold text-gray-700">Seus dados</h3>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-primary flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 shrink-0" />
              <span className="capitalize">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {selectedTime}h
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Nome completo do responsável
              </label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Ex: Maria Silva Santos"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Baby className="w-4 h-4 inline mr-1" />
                Nome da criança
              </label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Ex: João Pedro Santos"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                placeholder="(11) 99999-9999"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CalendarCheck className="w-5 h-5" />
                  Confirmar Agendamento
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
