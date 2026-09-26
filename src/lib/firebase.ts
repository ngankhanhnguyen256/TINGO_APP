import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const cfg = firebaseConfig as any;
const databaseId =
  cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
    ? cfg.firestoreDatabaseId
    : undefined;

// Force Long Polling to eliminate "Failed to get document because the client is offline" errors in iframe, Cloud Run, and preview environments
function initDb() {
  try {
    return databaseId
      ? initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId)
      : initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db = initDb();
export const auth = getAuth(app);

// Non-blocking connectivity test on boot to prime the network channel
(async function verifyConnection() {
  try {
    await getDocFromServer(doc(db, 'system_settings', 'health_check'));
  } catch (err: any) {
    if (err?.message?.includes('offline')) {
      console.warn('Firestore long polling initializing in preview environment.');
    }
  }
})();

export default app;

