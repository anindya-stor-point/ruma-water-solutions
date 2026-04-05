import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useLanguage } from "../context/LanguageContext";
import { Heart, Search, Filter, X, ScanLine } from "lucide-react";
import { OperationType, handleFirestoreError } from "../firebase";
import Fuse from "fuse.js";

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  imageUrl: string;
  imageUrls?: string[];
  category: string;
  description: string;
  minOrderLimit?: number;
  barcode?: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [appName, setAppName] = useState("Ruma");
  const [tagline, setTagline] = useState("water solutions");
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const { t, language } = useLanguage();
  
  const searchTerm = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("category") || "All";
  const maxPrice = parseInt(searchParams.get("maxPrice") || "10000");

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("access_denied") === "true") {
      setAccessDenied(true);
      sessionStorage.removeItem("access_denied");
      setTimeout(() => setAccessDenied(false), 3000);
    }
    
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "products");
    });

    const settingsRef = doc(db, "appSettings", "main");
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppName(data.appName);
        setTagline(data.tagline || "");
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "appSettings/main");
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, []);

  const handleOrder = (product: Product) => {
    // Navigate directly to the multi-step checkout flow for this product
    navigate(`/checkout/${product.id}`, { state: { quantity: product.minOrderLimit || 24, product } });
  };

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Apply category and price filters first
    result = result.filter((product) => {
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      const price = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
      const matchesPrice = price <= maxPrice;
      return matchesCategory && matchesPrice;
    });

    // Apply fuzzy search if searchTerm exists
    if (searchTerm.trim()) {
      const fuse = new Fuse(result, {
        keys: ["name", "description", "id", "category"],
        threshold: 0.4,
        distance: 100,
        ignoreLocation: true,
      });
      result = fuse.search(searchTerm).map(r => r.item);
    }

    return result;
  }, [products, searchTerm, selectedCategory, maxPrice]);

  const updateFilters = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "All" || (key === "maxPrice" && value === "10000") || (key === "q" && value === "")) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-8">
      {accessDenied && (
        <div className="bg-red-100 text-red-800 p-4 rounded-xl font-bold text-center">
          Access Denied: You do not have permission to view the Admin Dashboard.
        </div>
      )}
      <div className="text-center pt-4 md:pt-8 pb-8 md:pb-12 px-4">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-4 md:mb-6 tracking-tighter leading-tight">
          {t('home.hero_title_1')} <span className="text-indigo-700">{t('home.hero_title_2')}</span>
        </h1>
        <p className="text-lg md:text-2xl text-gray-600 font-medium max-w-3xl mx-auto leading-relaxed mb-8 md:mb-10">
          {t('home.hero_subtitle')}
        </p>

        {/* Search and Filter Bar */}
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-grow flex items-center">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('home.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => updateFilters({ q: e.target.value })}
                  className="w-full pl-12 pr-12 py-3 md:py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base md:text-lg"
                />
                {searchTerm && (
                  <button 
                    onClick={() => updateFilters({ q: "" })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => navigate('/scan')}
                className="ml-3 p-3 md:p-4 bg-indigo-600 text-white rounded-2xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center"
                title="Scan Barcode or QR Code"
              >
                <ScanLine className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 md:py-4 rounded-2xl border transition-all flex items-center justify-center gap-2 font-bold ${
                showFilters || selectedCategory !== "All" || maxPrice < 10000
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>{t('home.filters')}</span>
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">{t('home.category')}</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => updateFilters({ category: cat })}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedCategory === cat
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                    {t('home.max_price')}: ₹{maxPrice}
                  </label>
                  <div className="space-y-4">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={maxPrice}
                      onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>₹0</span>
                      <span>₹5000</span>
                      <span>₹10000+</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end">
                <button
                  onClick={() => {
                    setSearchParams({});
                  }}
                  className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {t('home.reset_filters')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('home.no_products')}</h3>
          <p className="text-gray-500">{t('home.no_products_subtitle')}</p>
          <button
            onClick={() => {
              setSearchParams({});
            }}
            className="mt-6 text-indigo-600 font-bold hover:underline"
          >
            {t('home.clear_filters')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
          const isOutOfStock = product.stock === 0;
          const price = Number(product.price ?? 0);
          const formattedPrice = `₹${price.toFixed(2)}`;

          return (
            <div
              key={product.id}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col relative"
            >
              {isOutOfStock && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg z-10">
                  {t('product.out_of_stock')}
                </div>
              )}
              <Link to={`/product/${product.id}`} state={{ product }} className="block aspect-square w-full overflow-hidden bg-gray-100">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isInWishlist(product.id)) {
                    removeFromWishlist(product.id);
                  } else {
                    addToWishlist(product);
                  }
                }}
                className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all z-20 ${
                  isInWishlist(product.id) 
                    ? "bg-red-500 text-white" 
                    : "bg-white/80 text-gray-600 hover:bg-white"
                }`}
              >
                <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
              </button>
              <div className="p-4 flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-xs text-indigo-600 font-semibold mb-1 uppercase tracking-wider">{product.category}</p>
                  <h3 className="text-xl font-bold text-gray-900 truncate">{product.name}</h3>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">{formattedPrice}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/product/${product.id}`}
                    state={{ product }}
                    className="flex-1 flex items-center justify-center py-2 rounded-lg font-bold transition-colors text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    {t('product.view')}
                  </Link>
                  <button
                    disabled={isOutOfStock}
                    onClick={() => handleOrder(product)}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg font-bold transition-colors text-sm ${
                      isOutOfStock
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {t('product.order_now')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
}
