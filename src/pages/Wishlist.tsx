import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Heart, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";

export default function Wishlist() {
  const { user } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { t } = useLanguage();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/wishlist" } });
    }
  }, [user, navigate]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate("/")} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
          <Heart className="w-10 h-10 text-red-500 fill-current" />
          {t('wishlist.title')}
        </h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {wishlist.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-20 h-20 mx-auto text-gray-200 mb-6" />
            <p className="text-xl text-gray-500 italic mb-8">{t('wishlist.empty')}</p>
            <Link to="/" className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              {t('cart.start_shopping')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {wishlist.map((item) => (
              <div key={item.productId} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative aspect-square overflow-hidden bg-gray-50">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => removeFromWishlist(item.productId)}
                    className="absolute top-3 right-3 p-2.5 bg-white/90 text-red-500 rounded-full shadow-md hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 truncate mb-1">{item.name}</h3>
                  <p className="text-2xl font-black text-indigo-600 mb-6">₹{Number(item.price).toFixed(2)}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/product/${item.productId}`)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      {t('product.view')}
                    </button>
                    <button
                      onClick={() => navigate(`/product/${item.productId}`)}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {t('product.order_now')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
