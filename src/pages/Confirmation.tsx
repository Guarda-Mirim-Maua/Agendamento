import { useLocation, Navigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateSelfReminderLink } from '../lib/whatsapp';
import { CheckCircle, MessageCircle, CalendarCheck, ArrowLeft } from 'lucide-react';

interface ConfirmationState {
  appointmentId: string;
  parentName: string;
  childName: string;
  phone: string;
  date: string;
  time: string;
}

export default function Confirmation() {
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

  if (!state) {
    return <Navigate to="/agendar" replace />;
  }

  const dateObj = new Date(state.date + 'T12:00:00');
  const formattedDate = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const selfReminderLink = generateSelfReminderLink(state.childName, state.date, state.time);

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
        <CheckCircle className="w-10 h-10 text-success" />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Agendamento Confirmado!
      </h2>
      <p className="text-gray-600 mb-6">
        Sua visita para matrícula na Guarda Mirim de Mauá foi agendada com sucesso.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 text-left">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          Detalhes do Agendamento
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Responsável</span>
            <span className="font-medium text-gray-800">{state.parentName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Criança</span>
            <span className="font-medium text-gray-800">{state.childName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Data</span>
            <span className="font-medium text-gray-800 capitalize">{formattedDate}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Horário</span>
            <span className="font-medium text-gray-800">{state.time}h</span>
          </div>
        </div>
      </div>

      <a
        href={selfReminderLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 mb-4"
      >
        <MessageCircle className="w-5 h-5" />
        Salvar lembrete no WhatsApp
      </a>
      <p className="text-xs text-gray-500 mb-6">
        Clique para enviar uma mensagem para si mesmo com os detalhes do agendamento
      </p>

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-left text-sm mb-6">
        <h4 className="font-semibold text-amber-800 mb-1">
          Documentos para levar no dia:
        </h4>
        <p className="text-amber-600 text-xs mb-2 italic">
          Caso não tenha enviado digitalmente, leve as cópias dos seguintes documentos:
        </p>
        <ul className="text-amber-700 space-y-1">
          <li>- Cópia do RG e CPF do responsável</li>
          <li>- Cópia da certidão de nascimento da criança</li>
          <li>- Cópia do comprovante de residência</li>
          <li>- Cópia da declaração escolar</li>
          <li>- 3 fotos 3x4 da criança</li>
        </ul>
      </div>

      <Link
        to="/agendar"
        className="inline-flex items-center gap-2 text-primary hover:text-primary-light text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Fazer outro agendamento
      </Link>
    </div>
  );
}
