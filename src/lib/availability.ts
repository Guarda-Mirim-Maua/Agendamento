import {
  format,
  parse,
  addMinutes,
  isBefore,
  isEqual,
  startOfDay,
  getDay,
} from 'date-fns';
import { db } from './firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export interface TimeRange {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface ScheduleConfig {
  slotDuration: number; // minutes
  defaultSchedule: Record<string, TimeRange[]>; // "mon" | "tue" | ... 
}

export interface DayOverride {
  date: string;            // "yyyy-MM-dd"
  type: 'blocked' | 'extra';
  slots?: TimeRange[];     // for "extra" or partial "blocked" slots
  reason?: string;
}

export interface Appointment {
  id?: string;
  parentName: string;
  childName: string;
  phone: string;
  date: string;     // "yyyy-MM-dd"
  time: string;     // "HH:mm"
  status: 'confirmed' | 'cancelled';
  createdAt: number;
  reminderSent: boolean;
}

const DAY_MAP: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

export function generateTimeSlots(
  ranges: TimeRange[],
  duration: number
): string[] {
  const slots: string[] = [];
  for (const range of ranges) {
    const start = parse(range.start, 'HH:mm', new Date());
    const end = parse(range.end, 'HH:mm', new Date());
    let current = start;
    while (isBefore(current, end) || isEqual(current, end)) {
      const slotEnd = addMinutes(current, duration);
      if (isBefore(slotEnd, end) || isEqual(slotEnd, end)) {
        slots.push(format(current, 'HH:mm'));
      }
      current = addMinutes(current, duration);
    }
  }
  return slots;
}

export async function getScheduleConfig(): Promise<ScheduleConfig> {
  const docRef = doc(db, 'config', 'schedule');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as ScheduleConfig;
  }
  // Return default config if not set
  return {
    slotDuration: 30,
    defaultSchedule: {
      mon: [
        { start: '08:00', end: '11:00' },
        { start: '14:30', end: '18:00' },
      ],
      tue: [
        { start: '08:00', end: '11:00' },
        { start: '14:30', end: '18:00' },
      ],
      thu: [
        { start: '08:00', end: '11:00' },
        { start: '14:30', end: '18:00' },
      ],
    },
  };
}

export async function getOverrideForDate(
  dateStr: string
): Promise<DayOverride | null> {
  const docRef = doc(db, 'overrides', dateStr);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as DayOverride;
  }
  return null;
}

export async function getBookedSlotsForDate(
  dateStr: string
): Promise<string[]> {
  const q = query(
    collection(db, 'appointments'),
    where('date', '==', dateStr),
    where('status', '==', 'confirmed')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data().time);
}

export async function getAvailableSlots(date: Date): Promise<string[]> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = getDay(date);
  const dayKey = DAY_MAP[dayOfWeek];

  const config = await getScheduleConfig();
  const override = await getOverrideForDate(dateStr);

  // If blocked completely (type is 'blocked' and no slots), return empty
  if (override?.type === 'blocked' && (!override.slots || override.slots.length === 0)) {
    return [];
  }

  let ranges: TimeRange[] = [];

  if (override?.type === 'extra' && override.slots) {
    // Extra override provides its own slots
    ranges = override.slots;
  } else if (config.defaultSchedule[dayKey]) {
    ranges = config.defaultSchedule[dayKey];
  }

  if (ranges.length === 0) return [];

  const allSlots = generateTimeSlots(ranges, config.slotDuration);
  let blockedSlots: string[] = [];
  if (override?.type === 'blocked' && override.slots && override.slots.length > 0) {
    blockedSlots = generateTimeSlots(override.slots, config.slotDuration);
  }
  const bookedSlots = await getBookedSlotsForDate(dateStr);

  // Filter out past slots if the date is today
  const now = new Date();
  const today = startOfDay(now);
  const dateStart = startOfDay(date);

  let availableSlots = allSlots.filter(
    (s) => !bookedSlots.includes(s) && !blockedSlots.includes(s)
  );

  if (isEqual(dateStart, today)) {
    const currentTime = format(now, 'HH:mm');
    availableSlots = availableSlots.filter((s) => s > currentTime);
  }

  return availableSlots;
}

export async function hasAvailableSlots(date: Date): Promise<boolean> {
  const slots = await getAvailableSlots(date);
  return slots.length > 0;
}

export async function getOverridesForMonth(
  year: number,
  month: number
): Promise<Map<string, DayOverride>> {
  const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');

  const q = query(
    collection(db, 'overrides'),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  const overrides = new Map<string, DayOverride>();
  snapshot.docs.forEach((d) => {
    const data = d.data() as DayOverride;
    overrides.set(data.date, data);
  });
  return overrides;
}
