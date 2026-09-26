import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const cfg = firebaseConfig as any;
const databaseId = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
  ? cfg.firestoreDatabaseId
  : undefined;

// Force Long Polling to eliminate "Failed to get document because the client is offline" errors in iframe and web environments
export const db = !getApps().length || !(app as any)._isInitialized
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, databaseId || '(default)')
  : getFirestore(app, databaseId || '(default)');

export const auth = getAuth(app);
export default app;
