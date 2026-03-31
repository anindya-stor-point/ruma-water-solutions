import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, safeStringify, db, safeLog, safeError } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const from = location.state?.from?.pathname || "/";

  React.useEffect(() => {
    const checkCurrentAuth = async () => {
      if (auth.currentUser) {
        setLoading(true);
        const exists = await checkUserExists(auth.currentUser.uid);
        if (!exists) {
          await signOut(auth);
          setShowSignupModal(true);
        } else {
          navigate(from, { replace: true });
        }
        setLoading(false);
      }
    };
    checkCurrentAuth();
  }, []);

  const notifyLogin = async (user: any) => {
    safeLog("Attempting to send login notification for:", user.email);
    try {
      const deviceInfo = navigator.userAgent.split(')')[0].split('(')[1] || navigator.platform;
      const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      
      const response = await fetch('/api/notify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          deviceInfo,
          loginTime
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        safeError("Login notification API failed:", errorData);
      } else {
        safeLog("Login notification request sent successfully");
      }
    } catch (err) {
      safeError("Failed to send login notification:", err);
    }
  };

  const checkUserExists = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      return userDoc.exists();
    } catch (err) {
      safeError("Error checking user existence:", err);
      return false;
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user exists in Firestore
      const exists = await checkUserExists(result.user.uid);
      if (!exists) {
        // If user doesn't exist in Firestore, sign them out and show modal
        await signOut(auth);
        setShowSignupModal(true);
        setLoading(false);
        return;
      }

      await notifyLogin(result.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user exists in Firestore
      const exists = await checkUserExists(result.user.uid);
      if (!exists) {
        // If user doesn't exist in Firestore, sign them out and show modal
        await signOut(auth);
        setShowSignupModal(true);
        setLoading(false);
        return;
      }

      await notifyLogin(result.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to log in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">{t('login.title')}</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
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

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">{t('login.password')}</label>
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
            {loading ? t('login.logging_in') : t('login.button')}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-600 font-medium">
          {t('login.no_account')}{" "}
          <Link to="/signup" className="text-indigo-600 hover:text-indigo-800 font-bold">
            {t('login.signup')}
          </Link>
        </p>
      </div>

      {/* Signup Required Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-red-500 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              
              <h3 className="text-3xl font-black text-red-600 mb-4 uppercase tracking-tight">
                {t('login.signup_required_title')}
              </h3>
              
              <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                {t('login.signup_required_desc')}
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <Link
                  to="/signup"
                  onClick={() => setShowSignupModal(false)}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-center tracking-wider"
                >
                  {t('login.signup_now')}
                </Link>
                
                <button
                  onClick={() => setShowSignupModal(false)}
                  className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                >
                  {t('common.back')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
