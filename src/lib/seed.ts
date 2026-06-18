import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function seedDefaultConfig(): Promise<void> {
  const configRef = doc(db, 'config', 'schedule');
  await setDoc(configRef, {
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
  });
}
