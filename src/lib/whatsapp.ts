import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function generateReminderLink(
  phone: string,
  parentName: string,
  childName: string,
  date: string,
  time: string
): string {
  const dateObj = new Date(date + 'T12:00:00');
  const formattedDate = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const message = encodeURIComponent(
    `Olá ${parentName}! 👋\n\n` +
    `Lembramos que o agendamento de matrícula do(a) *${childName}* ` +
    `na *Guarda Mirim de Mauá* está marcado para:\n\n` +
    `📅 *${formattedDate}*\n` +
    `🕐 *${time}h*\n\n` +
    `📋 *Caso não tenha enviado digitalmente, leve as cópias dos documentos:*\n` +
    `• Cópia do RG e CPF do responsável\n` +
    `• Cópia da certidão de nascimento da criança\n` +
    `• Cópia do comprovante de residência\n` +
    `• Cópia da declaração escolar\n` +
    `• 3 fotos 3x4 da criança\n\n` +
    `Caso precise reagendar, entre em contato conosco.\n\n` +
    `Até lá! 🫡`
  );

  const formattedPhone = formatPhone(phone);
  return `https://wa.me/${formattedPhone}?text=${message}`;
}

export function generateSelfReminderLink(
  childName: string,
  date: string,
  time: string
): string {
  const dateObj = new Date(date + 'T12:00:00');
  const formattedDate = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const message = encodeURIComponent(
    `🔔 *Lembrete de Agendamento*\n\n` +
    `Matrícula do(a) *${childName}* na Guarda Mirim de Mauá\n\n` +
    `📅 ${formattedDate}\n` +
    `🕐 ${time}h\n\n` +
    `📋 Caso não tenha enviado digitalmente, leve as cópias dos documentos:\n` +
    `• Cópia do RG e CPF do responsável\n` +
    `• Cópia da certidão de nascimento da criança\n` +
    `• Cópia do comprovante de residência\n` +
    `• Cópia da declaração escolar\n` +
    `• 3 fotos 3x4 da criança`
  );

  return `https://api.whatsapp.com/send?text=${message}`;
}
