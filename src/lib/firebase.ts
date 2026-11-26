import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// Firebase configuration comes exclusively from VITE_FIREBASE_* env vars (see .env.example).
const env = import.meta.env;
const required = {
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_FIRESTORE_DATABASE_ID: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  throw new Error(`Missing Firebase env variables: ${missing.join(', ')}. Copy .env.example to .env.local and fill them in.`);
}

const isLocalHost = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const firebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  apiKey: env.VITE_FIREBASE_API_KEY,
  // On deployed hosts, auth goes through the app's own domain (proxied via vercel.json rewrites).
  authDomain: typeof window !== "undefined" && !isLocalHost
    ? window.location.hostname
    : env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isInApp = /FBAN|FBAV|Instagram|Zalo|Messenger/i.test(userAgent); // detects Zalo, FB, Instagram WebViews

    if (isMobile || isSafari || isInApp) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
