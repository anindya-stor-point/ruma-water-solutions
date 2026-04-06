// Firebase initialization
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getRemoteConfig } from "firebase/remote-config";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with forced long polling and disabled fetch streams for maximum compatibility
// in restricted network environments like the AI Studio preview.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const storage = getStorage(app);
export const remoteConfig = getRemoteConfig(app);

export let analytics: any = null;
isSupported().then(supported => {
  if (supported) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Analytics failed to initialize, this is expected in some environments:", e);
    }
  }
});

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Safely stringifies an object, handling circular references and Firebase-specific objects.
 */
export const safeStringify = (obj: any, indent = 2) => {
  const cache = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);

          // Handle Firebase specific objects more aggressively
          const constructorName = value.constructor?.name;
          if (
            value instanceof File || 
            value instanceof Blob ||
            constructorName === 'Firestore' || 
            constructorName === 'DocumentReference' || 
            constructorName === 'CollectionReference' ||
            constructorName === 'Query' ||
            constructorName === 'DocumentSnapshot' ||
            constructorName === 'QuerySnapshot' ||
            value._firestore ||
            value._delegate ||
            (constructorName && constructorName.length <= 3) // Minified names like Y2, Ka
          ) {
            return `[${constructorName || 'FirebaseObject'}]`;
          }
        }
        return value;
      },
      indent
    );
  } catch (err) {
    console.error('safeStringify failed:', err);
    return '[Serialization Error]';
  }
};

/**
 * Robust logging that avoids circular reference errors.
 */
export const safeLog = (message: string, ...args: any[]) => {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        const stringified = safeStringify(arg, 0);
        // If it's a simple bracketed string like [Y2], return it as is
        if (stringified.startsWith('"[') && stringified.endsWith(']"')) {
          return stringified.slice(1, -1);
        }
        return JSON.parse(stringified);
      } catch (e) {
        return arg; // Fallback to original object, console.log usually handles circularity
      }
    }
    return arg;
  });
  console.log(message, ...safeArgs);
};

/**
 * Robust error logging that avoids circular reference errors.
 */
export const safeError = (message: string, ...args: any[]) => {
  const safeArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        const stringified = safeStringify(arg, 0);
        if (stringified.startsWith('"[') && stringified.endsWith(']"')) {
          return stringified.slice(1, -1);
        }
        return JSON.parse(stringified);
      } catch (e) {
        return arg;
      }
    }
    return arg;
  });
  console.error(message, ...safeArgs);
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? 'Object error' : String(error)),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  let jsonString: string;
  try {
    jsonString = safeStringify(errInfo);
  } catch (e) {
    console.error('Failed to stringify error info safely:', e);
    try {
      jsonString = JSON.stringify({ 
        error: errInfo.error,
        operationType: errInfo.operationType,
        path: errInfo.path,
        userId: errInfo.authInfo.userId
      });
    } catch (e2) {
      jsonString = '{"error": "Total failure to stringify error info"}';
    }
  }

  console.error('Firestore Error: ', jsonString);
  throw new Error(jsonString);
}

// Test connection to Firestore with retries and better error reporting
async function testConnection(retries = 5) {
  const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
  safeLog(`[Firestore] Initiating connection test for database: ${databaseId}`);
  
  for (let i = 0; i < retries; i++) {
    try {
      // Try to fetch a dummy doc to check connection
      // We use getDocFromServer to ensure we are actually hitting the network
      await getDocFromServer(doc(db, '_connection_test_', 'ping'));
      safeLog("[Firestore] Connection test successful: Reached backend.");
      return;
    } catch (error: any) {
      // Permission denied is actually a good sign - it means we reached the server!
      if (error.code === 'permission-denied' || (error.message && error.message.includes('Missing or insufficient permissions'))) {
        safeLog("[Firestore] Connection test successful: Reached backend (verified via security rules).");
        return;
      }
      
      safeError(`[Firestore] Connection attempt ${i + 1}/${retries} failed: ${error.message} (Code: ${error.code})`);
      
      if (i === retries - 1) {
        safeError("[Firestore] CRITICAL: Firestore is unreachable after multiple attempts.");
        safeError("[Firestore] This often happens if the Firebase project configuration is stale (e.g., in a remixed app).");
        safeError("[Firestore] Please try re-running the Firebase setup from the settings menu if the problem persists.");
      } else {
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Run connection test
testConnection().catch(err => safeError("[Firestore] Connection test failed with fatal error:", err));
