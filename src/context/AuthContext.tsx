import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db, OperationType, handleFirestoreError, safeError } from "../firebase";
import WaterLoadingAnimation from "../components/WaterLoadingAnimation";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: "user" | "admin";
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          
          // Listen to user document changes
          unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser(docSnap.data() as User);
            } else {
              setUser(null);
            }
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            setLoading(false);
          });

        } catch (error) {
          safeError("Error fetching user data:", error);
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("admin_verified");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <WaterLoadingAnimation />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
