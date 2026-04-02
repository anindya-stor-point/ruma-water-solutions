import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage, Language } from "../context/LanguageContext";
import CustomerCare from "./CustomerCare";
import { db, OperationType, handleFirestoreError, safeError, auth } from "../firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { 
  Globe, 
  Headset, 
  FileText, 
  Info, 
  LogOut, 
  ChevronRight,
  Mail,
  ShieldCheck,
  Check,
  X,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import WaterLoadingSpinner from "../components/WaterLoadingSpinner";

export default function Profile() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCustomerCareModal, setShowCustomerCareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVersionTap = () => {
    if (user?.email !== "rumawatersolutions@gmail.com") return;
    
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    if (newTapCount === 7) {
      setShowPasswordDialog(true);
      setTapCount(0);
    }
  };

  React.useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => setTapCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      if (response.ok) {
        sessionStorage.setItem("admin_verified", "true");
        setSuccess("Successfully login");
        setTimeout(() => navigate("/admin"), 1000);
      } else {
        setError("Incorrect password");
      }
    } catch (err) {
      safeError("Admin verification failed:", err);
      setError("Verification failed. Please try again.");
    }
  };

  React.useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/profile" } });
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // 1. Delete user's wishlist items
      const wishlistPath = `users/${user.uid}/wishlist`;
      const wishlistRef = collection(db, wishlistPath);
      const wishlistSnap = await getDocs(wishlistRef);
      
      const deletePromises = wishlistSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // 2. Delete user data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);
      
      // 3. Delete from Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.delete();
      }
      
      // 4. Logout the user (redundant but safe)
      await logout();
      
      toast.success(t('profile.account_deleted_success') || 'Account deleted successfully');
      navigate("/signup");
    } catch (error: any) {
      safeError("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please logout and login again to delete your account for security.');
      } else {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
        toast.error(t('profile.account_delete_error') || 'Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setShowLanguageModal(false);
  };

  const menuItems = [
    { 
      icon: <Globe className="w-5 h-5" />, 
      label: t('profile.language'), 
      value: language === 'en' ? t('profile.english') : t('profile.bengali'), 
      onClick: () => navigate('/language') 
    },
    { icon: <Headset className="w-5 h-5" />, label: t('profile.customer_care'), onClick: () => navigate('/customer-care') },
    { icon: <FileText className="w-5 h-5" />, label: t('profile.terms'), onClick: () => navigate('/terms') },
    { icon: <Info className="w-5 h-5" />, label: t('profile.about'), onClick: () => navigate('/about') },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold">
          <ChevronRight className="w-5 h-5 rotate-180" />
          {t('nav.home')}
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4">
        <div className="relative">
          <img 
            src={user.photoURL} 
            alt={user.displayName} 
            className="w-32 h-32 rounded-full shadow-xl border-4 border-white object-cover" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900">{user.displayName}</h1>
          <p className="text-gray-500 font-medium flex items-center justify-center gap-1 mt-1">
            <Mail className="w-4 h-4" />
            {user.email}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-full border border-indigo-100 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gray-50 text-gray-500 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  {item.icon}
                </div>
                <span className="font-bold text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.value && <span className="text-sm text-gray-400 font-medium">{item.value}</span>}
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gray-50 text-gray-500 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-700">{t('profile.logout')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group border-t border-gray-50"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-100 transition-colors">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-red-600">{t('profile.delete_account')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-red-200 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* App Version */}
      <div className="text-center space-y-1">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em]">{t('profile.app_version')}</p>
        <p 
          className="text-sm font-black text-gray-400 cursor-pointer"
          onClick={handleVersionTap}
        >
          v1.0.9-stable
        </p>
      </div>

      {/* Admin Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Admin Access</h2>
              <p className="text-gray-500 text-sm font-medium">Enter master password</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold text-center text-lg tracking-widest"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
              {success && <p className="text-green-500 text-xs font-bold text-center">{success}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Unlock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setError("");
                    setAdminPassword("");
                  }}
                  className="bg-gray-100 text-gray-700 py-4 rounded-2xl font-black transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">{t('profile.delete_confirm_title')}</h2>
              <p className="text-gray-500 font-medium mb-8">
                {t('profile.delete_confirm_desc')}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <WaterLoadingSpinner className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  {t('profile.delete_confirm_btn')}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {t('profile.delete_cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
