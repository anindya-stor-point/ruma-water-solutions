import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useSocket } from "../context/SocketContext";
import { useLanguage } from "../context/LanguageContext";
import { Star, ShoppingCart, Heart, ArrowLeft, Trash2 } from "lucide-react";
import { doc, getDoc, onSnapshot, collection, query, addDoc, serverTimestamp, orderBy, deleteDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError, safeStringify, safeError } from "../firebase";
import ImageModal from "../components/ImageModal";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  imageUrls?: string[];
  stock: number;
  minOrderLimit?: number;
  barcode?: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPicture: string;
  rating: number;
  text: string;
  createdAt: any;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(() => {
    return (location.state as any)?.product || null;
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const displayImages = product?.imageUrls && product.imageUrls.length > 0 
    ? product.imageUrls 
    : [product?.imageUrl || "https://picsum.photos/seed/product/400/400"];
  const MIN_ORDER_LIMIT = product?.minOrderLimit || 24;

  const [quantity, setQuantity] = useState(() => {
    return (location.state as any)?.product?.minOrderLimit || 24;
  });
  const isFirstLoad = useRef(true);

  const handleAddToCart = () => {
    if (product) {
      if (quantity < MIN_ORDER_LIMIT) {
        toast.error(`Quantity must be at least ${MIN_ORDER_LIMIT}`);
        return;
      }
      
      addToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: quantity,
        minOrderLimit: MIN_ORDER_LIMIT
      });
      toast.success(`${quantity} ${product.name} added to cart!`);
    }
  };

  const handleOrderNow = () => {
    if (product) {
      if (quantity < MIN_ORDER_LIMIT) {
        toast.error(`Quantity must be at least ${MIN_ORDER_LIMIT}`);
        return;
      }
      navigate(`/checkout/${product.id}`, { state: { quantity, product, step: 2 } });
    }
  };

  useEffect(() => {
    if (!id) return;

    const productRef = doc(db, "products", id);
    const unsubscribeProduct = onSnapshot(productRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProduct({ id: docSnap.id, ...data } as Product);
        if (isFirstLoad.current) {
          setQuantity(data.minOrderLimit || 24);
          isFirstLoad.current = false;
        }
      } else {
        setProduct(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `products/${id}`);
    });

    const reviewsQuery = query(
      collection(db, "products", id, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `products/${id}/reviews`);
    });

    // Save to Recently Viewed
    if (id) {
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const newItem = { id, timestamp: Date.now() };
      const filtered = recentlyViewed.filter((item: any) => item.id !== id);
      filtered.unshift(newItem);
      // Keep only last 20 items
      localStorage.setItem('recentlyViewed', safeStringify(filtered.slice(0, 20)));
    }

    return () => {
      unsubscribeProduct();
      unsubscribeReviews();
    };
  }, [id]);

  const deleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteDoc(doc(db, "products", id!, "reviews", reviewId));
      toast.success("Review deleted successfully!");
    } catch (error) {
      safeError("Error deleting review:", error);
      toast.error("Failed to delete review.");
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (reviewText.trim().length < 3) {
      toast.error("Review must be at least 3 characters long");
      return;
    }

    try {
      await addDoc(collection(db, "products", id!, "reviews"), {
        userId: user.uid,
        userName: user.displayName,
        userPicture: user.photoURL,
        rating,
        text: reviewText,
        createdAt: serverTimestamp()
      });
      setReviewText("");
      setRating(5);
      toast.success("Review submitted successfully!");
    } catch (error) {
      safeError("Error submitting review:", error);
      toast.error("Failed to submit review.");
    }
  };

  if (!product) return <div className="text-center py-20 text-xl font-medium">Loading product...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <button 
        onClick={() => {
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate("/", { replace: true });
          }
        }} 
        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-bold transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        {t('common.back')}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center aspect-square">
            <img src={displayImages[selectedImageIndex]} alt={product.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setIsModalOpen(true)} referrerPolicy="no-referrer" />
          </div>
          {displayImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {displayImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all ${
                    selectedImageIndex === idx ? 'ring-2 ring-indigo-600 ring-offset-2' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>
          <div className="flex flex-col justify-center space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-600 font-bold uppercase tracking-widest text-sm mb-2">{product.category}</p>
                <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>
                {product.barcode && (
                  <div className="flex items-center gap-2 mt-2 text-gray-400 font-mono text-xs bg-gray-50 w-fit px-2 py-1 rounded border border-gray-100">
                    <span className="font-bold uppercase tracking-tighter text-[10px]">Barcode:</span>
                    <span>{product.barcode}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (isInWishlist(product.id)) {
                    removeFromWishlist(product.id);
                  } else {
                    addToWishlist(product);
                  }
                }}
                className={`p-3 rounded-2xl shadow-sm border transition-all ${
                  isInWishlist(product.id)
                    ? "bg-red-50 border-red-100 text-red-500"
                    : "bg-white border-gray-100 text-gray-400 hover:text-red-500"
                }`}
              >
                <Heart className={`w-6 h-6 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
              </button>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <p className="text-sm text-gray-500 font-bold mb-1">
                {t('cart.unit_price')}: ₹{Number(String(product.price).replace(/[^0-9.]/g, '')).toFixed(2)}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-gray-900">
                  ₹{(Number(String(product.price).replace(/[^0-9.]/g, '')) * quantity).toFixed(2)}
                </p>
                {quantity > 1 && (
                  <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">
                    ({quantity} {t('cart.items')})
                  </span>
                )}
              </div>
            </div>
            <p className={`text-sm font-semibold px-3 py-1 rounded-full ${product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {product.stock > 0 ? `${product.stock} ${t('product.in_stock')}` : t('product.out_of_stock')}
            </p>
          </div>

          {product.stock > 0 && (
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex flex-col gap-3">
                <label className="font-bold text-gray-700 text-base">Quantity Enter করুন</label>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xl hover:bg-gray-200 active:bg-gray-300 transition-colors shadow-sm text-gray-700"
                  >
                    -
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setQuantity(0);
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) {
                          setQuantity(Math.max(0, parsed));
                        }
                      }
                    }}
                    onBlur={() => {
                      if (quantity === 0) setQuantity(MIN_ORDER_LIMIT);
                    }}
                    className={`w-20 h-10 text-center font-black text-lg bg-white border-2 rounded-lg focus:ring-0 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      quantity < MIN_ORDER_LIMIT
                        ? 'border-red-500 text-red-500'
                        : 'border-gray-900 text-gray-900'
                    }`}
                  />
                  
                  <button
                    onClick={() => setQuantity(prev => prev + 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xl hover:bg-gray-200 active:bg-gray-300 transition-colors shadow-sm text-gray-700"
                  >
                    +
                  </button>
                </div>

                <div className="mt-1">
                  {quantity < MIN_ORDER_LIMIT ? (
                    <p className="text-red-500 font-semibold text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                      Minimum order is {MIN_ORDER_LIMIT}
                    </p>
                  ) : (
                    <p className="text-gray-900 font-semibold text-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-900 inline-block"></span>
                      Valid quantity
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Order Now Section */}
          <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center gap-6 mt-8">
            <div>
              <h3 className="text-2xl font-black mb-2">{t('product.ready_to_order')}</h3>
              <p className="text-gray-400">{t('product.get_delivered')}</p>
            </div>
            <button
              onClick={handleOrderNow}
              disabled={product.stock === 0}
              className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {t('product.order_now')}
            </button>
          </div>
        </div>
      </div>
      <ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} imageUrls={displayImages} alt={product.name} />

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('product.reviews')}</h2>
        
        {user ? (
          <form onSubmit={submitReview} className="mb-10 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">{t('product.write_review')}</h3>
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`focus:outline-none ${rating >= star ? "text-yellow-400" : "text-gray-300"}`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t('product.review_placeholder')}
              className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none h-32"
              required
            />
            <button type="submit" className="mt-4 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
              {t('product.submit_review')}
            </button>
          </form>
        ) : (
          <div className="mb-10 bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
            <p className="text-indigo-800 font-medium mb-4">{t('product.sign_in_review')}</p>
            <button onClick={() => navigate("/login", { state: { from: location } })} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700">
              {t('nav.login')}
            </button>
          </div>
        )}

        <div className="space-y-6">
          {reviews.length === 0 ? (
            <p className="text-gray-500 italic text-center py-8">{t('product.no_reviews')}</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <div className="flex items-center gap-4 mb-3">
                  <img src={review.userPicture} alt={review.userName} className="w-10 h-10 rounded-full bg-gray-200" referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-bold text-gray-900">{review.userName}</p>
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-300"}`} />
                      ))}
                    </div>
                  </div>
                  <span className="ml-auto text-sm text-gray-400">
                    {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                  {user && (user.uid === review.userId) && (
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 leading-relaxed">{review.text}</p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
