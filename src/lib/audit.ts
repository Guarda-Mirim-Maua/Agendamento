/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: 'whatsapp_reminder' | 'cancel_appointment' | 'restore_appointment' | 'save_override' | 'delete_override' | 'update_config' | 'create_collaborator' | 'login';
  details: string;
  timestamp: any;
}

export interface Collaborator {
  id: string; // matches uid
  name: string;
  email: string;
  createdAt: any;
}

export async function addAuditLog(log: Omit<AuditLog, 'timestamp' | 'id'>) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...log,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding audit log:', error);
  }
}
