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
  emailVerified: boolean;
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  sendVerificationEmail: () => Promise<void>;
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
              const userData = docSnap.data() as User;
              setUser({
                ...userData,
                role: firebaseUser.email === "rumawatersolutions@gmail.com" ? "admin" : (userData.role || "user"),
                emailVerified: firebaseUser.emailVerified
              });
            } else {
              // If user document doesn't exist yet (e.g. during signup), 
              // we still want to know they are logged in but unverified
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName: firebaseUser.displayName || "",
                photoURL: firebaseUser.photoURL || "",
                role: firebaseUser.email === "rumawatersolutions@gmail.com" ? "admin" : "user",
                emailVerified: firebaseUser.emailVerified
              });
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

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      const { sendEmailVerification } = await import("firebase/auth");
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("admin_verified");
    localStorage.removeItem("camera_permission_granted");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, sendVerificationEmail }}>
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
