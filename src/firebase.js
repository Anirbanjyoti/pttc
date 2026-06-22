import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAJy0Ay-Ee25U7Ie4_msRwgJf1RHR_vNJA",
  authDomain: "pttc-portal.firebaseapp.com",
  projectId: "pttc-portal",
  storageBucket: "pttc-portal.firebasestorage.app",
  messagingSenderId: "1088653711022",
  appId: "1:1088653711022:web:a661a79e2155e1744aff3f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
