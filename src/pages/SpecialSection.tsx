import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, getDocs, doc, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { Star, Package, LogOut, ShoppingCart, ArrowRight, CheckCircle2, Lock, ExternalLink } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export default function SpecialSection() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isSpecial, setIsSpecial] = useState(() => {
    if (!user) return false;
    return !!localStorage.getItem(`special_code_${user.uid}`);
  });
  const [specialProducts, setSpecialProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isSpecial);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!user) return;

    const savedCode = localStorage.getItem(`special_code_${user.uid}`);
    if (savedCode) {
      setIsSpecial(true);
      verifyCode(savedCode, true);
    } else {
      setLoading(false);
    }
  }, [user]);

  const verifyCode = async (inputCode: string, silent = false) => {
    if (!user) return;
    if (!silent) setVerifying(true);

    try {
      const q = query(
        collection(db, "specialCodes"),
        where("code", "==", inputCode),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setIsSpecial(true);
        localStorage.setItem(`special_code_${user.uid}`, inputCode);
        fetchSpecialProducts();
        if (!silent) toast.success("Special Dashboard Unlocked!");
      } else {
        if (!silent) toast.error("Invalid Special Code");
        localStorage.removeItem(`special_code_${user.uid}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "specialCodes");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const fetchSpecialProducts = () => {
    if (!user) return;
    const q = query(collection(db, "specialProducts"), where("assignedUserId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpecialProducts(products);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "specialProducts");
    });
    return unsubscribe;
  };

  const handleLogoutSpecial = () => {
    setIsSpecial(false);
    localStorage.removeItem(`special_code_${user?.uid}`);
    toast.info("Logged out from Special Dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isSpecial) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight uppercase">Special Access</h2>
          <p className="text-gray-500 font-medium mb-8">Enter your unique special code to unlock your exclusive dashboard and products.</p>
          
          <div className="w-full space-y-4">
            <input
              type="text"
              placeholder="Enter Special Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-bold text-center text-xl tracking-widest uppercase"
            />
            <button
              onClick={() => verifyCode(code)}
              disabled={verifying || !code}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {verifying ? "Verifying..." : "Unlock Dashboard"}
              {!verifying && <ArrowRight className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-600 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">Special Dashboard</h1>
          <p className="text-indigo-100 font-medium flex items-center gap-2">
            <Star className="w-5 h-5 fill-current" />
            Welcome to your exclusive space
          </p>
        </div>
        <button
          onClick={handleLogoutSpecial}
          className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl font-bold transition-all backdrop-blur-sm"
        >
          <LogOut className="w-5 h-5" />
          Exit Special Mode
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
              <Package className="w-8 h-8 text-indigo-600" />
              Your Exclusive Products
            </h2>
          </div>

          {specialProducts.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-[2rem] text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold text-lg">No special products assigned to you yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {specialProducts.map((product) => {
                const price = Number(product.price ?? 0);
                const formattedPrice = `₹${price.toFixed(2)}`;
                
                return (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -5 }}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col relative"
                  >
                    <div className="aspect-square relative overflow-hidden bg-gray-100">
                      <img
                        src={product.imageUrl || undefined}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                          Special
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-indigo-600 font-bold mb-1 uppercase tracking-wider">Special Product</p>
                        <h3 className="text-lg font-black text-gray-900 truncate">{product.name}</h3>
                        <p className="mt-1 text-xl font-black text-gray-900">{formattedPrice}</p>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => {
                            navigate(`/product/${product.id}`, { state: { product, collection: "specialProducts" } });
                          }}
                          className="flex-1 flex items-center justify-center py-2 rounded-lg font-bold transition-colors text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/checkout/${product.id}/2`, { state: { quantity: product.minOrderLimit || 24, product, collection: "specialProducts" } });
                          }}
                          className="flex-1 flex items-center justify-center py-2 rounded-lg font-bold transition-colors text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight uppercase">Special Status</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-green-900 font-black text-sm uppercase">Verified User</p>
                  <p className="text-green-700 text-xs font-bold tracking-tight">Access Granted</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Code</p>
                <p className="text-gray-900 font-black tracking-widest uppercase">
                  {localStorage.getItem(`special_code_${user?.uid}`)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100">
            <h3 className="text-lg font-black text-indigo-900 mb-4 tracking-tight uppercase">Need Help?</h3>
            <p className="text-indigo-700 text-sm font-medium leading-relaxed mb-6">
              If you have any issues with your special dashboard or products, please contact admin directly.
            </p>
            <button className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-sm hover:shadow-md transition-all">
              Contact Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
