/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  userName: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string>('Administrador');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // Fetch user name from 'collaborators' collection
          const userDocRef = doc(db, 'collaborators', u.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || 'Administrador');
            setUser(u);
          } else {
            // For the initial admin, create their collaborator doc automatically
            const isAdmin = u.email === 'guardamirimdemaua@hotmail.com';
            if (isAdmin) {
              const defaultName = 'Admin Principal';
              setUserName(defaultName);
              await setDoc(userDocRef, {
                name: defaultName,
                email: u.email,
                createdAt: new Date(),
              }, { merge: true });
              setUser(u);
            } else {
              // Deactivated collaborator!
              await signOut(auth);
              setUser(null);
              setUserName('');
              alert('Seu acesso a este painel foi revogado ou não foi autorizado.');
            }
          }
        } catch (error) {
          console.error('Error fetching collaborator name:', error);
          setUserName('Administrador');
          setUser(u);
        }
      } else {
        setUser(null);
        setUserName('');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, userName, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

