import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User as UserIcon, LogOut, Settings, Package, Heart, ShoppingBag, Menu, X as CloseIcon, ScanLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useLanguage } from "../context/LanguageContext";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useRemoteConfig } from "../context/RemoteConfigContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { t } = useLanguage();
  const { showPromoBanner, promoBannerText } = useRemoteConfig();
  const [appName, setAppName] = useState("Ruma");
  const [tagline, setTagline] = useState("water solutions");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const docRef = doc(db, "appSettings", "main");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppName(data.appName);
        setTagline(data.tagline || "");
        setAppLogo(data.appLogo || null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "appSettings/main");
    });
    return () => unsubscribe();
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      {showPromoBanner && promoBannerText && (
        <div className="bg-indigo-600 text-white py-2 px-4 text-center text-sm font-bold animate-in fade-in slide-in-from-top duration-500">
          {promoBannerText}
        </div>
      )}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-3 group">
            {appLogo && (
              <div className="relative">
                <img src={appLogo} alt={appName} className="w-12 h-12 object-contain rounded-lg" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="flex flex-col leading-none">
              <span className="text-3xl font-black text-gray-900 tracking-tighter uppercase">{appName}</span>
              {tagline && (
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-0.5 ml-0.5">{tagline}</span>
              )}
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/wishlist" className="relative text-gray-600 hover:text-red-500 transition-colors">
              <Heart className="w-6 h-6" />
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link to="/orders" className="text-gray-600 hover:text-indigo-600 transition-colors">
              <ShoppingBag className="w-6 h-6" />
            </Link>

            <Link to="/cart" className="relative text-gray-600 hover:text-indigo-600 transition-colors">
              <ShoppingCart className="w-6 h-6" />
            </Link>

            {user && sessionStorage.getItem("admin_verified") === "true" && (
              <Link to="/admin" className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                <Package className="w-5 h-5" />
                <span className="hidden sm:inline">{t('nav.admin')}</span>
              </Link>
            )}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
                  <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                  <span className="hidden sm:inline font-medium">{user.displayName}</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                >
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Profile Icon */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="relative text-gray-600">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <Link to="/profile" className="flex items-center">
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
              </Link>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-indigo-600 transition-colors">
                <UserIcon className="w-7 h-7" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top duration-300 shadow-xl">
          <div className="px-4 py-6 space-y-4">
            {user ? (
              <>
                {sessionStorage.getItem("admin_verified") === "true" && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 text-gray-700 font-bold p-3 rounded-xl hover:bg-gray-50"
                  >
                    <Package className="w-5 h-5 text-indigo-500" />
                    <span>{t('nav.admin')}</span>
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-700 font-bold p-3 rounded-xl hover:bg-gray-50"
                >
                  <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  <span>{user.displayName}</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 text-red-600 font-bold p-3 rounded-xl hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('profile.logout')}</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center py-3 border border-gray-200 rounded-xl font-bold text-gray-700"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center py-3 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
