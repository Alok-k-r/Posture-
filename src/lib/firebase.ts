import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Safely load the firebase configuration using Vite's glob import.
// This prevents compilation failure if the user deletes the firebase-applet-config.json file.
const configs = (import.meta as any).glob('../../firebase-applet-config.json', { eager: true });
const configKeys = Object.keys(configs);

const firebaseConfig = configKeys.length > 0
  ? (configs[configKeys[0]] as any).default
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
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

testConnection();
