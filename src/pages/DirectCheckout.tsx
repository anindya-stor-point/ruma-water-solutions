import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, addDoc, collection, updateDoc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, safeStringify, handleFirestoreError, OperationType, safeLog, safeError, getApiUrl } from "../firebase";
import { GoogleGenAI } from "@google/genai";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Truck, CheckCircle, Package, Upload, X, ShieldCheck } from "lucide-react";
import { compressImage } from "../lib/imageUtils";
import WaterLoadingSpinner from "../components/WaterLoadingSpinner";
import WaterLoadingAnimation from "../components/WaterLoadingAnimation";

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

export default function DirectCheckout() {
  const { id, step: stepParam } = useParams<{ id: string, step: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const step = parseInt(stepParam || "2") as 2 | 3 | 4;

  const setStep = (newStep: number) => {
    navigate(`/checkout/${id}/${newStep}`, { state: location.state });
  };

  const [product, setProduct] = useState<Product | null>(() => {
    return (location.state as any)?.product || null;
  });

  const [quantity, setQuantity] = useState<number>(() => {
    const stateQuantity = (location.state as any)?.quantity;
    if (stateQuantity) {
      return stateQuantity;
    }
    const savedQuantity = localStorage.getItem(`checkout_quantity_${id}`);
    if (savedQuantity) {
      return parseInt(savedQuantity);
    }
    return 24;
  });

  useEffect(() => {
    if (product) {
      const minLimit = product.minOrderLimit || 24;
      if (quantity < minLimit) {
        setQuantity(minLimit);
      }
    }
  }, [product]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`checkout_quantity_${id}`, quantity.toString());
    }
  }, [quantity, id]);

  useEffect(() => {
    const stateQuantity = (location.state as any)?.quantity;
    if (stateQuantity) {
      setQuantity(stateQuantity);
      localStorage.setItem(`checkout_quantity_${id}`, stateQuantity.toString());
    }
  }, [location.state, id]);
  const MIN_ORDER_LIMIT = product?.minOrderLimit || 24;
  const numericPrice = parseFloat(String(product?.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const totalAmount = numericPrice * quantity;

  const handleContinue = () => {
    if (product) {
      if (quantity < MIN_ORDER_LIMIT) {
        toast.error(`Quantity must be at least ${MIN_ORDER_LIMIT}`);
        return;
      }
      setStep(3);
    }
  };

  const [isLoading, setIsLoading] = useState(!product);
  const [isProcessing, setIsProcessing] = useState(false);

  // Customer Details State
  const [customerDetails, setCustomerDetails] = useState({
    fullName: user?.displayName || "",
    phone: "",
    buildingNo: "",
    street: "",
    landmark: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    addressType: "Home",
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiAppClicked, setUpiAppClicked] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCardPaymentEnabled, setIsCardPaymentEnabled] = useState(false);
  const [isCodEnabled, setIsCodEnabled] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpiClick = (app: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;
    
    // Set status to pending payment before opening UPI app
    // This is a best effort, as we don't know if they actually pay.
    // The order is created only after they return and submit UTR.
    // If they don't return, the order is not created, so no status to update.
    
    const numericPrice = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
    const totalPrice = numericPrice * quantity;
    const upiId = "9339025328@axl"; // User's actual UPI ID
    const name = "Ruma Water Solutions";
    const note = `Order for ${product.name} (Qty: ${quantity})`;
    const baseParams = `pa=${upiId}&pn=${encodeURIComponent(name)}&am=${totalPrice.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

    let intentUrl = "";
    switch(app) {
      case 'gpay': intentUrl = `gpay://upi/pay?${baseParams}`; break;
      case 'phonepe': intentUrl = `phonepe://pay?${baseParams}`; break;
      case 'paytm': intentUrl = `paytmmp://pay?${baseParams}`; break;
      case 'amazon': intentUrl = `amazonPay://upi/pay?${baseParams}`; break;
      case 'navi': intentUrl = `navi://pay?${baseParams}`; break;
      default: intentUrl = `upi://pay?${baseParams}`; break;
    }
    
    // Open the intent URL
    window.location.href = intentUrl;
    setUpiAppClicked(true);
  };

  useEffect(() => {
    if (!user) {
      toast.error("Please log in to place an order");
      navigate("/login", { state: { from: `/checkout/${id}` } });
    }
  }, [user, navigate, id]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      // If we already have the product from state, we don't need to show loading
      if (product) setIsLoading(false);

      try {
        let collectionName = (location.state as any)?.collection || "products";
        let docSnap;
        
        try {
          const docRef = doc(db, collectionName, id!);
          docSnap = await getDoc(docRef);
        } catch (e) {
          safeError(`Error fetching from ${collectionName}:`, e);
        }
        
        // Fallback: try the other collection if not found or if first fetch failed
        if (!docSnap || !docSnap.exists()) {
          const fallbackCollection = collectionName === "products" ? "specialProducts" : "products";
          try {
            const fallbackRef = doc(db, fallbackCollection, id!);
            const fallbackSnap = await getDoc(fallbackRef);
            if (fallbackSnap.exists()) {
              docSnap = fallbackSnap;
            }
          } catch (e) {
            safeError(`Error fetching from fallback ${fallbackCollection}:`, e);
          }
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduct({ id: docSnap.id, ...data } as Product);
          
          // If no quantity was passed or saved, use minOrderLimit
          const savedQuantity = localStorage.getItem(`checkout_quantity_${id}`);
          const minLimit = data.minOrderLimit || 24;
          
          if (!savedQuantity && !(location.state as any)?.quantity) {
            setQuantity(minLimit);
          } else if (savedQuantity && parseInt(savedQuantity) < minLimit) {
            setQuantity(minLimit);
          } else if ((location.state as any)?.quantity && (location.state as any)?.quantity < minLimit) {
            setQuantity(minLimit);
          }
        } else if (!product) {
          toast.error("Product not found");
          navigate("/");
        }
      } catch (error) {
        safeError("Error fetching data:", error);
        if (!product) toast.error("Failed to load details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();

    const settingsRef = doc(db, "appSettings", "main");
    const unsubscribeSettings = onSnapshot(settingsRef, (settingsSnap) => {
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        setIsCardPaymentEnabled(settingsData.isCardPaymentEnabled === true);
        setIsCodEnabled(settingsData.isCodEnabled !== false);
        
        // If COD is disabled and currently selected, switch to UPI
        if (settingsData.isCodEnabled === false && paymentMethod === 'cod') {
          setPaymentMethod('upi');
        }
      }
    });

    return () => unsubscribeSettings();
  }, [id, navigate, location.state, paymentMethod]);

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { fullName, phone, buildingNo, street, city, district, state, pincode } = customerDetails;
    
    if (!fullName || !phone || !buildingNo || !street || !city || !district || !state || !pincode) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (fullName.trim().length < 2) {
      toast.error("Full name must be at least 2 characters long");
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode.trim())) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    setStep(4);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user) {
      toast.error("Please log in to place an order");
      navigate("/login", { state: { from: `/checkout/${id}` } });
      return;
    }

    setIsProcessing(true);
    try {
      let receiptUrl = null;

      if (paymentMethod === 'upi') {
        if (!utrNumber || utrNumber.length < 8) {
          toast.error("Please enter a valid UTR number (at least 8 characters)");
          setIsProcessing(false);
          return;
        }

        if (!screenshot) {
          toast.error("Please upload the payment screenshot");
          setIsProcessing(false);
          return;
        }

        toast.info("Verifying payment screenshot...");
        
        try {
          const base64Data = await fileToBase64(screenshot);
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
              parts: [
                { inlineData: { mimeType: screenshot.type, data: base64Data } },
                { text: "Extract the 12-digit UPI transaction reference number (UTR / Ref No / Transaction ID) from this payment screenshot. Return ONLY the 12-digit number. If you cannot find it, return 'NOT_FOUND'." }
              ]
            }
          });
          
          const extractedUtr = response.text?.trim() || "";
          
          if (!extractedUtr.includes(utrNumber)) {
            toast.error(`Mismatch! The UTR in the screenshot does not match the one you entered.`);
            setIsProcessing(false);
            return;
          }

          toast.success("Screenshot verified successfully!");

          try {
            const storageRef = ref(storage, `receipts/${user.uid}_${Date.now()}_${screenshot.name}`);
            
            // Use Promise.race to implement a timeout for uploadBytes
            const uploadPromise = uploadBytes(storageRef, screenshot);
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Upload timed out. Storage might be unreachable.")), 8000);
            });
            
            const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
            receiptUrl = await getDownloadURL(snapshot.ref);
          } catch (storageError: any) {
            safeError("Storage upload error:", storageError);
            if (storageError.code === 'storage/canceled') {
              toast.error("Screenshot upload was canceled.");
              setIsProcessing(false);
              return;
            }
            // Fallback to base64 for all other storage errors
            try {
              toast.info("Storage failed. Compressing screenshot for database...");
              const compressedBase64 = await compressImage(screenshot, 600, 600, 0.6);
              receiptUrl = compressedBase64;
              toast.success("Screenshot saved to database!");
            } catch (compressErr) {
              safeError("Screenshot compression failed:", compressErr);
              receiptUrl = "verified_by_ai_but_upload_failed";
            }
          }
        } catch (verifyError) {
          safeError("Verification error:", verifyError);
          toast.error("Failed to verify screenshot. Please try again.");
          setIsProcessing(false);
          return;
        }
      }

      const numericPrice = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
      const totalAmount = numericPrice * quantity;
      
      safeLog("Placing order with customerDetails:", customerDetails);
      
      const orderData = {
        userId: user.uid,
        userName: customerDetails.fullName,
        userEmail: user.email,
        phone: customerDetails.phone,
        shippingAddress: `${customerDetails.buildingNo}, ${customerDetails.street}, ${customerDetails.landmark ? customerDetails.landmark + ', ' : ''}${customerDetails.city}, ${customerDetails.district}, ${customerDetails.state} - ${customerDetails.pincode} (${customerDetails.addressType})`,
        items: [{
          productId: product.id,
          name: product.name,
          quantity: quantity, // Using the current state quantity
          price: numericPrice,
          imageUrl: product.imageUrl
        }],
        total: totalAmount,
        status: "pending",
        paymentMethod: paymentMethod,
        utrNumber: paymentMethod === 'upi' ? utrNumber : null,
        receiptUrl: receiptUrl,
        createdAt: new Date().toISOString(),
      };

      // Save order
      const ordersRef = collection(db, "orders");
      
      // Only check UTR for UPI payments
      if (paymentMethod === 'upi') {
        const q = query(ordersRef, where("utrNumber", "==", utrNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          toast.error("This UTR has already been used.");
          setIsProcessing(false);
          return;
        }
      }
      
      const docRef = await addDoc(ordersRef, orderData);

      // Send email notification via backend
      try {
        await fetch(getApiUrl('/api/notify-order'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
            'x-user-role': (user as any).role || 'user'
          },
          body: safeStringify({ orderId: docRef.id, orderData }),
        });
      } catch (notifyError) {
        safeError("Failed to send order notification:", notifyError);
        // Don't block the user if notification fails
      }

      // Update stock
      const collectionName = (location.state as any)?.collection || "products";
      const productRef = doc(db, collectionName, product.id);
      try {
        await updateDoc(productRef, {
          stock: Math.max(0, product.stock - quantity)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${product.id}`);
        throw error;
      }

      // Clear persisted step and quantity
      localStorage.removeItem(`checkout_step_${id}`);
      localStorage.removeItem(`checkout_quantity_${id}`);

      toast.success("Order placed successfully!");
      navigate(`/order-confirmation/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "orders");
      toast.error("An error occurred while placing your order.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <WaterLoadingAnimation />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full -z-10 transition-all duration-500"
            style={{ width: step === 2 ? '0%' : step === 3 ? '50%' : '100%' }}
          ></div>
          
          {[
            { num: 2, label: t('checkout.step_details'), icon: Package },
            { num: 3, label: t('checkout.step_shipping'), icon: Truck },
            { num: 4, label: t('checkout.step_payment'), icon: CreditCard }
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${
                step >= s.num ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-300 text-gray-400"
              }`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold ${step >= s.num ? "text-indigo-600" : "text-gray-400"}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {/* STEP 2: Product Details */}
        {step === 2 && (
          <div className="p-4 sm:p-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">{t('checkout.product_details')} (Page 3)</h2>
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full aspect-square object-cover rounded-2xl bg-gray-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider mb-2">{product.category}</p>
                  <h3 className="text-3xl font-black text-gray-900 mb-4">{product.name}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{product.description || "No description available for this product."}</p>
                  <div className="flex flex-col mb-6">
                    {quantity > 1 && (
                      <p className="text-sm text-gray-500 font-bold mb-1">
                        ₹{numericPrice.toFixed(2)} x {quantity}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-black text-indigo-600">
                        ₹{totalAmount.toFixed(2)}
                      </p>
                      {quantity > 1 && (
                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('cart.total')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
                    <div className="flex flex-col gap-3">
                      <label className="font-bold text-gray-700 text-base">Quantity Enter করুন</label>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4">
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

                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        // Navigate back to product page (Page 1)
                        if (id) {
                          navigate(`/product/${id}`, { state: location.state });
                        } else {
                          navigate(-1);
                        }
                      }}
                      className="w-1/3 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                    >
                      {t('checkout.back')}
                    </button>
                    <button 
                      onClick={handleContinue}
                      className="w-2/3 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                      {t('checkout.continue')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* STEP 3: Customer Details */}
        {step === 3 && (
          <div className="p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep(2)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-2xl font-extrabold text-gray-900">{t('checkout.your_details')} (Page 4)</h2>
            </div>
              
              <form onSubmit={handleCustomerSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.full_name')} *</label>
                  <input 
                    required
                    type="text" 
                    value={customerDetails.fullName}
                    onChange={(e) => setCustomerDetails({...customerDetails, fullName: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder={t('checkout.name_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.phone_number')} *</label>
                  <input 
                    required
                    type="tel" 
                    value={customerDetails.phone}
                    onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder={t('checkout.phone_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.building_no')} *</label>
                  <input 
                    required
                    type="text" 
                    value={customerDetails.buildingNo}
                    onChange={(e) => setCustomerDetails({...customerDetails, buildingNo: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder={t('checkout.building_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.street')} *</label>
                  <input 
                    required
                    type="text" 
                    value={customerDetails.street}
                    onChange={(e) => setCustomerDetails({...customerDetails, street: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder={t('checkout.street_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.landmark')}</label>
                  <input 
                    type="text" 
                    value={customerDetails.landmark}
                    onChange={(e) => setCustomerDetails({...customerDetails, landmark: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    placeholder={t('checkout.landmark_placeholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.city')} *</label>
                    <input 
                      required
                      type="text" 
                      value={customerDetails.city}
                      onChange={(e) => setCustomerDetails({...customerDetails, city: e.target.value})}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      placeholder={t('checkout.city')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.district')} *</label>
                    <input 
                      required
                      type="text" 
                      value={customerDetails.district}
                      onChange={(e) => setCustomerDetails({...customerDetails, district: e.target.value})}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      placeholder={t('checkout.district')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.state')} *</label>
                    <input 
                      required
                      type="text" 
                      value={customerDetails.state}
                      onChange={(e) => setCustomerDetails({...customerDetails, state: e.target.value})}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      placeholder={t('checkout.state')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.pincode')} *</label>
                    <input 
                      required
                      type="text" 
                      value={customerDetails.pincode}
                      onChange={(e) => setCustomerDetails({...customerDetails, pincode: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      placeholder={t('checkout.pincode')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('checkout.address_type')} *</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${customerDetails.addressType === 'Home' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input 
                        type="radio" 
                        name="addressType" 
                        value="Home" 
                        checked={customerDetails.addressType === 'Home'}
                        onChange={(e) => setCustomerDetails({...customerDetails, addressType: e.target.value})}
                        className="sr-only"
                      />
                      <span className="font-bold">{t('checkout.home')}</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${customerDetails.addressType === 'Work/Office' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <input 
                        type="radio" 
                        name="addressType" 
                        value="Work/Office" 
                        checked={customerDetails.addressType === 'Work/Office'}
                        onChange={(e) => setCustomerDetails({...customerDetails, addressType: e.target.value})}
                        className="sr-only"
                      />
                      <span className="font-bold">{t('checkout.work')}</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('checkout.back')}
                  </button>
                  <button 
                    type="submit"
                    className="w-2/3 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    {t('checkout.continue_to_payment')}
                  </button>
                </div>
              </form>
            </div>
        )}

        {/* STEP 4: Payment */}
        {step === 4 && (
          <div className="p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep(3)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-2xl font-extrabold text-gray-900">{t('checkout.payment')} (Page 5)</h2>
            </div>

              {/* Order Summary removed as per user request */}

              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('checkout.select_payment_method')}</h3>
                
                <div className="space-y-3">
                  <label className={`flex items-center p-4 border-2 rounded-xl transition-all ${
                    !isCardPaymentEnabled 
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                      : paymentMethod === 'card' 
                        ? 'border-indigo-600 bg-indigo-50 cursor-pointer' 
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="card" 
                      checked={paymentMethod === 'card'} 
                      onChange={() => isCardPaymentEnabled && setPaymentMethod('card')} 
                      disabled={!isCardPaymentEnabled}
                      className="hidden" 
                    />
                    <CreditCard className={`w-6 h-6 mr-4 ${paymentMethod === 'card' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{t('checkout.card_payment')}</p>
                        {!isCardPaymentEnabled && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            {t('checkout.coming_soon')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{t('checkout.card_desc')}</p>
                    </div>
                    {paymentMethod === 'card' && <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />}
                  </label>

                  <label className={`flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center w-full">
                      <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => { setPaymentMethod('upi'); setUpiAppClicked(false); }} className="hidden" />
                      <div className={`w-6 h-6 mr-4 flex items-center justify-center font-black text-sm rounded ${paymentMethod === 'upi' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>UPI</div>
                      <div>
                        <p className="font-bold text-gray-900">{t('checkout.upi_qr')}</p>
                        <p className="text-xs text-gray-500">{t('checkout.upi_desc')}</p>
                      </div>
                      {paymentMethod === 'upi' && <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />}
                    </div>
                    
                    {/* UPI Apps Grid */}
                    {paymentMethod === 'upi' && (
                      <div className="mt-4 pt-4 border-t border-indigo-100 grid grid-cols-4 gap-2">
                        <button onClick={(e) => handleUpiClick('phonepe', e)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" alt="PhonePe" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 text-center">PhonePe</span>
                        </button>
                        <button onClick={(e) => handleUpiClick('gpay', e)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center p-2 overflow-hidden">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 text-center">GPay</span>
                        </button>
                        <button onClick={(e) => handleUpiClick('paytm', e)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg" alt="Paytm" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 text-center">Paytm</span>
                        </button>
                        <button onClick={(e) => handleUpiClick('amazon', e)} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center p-2 overflow-hidden">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg" alt="Amazon Pay" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] font-bold text-gray-700 text-center">Amazon</span>
                        </button>
                      </div>
                    )}

                    {/* UTR Input Field & Screenshot Upload */}
                    {paymentMethod === 'upi' && upiAppClicked && (
                      <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm w-full space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t('checkout.enter_utr')} *
                          </label>
                          <p className="text-xs text-gray-500 mb-3">{t('checkout.utr_help')}</p>
                          <input
                            type="text"
                            required
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value)}
                            placeholder={t('checkout.utr_placeholder')}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t('checkout.upload_screenshot')} *
                          </label>
                          <p className="text-xs text-gray-500 mb-3">{t('checkout.screenshot_help')}</p>
                          
                          {!screenshotPreview ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">{t('checkout.click_to_upload')}</span> {t('checkout.drag_drop')}</p>
                                <p className="text-xs text-gray-500">{t('checkout.file_types')}</p>
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} required />
                            </label>
                          ) : (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                              <img src={screenshotPreview} alt="Screenshot Preview" className="w-full h-full object-contain bg-gray-50" />
                              <button 
                                type="button"
                                onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 text-red-500"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </label>

                  <label className={`flex items-center p-4 border-2 rounded-xl transition-all ${
                    !isCodEnabled 
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                      : paymentMethod === 'cod' 
                        ? 'border-indigo-600 bg-indigo-50 cursor-pointer' 
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="cod" 
                      checked={paymentMethod === 'cod'} 
                      onChange={() => isCodEnabled && setPaymentMethod('cod')} 
                      disabled={!isCodEnabled}
                      className="hidden" 
                    />
                    <Truck className={`w-6 h-6 mr-4 ${paymentMethod === 'cod' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{t('checkout.cod')}</p>
                        {!isCodEnabled && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            {t('checkout.coming_soon')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{t('checkout.cod_desc')}</p>
                    </div>
                    {paymentMethod === 'cod' && <CheckCircle className="w-5 h-5 text-indigo-600 ml-auto" />}
                  </label>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-1/3 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('checkout.back')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing || (paymentMethod === 'upi' && (!upiAppClicked || utrNumber.length < 8 || !screenshot))}
                    className="w-2/3 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:bg-indigo-400 flex justify-center items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <WaterLoadingSpinner className="w-5 h-5" />
                        {t('checkout.processing')}
                      </>
                    ) : paymentMethod === 'upi' ? (
                      upiAppClicked ? t('checkout.verify_place_order') : t('checkout.select_upi_app')
                    ) : (
                      t('checkout.pay_place_order').replace('{amount}', totalAmount.toFixed(2))
                    )}
                  </button>
                </div>
              </form>
            </div>
        )}
        {/* Fallback for invalid step */}
        {step !== 2 && step !== 3 && step !== 4 && (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-bold mb-4">Invalid Step: {step}</p>
            <button 
              onClick={() => navigate(`/checkout/${id}/2`, { replace: true })}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              Go to Step 2
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
