import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Mail, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { auth } from "../firebase";

export default function VerifyEmail() {
  const { user, logout, sendVerificationEmail } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (user.emailVerified) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleResend = async () => {
    setSending(true);
    setError("");
    try {
      await sendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email");
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600 font-medium mb-8">
            We've sent a verification link to <span className="text-indigo-600 font-bold">{user.email}</span>. 
            Please check your inbox and click the link to verify your account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold text-center border border-red-100">
            {error}
          </div>
        )}

        {sent && (
          <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-bold text-center border border-green-100 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Verification email resent successfully!
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <RefreshCw className="w-6 h-6" />
            I've Verified My Email
          </button>

          <button
            onClick={handleResend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {sending ? "Sending..." : "Resend Verification Email"}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 text-gray-500 font-bold hover:text-red-600 transition-colors pt-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Can't find the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}
