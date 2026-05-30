import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDX3RoR4mIf2cXa0cK4T1qclqOvOPhVaH4",
  authDomain: "anirban-pttc.firebaseapp.com",
  projectId: "anirban-pttc",
  storageBucket: "anirban-pttc.firebasestorage.app",
  messagingSenderId: "425911059790",
  appId: "1:425911059790:web:03bae520b51bde249eca1f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
