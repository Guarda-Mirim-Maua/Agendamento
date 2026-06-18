import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Cole aqui as chaves que você copiou no Passo 3
const firebaseConfig = {
  apiKey: "AIzaSyBrHUqCVOM1mAQwUMJTcrbKMNplw6W7oT8",
  authDomain: "calendario-23d08.firebaseapp.com",
  projectId: "calendario-23d08",
  storageBucket: "calendario-23d08.firebasestorage.app",
  messagingSenderId: "1395087084",
  appId: "1:1395087084:web:5cb31c3949634e114d77c9"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta as instâncias do Banco e de Autenticação para usar nos seus componentes
export const db = getFirestore(app);
export const auth = getAuth(app);