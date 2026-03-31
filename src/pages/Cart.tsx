import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Trash2, Plus, Minus, CreditCard, ShoppingCart, X, ArrowRight, ArrowLeft, Heart, ShoppingBag, ScanLine } from "lucide-react";
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { db, safeStringify, safeError } from "../firebase";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  barcode?: string;
}

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadRecentlyViewed = async () => {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      // Filter out items older than 24 hours
      const valid = stored.filter((item: any) => now - item.timestamp < oneDay);
      
      if (valid.length !== stored.length) {
        localStorage.setItem('recentlyViewed', safeStringify(valid));
      }

      setRecentlyViewed(valid);

      // Fetch product details for valid items
      const products: Product[] = [];
      for (const item of valid) {
        try {
          const productRef = doc(db, "products", item.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            products.push({ id: productSnap.id, ...productSnap.data() } as Product);
          }
        } catch (error) {
          safeError("Error fetching recently viewed product:", error);
        }
      }
      setRecentlyViewedProducts(products);
    };

    loadRecentlyViewed();
  }, []);

  const removeRecentlyViewed = (id: string) => {
    const updated = recentlyViewed.filter(item => item.id !== id);
    localStorage.setItem('recentlyViewed', safeStringify(updated));
    setRecentlyViewed(updated);
    setRecentlyViewedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleCheckout = async () => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setIsCheckingOut(true);
    try {
      const orderData = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "orders"), orderData);

      for (const item of cart) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: Math.max(0, currentStock - item.quantity)
          });
        }
      }

      clearCart();
      navigate(`/order-confirmation/${docRef.id}`);
    } catch (err) {
      safeError("Checkout error:", err);
      toast.error("An error occurred during checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left group"
          aria-label="Go back"
        >
          <div className="p-2 group-hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Menu</h1>
        </button>
      </div>
      
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link to="/wishlist" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center gap-4 group">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('profile.wishlist')}</h3>
            </Link>
            <Link to="/orders" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center gap-4 group">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('profile.orders')}</h3>
            </Link>
            <Link to="/scan" className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center gap-4 group">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <ScanLine className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t('common.scan_barcode') || 'Scan Barcode'}</h3>
            </Link>
          </div>

          {/* Recently Viewed Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">{t('cart.recently_viewed')}</h2>
              {recentlyViewedProducts.length > 0 && (
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                  {recentlyViewedProducts.length} {t('cart.items')}
                </span>
              )}
            </div>
            
            {recentlyViewedProducts.length === 0 ? (
              <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">{t('cart.no_recently_viewed')}</p>
              </div>
            ) : (
              <div className="relative group">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {recentlyViewedProducts.map((product) => (
                    <div key={product.id} className="relative flex-shrink-0 w-48 snap-start group/item">
                      <Link to={`/product/${product.id}`} className="block bg-white rounded-2xl p-3 border border-gray-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300">
                        <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-gray-50">
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h4>
                        <p className="text-indigo-600 font-black text-sm">₹{product.price.toLocaleString()}</p>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeRecentlyViewed(product.id);
                        }}
                        className="absolute -top-2 -right-2 w-10 h-10 bg-white text-red-500 hover:bg-red-50 rounded-full shadow-xl border-2 border-red-100 flex items-center justify-center transition-all z-20"
                        title="Remove from recently viewed"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
