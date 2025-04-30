// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZaalHy0kV5PmP_a901QBmvdo8kv7I8JI",
  authDomain: "alpha-translator.firebaseapp.com",
  projectId: "alpha-translator",
  storageBucket: "alpha-translator.firebasestorage.app",
  messagingSenderId: "839725366275",
  appId: "1:839725366275:web:e77a5569855b7f8ebba236",
  measurementId: "G-VWZLJKQW7W",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar serviços
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configurar persistência
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Erro ao configurar persistência:", error);
});

export { auth, db, storage };
