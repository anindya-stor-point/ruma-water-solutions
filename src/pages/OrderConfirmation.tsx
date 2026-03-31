import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, safeError } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import { CheckCircle, Package, Truck, Calendar, ArrowRight, Home, User } from "lucide-react";
import { motion } from "motion/react";
import WaterLoadingAnimation from "../components/WaterLoadingAnimation";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl: string;
}

interface Order {
  id: string;
  userName: string;
  userEmail: string;
  phone: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const docRef = doc(db, "orders", orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        } else {
          safeError("Order not found");
        }
      } catch (error) {
        safeError("Error fetching order:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <WaterLoadingAnimation />
        <p className="text-gray-500 font-medium">{t('checkout.loading_order')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('checkout.order_not_found')}</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">{t('checkout.order_not_found_desc')}</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
          <Home className="w-5 h-5" />
          {t('checkout.back_home')}
        </Link>
      </div>
    );
  }

  // Calculate estimated delivery (7 days from creation)
  const createdAt = new Date(order.createdAt);
  const estimatedDelivery = new Date(createdAt);
  estimatedDelivery.setDate(createdAt.getDate() + 7);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">{t('checkout.order_confirmed')}</h1>
        <p className="text-xl text-gray-600 font-medium">{t('checkout.thank_you').replace('{name}', order.userName.split(' ')[0])}</p>
        <p className="text-gray-500 mt-2">{t('checkout.order_id')}: <span className="font-mono font-bold text-indigo-600">{order.id}</span></p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Delivery Info */}
          <div className="bg-indigo-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <Calendar className="w-10 h-10 text-indigo-200" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-1">{t('checkout.est_delivery')}</h3>
                <p className="text-3xl font-black">{estimatedDelivery.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-indigo-300 mt-1">{t('checkout.preparing_shipping')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Shipping & Actions */}
        <div className="space-y-8">
          {/* Shipping Details */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                {t('checkout.shipping_details')}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('checkout.recipient')}</p>
                <p className="font-bold text-gray-900">{order.userName}</p>
                <p className="text-gray-600 text-sm">{order.phone}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('checkout.address')}</p>
                <p className="text-gray-700 leading-relaxed">{order.shippingAddress}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('checkout.payment_method')}</p>
                <p className="font-bold text-indigo-600 uppercase text-sm">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link 
              to="/orders" 
              className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
            >
              <User className="w-5 h-5" />
              {t('checkout.view_orders')}
            </Link>
            <Link 
              to="/" 
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 border-2 border-gray-100 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all"
            >
              <Home className="w-5 h-5" />
              {t('checkout.continue_shopping')}
            </Link>
          </div>

          {/* Support Info */}
          <div className="text-center p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-sm text-gray-500">{t('checkout.need_help')}</p>
            <p className="text-sm font-bold text-indigo-600 mt-1 cursor-pointer hover:underline">{t('checkout.contact_support')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
