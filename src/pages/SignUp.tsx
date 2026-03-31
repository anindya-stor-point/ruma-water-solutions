import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, safeStringify, safeError } from "../firebase";
import { useLanguage } from "../context/LanguageContext";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const from = location.state?.from?.pathname || "/";

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters long");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      });
      
      // Update the Firestore document with the correct name
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        role: "user",
        createdAt: serverTimestamp(),
      }, { merge: true });

      // Send welcome email via backend
      try {
        await fetch('/api/notify-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeStringify({ name, email }),
        });
      } catch (notifyError) {
        safeError("Failed to send welcome email:", notifyError);
      }
      
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Create user document if it doesn't exist
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          role: "user",
          createdAt: serverTimestamp(),
        });
      }
      
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">{t('signup.title')}</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors mb-6 disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          {t('login.google')}
        </button>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">{t('login.or_email')}</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('signup.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('signup.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('signup.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? t('signup.signing_up') : t('signup.button')}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-600 font-medium">
          {t('signup.have_account')}{" "}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-bold">
            {t('signup.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
