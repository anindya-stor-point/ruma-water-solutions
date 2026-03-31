import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { Package, Clock, CheckCircle, Truck, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { toast } from "sonner";

interface Order {
  id: string;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  createdAt: string;
  deletedByCustomer?: boolean;
  items: { productId: string; quantity: number; price: number; name: string }[];
}

export default function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/orders" } });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(allOrders.filter(o => o.deletedByCustomer !== true));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
    });

    return () => unsubscribe();
  }, [user]);

  const deleteOrder = async (orderId: string) => {
    setIsDeleting(true);
    try {
      await updateDoc(doc(db, "orders", orderId), { deletedByCustomer: true });
      setConfirmDeleteId(null);
      toast.success("Order deleted successfully");
    } catch (error: any) {
      toast.error("Delete failed: " + error.message);
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing": return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped": return <Truck className="w-5 h-5 text-indigo-500" />;
      case "delivered": return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('orders.sign_in')}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate("/", { replace: true });
            }
          }} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
          <ShoppingBag className="w-10 h-10 text-indigo-600" />
          {t('orders.title')}
        </h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto text-gray-200 mb-6" />
            <p className="text-xl text-gray-500 italic mb-8">{t('orders.empty')}</p>
            <Link to="/" className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              {t('cart.start_shopping')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="border border-gray-100 rounded-3xl p-8 hover:shadow-xl transition-all duration-300 bg-white">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 border-b border-gray-50 pb-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 flex-1">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('orders.order_id')}</p>
                      <p className="font-mono font-bold text-gray-900 text-sm break-all">{order.id}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('orders.date')}</p>
                      <p className="font-bold text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('orders.total')}</p>
                      <p className="font-black text-indigo-600 text-2xl">₹{Number(order.total || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                      {getStatusIcon(order.status)}
                      <span className="capitalize font-bold text-gray-700">{t(`orders.status_${order.status}`)}</span>
                    </div>
                    {order.status === "delivered" && (
                      <div className="flex items-center gap-2">
                        {confirmDeleteId === order.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => deleteOrder(order.id)}
                              disabled={isDeleting}
                              className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:bg-red-400"
                            >
                              {isDeleting ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(order.id)}
                            className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl transition-colors border border-red-100"
                            title="Delete Order History"
                          >
                            <Trash2 className="w-5 h-5" />
                            <span className="text-sm font-bold">Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('orders.items')}</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-gray-600 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <span className="font-bold text-gray-800">{item.name || `Product ID: ${item.productId}`}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-500 mr-4">{item.quantity} unit{item.quantity > 1 ? 's' : ''}</span>
                        <span className="font-black text-gray-900">₹{Number(item.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
