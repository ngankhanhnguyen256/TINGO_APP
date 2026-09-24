import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// If a specific databaseId was provisioned, use it
const cfg = firebaseConfig as any;
export const db = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, cfg.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export default app;
