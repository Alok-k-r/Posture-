import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Safely load the firebase configuration using Vite's glob import.
// This prevents compilation failure if the user deletes the firebase-applet-config.json file.
const configs = (import.meta as any).glob('../../firebase-applet-config.json', { eager: true });
const configKeys = Object.keys(configs);

const metaEnv = (import.meta as any).env || {};

const sanitizeEnvVal = (val: any) => {
  if (typeof val === 'string') {
    return val.replace(/^["']|["']$/g, '').trim();
  }
  return val;
};

const envConfig = {
  apiKey: sanitizeEnvVal(metaEnv.VITE_FIREBASE_API_KEY),
  authDomain: sanitizeEnvVal(metaEnv.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeEnvVal(metaEnv.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeEnvVal(metaEnv.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeEnvVal(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeEnvVal(metaEnv.VITE_FIREBASE_APP_ID),
  databaseURL: sanitizeEnvVal(metaEnv.VITE_FIREBASE_DATABASE_URL),
  firestoreDatabaseId: sanitizeEnvVal(metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || "(default)"
};

const hasEnvConfig = !!envConfig.apiKey && !envConfig.apiKey.includes('mock');

const firebaseConfig = configKeys.length > 0
  ? (configs[configKeys[0]] as any).default
  : hasEnvConfig
    ? envConfig
    : {
        apiKey: "mock-key-for-local-vibration-demo-only",
        authDomain: "mock-app.firebaseapp.com",
        projectId: "mock-app",
        storageBucket: "mock-app.appspot.com",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:0000000000000000000000",
        firestoreDatabaseId: "(default)"
      };

const app = initializeApp(firebaseConfig);
// Connects to the specific database configured for the applet (which contains the ESP32 synchronized telemetry data).
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const isMockFirebase = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('mock');

// Setup Firebase Realtime Database
const rtdbUrl = firebaseConfig.databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
export const rtdb = getDatabase(app, rtdbUrl);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection strictly as requested unless in mockup mode
async function testConnection() {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.includes('mock')) {
    console.warn("Using mock Firebase configuration. Running in offline/local simulator mode.");
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
    } else {
      console.warn("Firebase live database test connection failed:", error instanceof Error ? error.message : error);
    }
  }
}

// testConnection();
