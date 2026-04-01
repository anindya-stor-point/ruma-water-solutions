/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, useLocation, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { LanguageProvider } from "./context/LanguageContext";
import { RemoteConfigProvider } from "./context/RemoteConfigContext";
import { Toaster } from "sonner";
import { AlertCircle } from "lucide-react";
import Navbar from "./components/Navbar";
import UpdateChecker from "./components/UpdateChecker";
import SplashScreen from "./components/SplashScreen";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import BarcodeScanner from "./pages/BarcodeScanner";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import LanguageSelection from "./pages/LanguageSelection";
import DirectCheckout from "./pages/DirectCheckout";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotificationHandler from "./components/NotificationHandler";
import ErrorBoundary from "./components/ErrorBoundary";
import TermsAndConditions from "./pages/TermsAndConditions";
import About from "./pages/About";
import CustomerCare from "./pages/CustomerCare";
import Wishlist from "./pages/Wishlist";
import OrderHistory from "./pages/OrderHistory";
import { useAuth } from "./context/AuthContext";
import { db, safeLog, safeError } from "./firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

const ProtectedRoute = ({ children, requireVerification = true }: { children: React.ReactNode, requireVerification?: boolean }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerification && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

function MasterNavigationListener() {
  const location = useLocation();
  
  useEffect(() => {
    const saveCurrentHash = () => {
      try {
        // Universal Saving: Save the entire hash string
        const currentHash = window.location.hash;
        const ignoredPaths = ["#/login", "#/signup", "#/auth/callback"];
        
        // Check if the current hash is an ignored path
        const isIgnored = ignoredPaths.some(path => currentHash.startsWith(path));
        
        if (!isIgnored && currentHash && typeof localStorage !== 'undefined') {
          localStorage.setItem('saved_navigation_state', currentHash);
        }
      } catch (e) {
        safeError("MasterNavigationListener: Save failed", e);
      }
    };

    // Global Route Listener: Listen to EVERY hash change
    window.addEventListener('hashchange', saveCurrentHash);
    
    // Also save on React Router location change (internal navigations)
    saveCurrentHash();

    return () => window.removeEventListener('hashchange', saveCurrentHash);
  }, [location]);

  return null;
}

function SeedData() {
  useEffect(() => {
    const seedFlexon = async () => {
      try {
        const q = query(collection(db, "products"), where("name", "==", "Flexon Water Tank"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          await addDoc(collection(db, "products"), {
            name: "Flexon Water Tank",
            description: "Durable and high-capacity water storage tank.",
            price: 4500.00,
            category: "Water Solutions",
            imageUrl: "https://picsum.photos/seed/watertank/400/400",
            imageUrls: ["https://picsum.photos/seed/watertank/400/400", "https://picsum.photos/seed/watertank2/400/400"],
            stock: 15,
            minOrderLimit: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          safeLog("Flexon Water Tank seeded successfully.");
        }
      } catch (error) {
        safeError("Failed to seed Flexon Water Tank:", error);
      }
    };
    seedFlexon();
  }, []);
  return null;
}

function AppContent({ isRouteReady }: { isRouteReady: boolean }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <MasterNavigationListener />
      {isRouteReady && (
        <>
          <SeedData />
          <NotificationHandler />
          <Toaster position="top-center" richColors />
          <UpdateChecker />
          {user && !user.emailVerified && location.pathname !== "/verify-email" && (
            <div className="bg-amber-50 border-b border-amber-100 py-3 px-4 text-center animate-in fade-in slide-in-from-top duration-500">
              <p className="text-amber-800 text-sm font-bold flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Your email is not verified. 
                <Link to="/verify-email" className="underline hover:text-amber-900 ml-1">
                  Click here to verify your account
                </Link>
              </p>
            </div>
          )}
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<SplashScreen />} />
                <Route path="/home" element={<Home />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/about" element={<About />} />
                <Route path="/customer-care" element={<CustomerCare />} />
                <Route path="/scan" element={<BarcodeScanner />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/language" element={<ProtectedRoute requireVerification={false}><LanguageSelection /></ProtectedRoute>} />
                
                {/* Protected Routes */}
                <Route path="/checkout/:id/:step" element={<ProtectedRoute><DirectCheckout /></ProtectedRoute>} />
                <Route path="/checkout/:id" element={<Navigate to="1" replace />} />
                <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute requireVerification={false}><Profile /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requireVerification={false}><Settings /></ProtectedRoute>} />
              </Routes>
            </main>
          </div>
        </>
      )}
    </>
  );
}

export default function App() {
  const [isRouteReady, setIsRouteReady] = useState(false);

  useEffect(() => {
    // Initialize Google Auth for web and native
    GoogleAuth.initialize({
      clientId: '449552278886-2k7dgm73hr8svsprlhb2sm6iuuq04htj.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    }).catch((err) => {
      safeError("GoogleAuth initialization failed:", err);
    });
    
    setIsRouteReady(true);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <RemoteConfigProvider>
            <SocketProvider>
              <CartProvider>
                <WishlistProvider>
                  <Router>
                    <AppContent isRouteReady={isRouteReady} />
                  </Router>
                </WishlistProvider>
              </CartProvider>
            </SocketProvider>
          </RemoteConfigProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
