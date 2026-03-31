import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Package, ShoppingBag, Settings as SettingsIcon, Plus, Edit, Trash2, ShieldCheck, ShieldAlert, Mail, X, Scan, Upload as UploadIcon, Camera, ArrowLeft } from "lucide-react";
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { db, storage, OperationType, handleFirestoreError, safeStringify, safeLog, safeError, auth } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, setDoc, orderBy, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { compressImage, compressImageToFile } from "../lib/imageUtils";
import ImageModal from "../components/ImageModal";
import WaterLoadingAnimation from "../components/WaterLoadingAnimation";

interface Product {
  id: string;
  name: string;
  price: string;
  stock: number;
  category: string;
  imageUrl: string;
  imageUrls?: string[];
  description: string;
  minOrderLimit?: number;
  barcode?: string;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: { productId: string; quantity: number; price: number; name: string }[];
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  createdAt: string;
  deletedByAdmin?: boolean;
  paymentMethod?: string;
  utrNumber?: string | null;
  receiptUrl?: string | null;
}

interface Settings {
  appName: string;
  tagline?: string;
  appLogo?: string;
  aboutUs: string;
  termsAndConditions: string;
  paymentMethods: string[];
  isCardPaymentEnabled?: boolean;
  isCodEnabled?: boolean;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [adminPassword, setAdminPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(sessionStorage.getItem("admin_verified") === "true");

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/admin" } });
    } else if (user.email !== "rumawatersolutions@gmail.com") {
      navigate("/");
    }
  }, [user, navigate]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      const response = await fetch("/api/admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (response.ok) {
        sessionStorage.setItem("admin_verified", "true");
        setIsVerified(true);
        toast.success("Admin access granted!");
      } else {
        toast.error("Invalid admin password");
      }
    } catch (error) {
      safeError("Admin verification failed:", error);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!user) return null;

  if (!isVerified) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Access</h1>
            <p className="text-gray-500 font-medium">Please enter the master password to continue.</p>
          </div>
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="relative group">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold text-center text-lg tracking-widest"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isVerifying ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Unlock Dashboard"
              )}
            </button>
          </form>
          <button 
            onClick={() => navigate("/")}
            className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { name: "Products", path: "/admin", icon: Package },
    { name: "Orders", path: "/admin/orders", icon: ShoppingBag },
    { name: "Tickets", path: "/admin/tickets", icon: Mail },
    { name: "Settings", path: "/admin/settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="w-full md:w-64 shrink-0 space-y-2">
        <div className="px-4 py-3 md:px-6 md:py-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 md:mb-2">Admin Status</p>
          <div className="flex items-center gap-2">
            {user.email === "rumawatersolutions@gmail.com" ? (
              <>
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-gray-700">Verified Admin</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-gray-700">Standard User</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1 truncate">{user.email}</p>
        </div>
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
          <Link
            to="/"
            className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all whitespace-nowrap text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 bg-white md:bg-transparent border border-gray-100 md:border-0 mb-0 md:mb-2"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Back to Home</span>
          </Link>
          <div className="hidden md:block h-px bg-gray-100 mx-4 my-2"></div>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all whitespace-nowrap ${
                  isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 bg-white md:bg-transparent border border-gray-100 md:border-0"
                }`}
              >
                <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 bg-white p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <Routes>
          <Route path="/" element={<AdminProducts user={user} />} />
          <Route path="/orders" element={<AdminOrders user={user} />} />
          <Route path="/tickets" element={<AdminTickets user={user} />} />
          <Route path="/settings" element={<AdminSettings user={user} />} />
        </Routes>
      </div>
    </div>
  );
}

function AdminTickets({ user }: { user: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/admin/tickets', {
          headers: {
            'x-user-id': user.uid,
            'x-user-role': user.role
          }
        });
        if (!response.ok) throw new Error('Failed to fetch tickets');
        
        const text = await response.text();
        if (!text) {
          setTickets([]);
          return;
        }
        const data = JSON.parse(text);
        setTickets(data);
      } catch (error) {
        safeError('Error fetching tickets:', error);
        toast.error('Failed to fetch tickets');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  }, [user]);

  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const deleteTicket = async (id: string) => {
    safeLog('Attempting to delete ticket:', id, 'User ID:', user?.uid);
    try {
      const response = await fetch(`/api/admin/tickets/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid,
          'x-user-role': user.role
        }
      });
      safeLog('Delete response status:', response.status);
      if (!response.ok) throw new Error('Failed to delete ticket');
      setTickets(tickets.filter(t => t.id !== id));
      toast.success('Ticket deleted successfully');
    } catch (error) {
      safeError('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    }
  };

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 sm:mb-8">Support Tickets</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tickets.map((t) => (
            <div 
              key={t.id} 
              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all cursor-pointer group"
              onClick={() => setSelectedTicket(t)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Ticket ID: {t.id}</p>
                  <h3 className="text-base font-bold text-gray-900">{t.name}</h3>
                </div>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase">
                  {t.problemType}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mb-3">{t.email}</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-medium">{new Date(t.createdAt).toLocaleString()}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTicket(t.id); }} 
                  className="text-xs font-bold text-red-500 hover:text-red-700 p-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-t-[2rem] sm:rounded-3xl p-6 sm:p-8 max-w-lg w-full animate-in fade-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900">Ticket Details</h3>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket ID</p>
                <p className="text-indigo-600 font-bold">{selectedTicket.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Name</p>
                  <p className="text-gray-900 font-bold">{selectedTicket.name}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Type</p>
                  <p className="text-gray-900 font-bold capitalize">{selectedTicket.problemType}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                <p className="text-gray-900 font-bold">{selectedTicket.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Details</p>
                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-gray-100">
                  {selectedTicket.details}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Created At</p>
                <p className="text-gray-500 text-xs">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminProducts({ user }: { user: any }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "products");
    });
    return () => unsubscribe();
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const startScanning = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("barcode-reader");
        scannerRef.current = scanner;

        // Get available cameras to pick the best one
        const cameras = await Html5Qrcode.getCameras();
        let cameraId = "";

        if (cameras && cameras.length > 0) {
          const backCamera = cameras.find(cam => 
            cam.label.toLowerCase().includes('back') || 
            cam.label.toLowerCase().includes('environment') ||
            cam.label.toLowerCase().includes('rear') ||
            cam.label.toLowerCase().includes('camera 2')
          );
          
          if (backCamera) {
            cameraId = backCamera.id;
          } else if (cameras.length > 1) {
            cameraId = cameras[1].id;
          } else {
            cameraId = cameras[0].id;
          }
        }

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        };

        if (cameraId) {
          await scanner.start(
            cameraId,
            config,
            (decodedText) => {
              setBarcode(decodedText);
              stopScanning();
              toast.success("Barcode scanned successfully!");
            },
            () => {}
          );
        } else {
          await scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              setBarcode(decodedText);
              stopScanning();
              toast.success("Barcode scanned successfully!");
            },
            () => {}
          );
        }
      } catch (err) {
        safeError("Error starting scanner:", err);
        toast.error("Could not start camera scanner.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        safeError("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const handleBarcodeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("barcode-reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      setBarcode(decodedText);
      toast.success("Barcode extracted from image!");
    } catch (err) {
      safeError("Error scanning file:", err);
      toast.error("Could not find a valid barcode in this image.");
    } finally {
      html5QrCode.clear();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      setConfirmDeleteId(null);
      toast.success("Product deleted successfully");
    } catch (error) {
      safeError("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>, skipImage: boolean = false) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("Starting...");
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      const name = String(formData.get("name") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const price = parseFloat(String(formData.get("price") || "0"));
      const stock = parseInt(formData.get("stock") as string, 10) || 0;
      const minOrderLimit = parseInt(formData.get("minOrderLimit") as string, 10) || 1;
      
      if (name.length < 2) {
        toast.error("Product name must be at least 2 characters long");
        setIsSaving(false);
        return;
      }
      
      if (price <= 0) {
        toast.error("Product price must be greater than 0");
        setIsSaving(false);
        return;
      }
      
      if (stock < 0) {
        toast.error("Product stock cannot be negative");
        setIsSaving(false);
        return;
      }

      let imageUrls: string[] = [...existingImages];

      if (imageFiles.length > 0 && !skipImage) {
        setSaveStatus("Uploading images...");
        try {
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            if (file.size > 5 * 1024 * 1024) {
              throw new Error(`File ${file.name} is too large. Please upload images under 5MB.`);
            }

            const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                uploadTask.cancel();
                reject(new Error("Upload timed out. Storage might be unreachable."));
              }, 8000);

              uploadTask.on('state_changed', 
                (snapshot) => {
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  setUploadProgress(progress);
                  setSaveStatus(`Uploading ${i+1}/${imageFiles.length}: ${Math.round(progress)}%`);
                }, 
                (error) => {
                  clearTimeout(timeoutId);
                  reject(error);
                }, 
                () => {
                  clearTimeout(timeoutId);
                  resolve(null);
                }
              );
            });

            const url = await getDownloadURL(uploadTask.snapshot.ref);
            imageUrls.push(url);
          }
          setSaveStatus("Images uploaded!");
        } catch (uploadErr: any) {
          safeError("Detailed Upload Error:", uploadErr);
          
          if (uploadErr.code === 'storage/canceled') {
            setUploadError("Upload was canceled.");
            setIsSaving(false);
            return;
          }
          
          try {
            setSaveStatus("Storage failed. Compressing for database...");
            for (let i = 0; i < imageFiles.length; i++) {
              const compressedBase64 = await compressImage(imageFiles[i], 600, 600, 0.6);
              imageUrls.push(compressedBase64);
            }
            setSaveStatus("Images compressed for database!");
            toast.info("Storage failed, but images were saved to database.");
          } catch (compressErr) {
            safeError("Compression failed:", compressErr);
            setUploadError("Storage failed and image compression failed. Please check your internet connection.");
            setIsSaving(false);
            return;
          }
        }
      }

      // Fallback if no images
      if (imageUrls.length === 0) {
        const fallbackUrl = (formData.get("imageUrl") as string) || "https://picsum.photos/seed/product/400/400";
        imageUrls.push(fallbackUrl);
      }

      const imageUrl = imageUrls[0];

      setSaveStatus("Saving to database...");
      const productData = {
        name,
        description,
        price: price.toString(),
        stock,
        minOrderLimit,
        category: String(formData.get("category") || "General"),
        imageUrl,
        imageUrls,
        barcode,
        updatedAt: new Date().toISOString()
      };
      safeLog("Saving product data:", productData);
      
      try {
        if (isEditing) {
          await updateDoc(doc(db, "products", isEditing.id), productData);
          toast.success("Product updated successfully!");
        } else {
          const docRef = await addDoc(collection(db, "products"), {
            ...productData,
            createdAt: new Date().toISOString()
          });
          safeLog("Product added with ID:", docRef.id);
          toast.success("Product added successfully!");
        }
      } catch (dbError: any) {
        safeError("Firestore save error:", dbError);
        toast.error(`Database error: ${dbError.message}`);
        throw new Error(`Database error: ${dbError.message}. Please check your internet connection.`);
      }
      
      setIsEditing(null);
      setIsAdding(false);
      setImageFiles([]);
      setExistingImages([]);
      setBarcode("");
      setSaveStatus("");
      setUploadProgress(0);
    } catch (error: any) {
      safeError("Error saving product:", error);
      toast.error(`Failed to save: ${error.message}`);
      setSaveStatus("Error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      setBarcode(isEditing.barcode || "");
      if (isEditing.imageUrls && isEditing.imageUrls.length > 0) {
        setExistingImages(isEditing.imageUrls);
      } else if (isEditing.imageUrl) {
        setExistingImages([isEditing.imageUrl]);
      } else {
        setExistingImages([]);
      }
    } else {
      setExistingImages([]);
    }
  }, [isEditing]);

  if (isEditing || isAdding) {
    const p = isEditing || {} as Product;
    return (
      <div className="pb-20">
        <h2 className="text-2xl font-bold mb-6">{isEditing ? "Edit Product" : "Add Product"}</h2>
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input name="name" defaultValue={p.name} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" defaultValue={p.description} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (e.g. ₹500 per kg)</label>
              <input name="price" type="text" defaultValue={p.price} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input name="stock" type="number" defaultValue={p.stock} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Limit</label>
              <input name="minOrderLimit" type="number" min="1" defaultValue={p.minOrderLimit || 1} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input name="category" defaultValue={p.category} required className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Barcode / QR Code</label>
              {barcode && (
                <button 
                  type="button" 
                  onClick={() => setBarcode("")}
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <input 
                value={barcode} 
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Barcode value"
                className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => isScanning ? stopScanning() : startScanning()}
                className={`p-3 rounded-xl transition-colors flex items-center gap-2 font-bold ${
                  isScanning ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                }`}
              >
                {isScanning ? <X className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                {isScanning ? "Stop" : "Scan"}
              </button>
              <label className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-2 font-bold">
                <UploadIcon className="w-5 h-5" />
                Upload
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleBarcodeFileUpload}
                />
              </label>
            </div>

            {isScanning && (
              <div className="relative w-full aspect-square max-w-[300px] mx-auto bg-black rounded-xl overflow-hidden shadow-xl border-4 border-indigo-500">
                <div id="barcode-reader" className="w-full h-full"></div>
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/30 m-8 rounded-lg"></div>
              </div>
            )}
            
            {/* Hidden reader for file scanning */}
            <div id="barcode-reader-hidden" className="hidden"></div>
            
            <p className="text-[10px] text-gray-400 italic">
              Scan a barcode using your camera or upload an image of a barcode to automatically fill this field.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-500 font-bold uppercase">Option 1: Upload Files (Max 5)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (existingImages.length + imageFiles.length + files.length > 5) {
                      toast.error("You can only have up to 5 images per product.");
                      return;
                    }
                    setImageFiles(prev => [...prev, ...files]);
                  }} 
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" 
                />
                <p className="text-xs text-gray-400 italic">Tip: Use images under 1MB for faster upload.</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-500 font-bold uppercase">Option 2: Image URL (Fallback)</span>
                <input name="imageUrl" type="url" placeholder="https://example.com/image.jpg" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4">
              {existingImages.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative w-20 h-20 group">
                  <img src={url} className="w-full h-full rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                  <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageFiles.map((file, idx) => (
                <div key={`new-${idx}`} className="relative w-20 h-20 group">
                  <img src={URL.createObjectURL(file)} className="w-full h-full rounded-lg object-cover border border-gray-100" />
                  <button type="button" onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                  {isSaving && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">{Math.round(uploadProgress)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600 font-medium mb-2">Upload Failed: {uploadError}</p>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700"
                  >
                    Retry Upload
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      const form = (e.currentTarget.closest('form') as HTMLFormElement);
                      handleSave({ preventDefault: () => {}, currentTarget: form } as any, true);
                    }}
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-300"
                  >
                    Skip & Use Placeholder
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <WaterLoadingAnimation />
                  {saveStatus || (isEditing ? "Updating..." : "Saving...")}
                </>
              ) : (
                isEditing ? "Update Product" : "Save Product"
              )}
            </button>
            {isSaving && uploadProgress < 100 && (
              <button 
                type="button"
                onClick={(e) => {
                  const form = (e.currentTarget.closest('form') as HTMLFormElement);
                  handleSave({ preventDefault: () => {}, currentTarget: form } as any, true);
                }}
                className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
              >
                Skip Image & Save
              </button>
            )}
            <button type="button" onClick={() => { 
              setIsEditing(null); 
              setIsAdding(false); 
              setImageFiles([]); 
              setExistingImages([]); 
              setBarcode("");
              stopScanning();
            }} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Products</h2>
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-sm">Product</th>
              <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-sm">Price</th>
              <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-sm">Stock</th>
              <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-sm">Barcode</th>
              <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center gap-4">
                  <img 
                    src={p.imageUrl} 
                    alt={p.name} 
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100 cursor-pointer" 
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      safeLog("Selected image:", p.imageUrl);
                      setSelectedImage({ url: p.imageUrl, name: p.name });
                    }}
                  />
                  <span className="font-bold text-gray-900">{p.name}</span>
                </td>
                <td className="p-4 font-bold text-gray-900">
                  {`₹${Number(p.price ?? 0).toFixed(2)}`}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${p.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {p.barcode || "N/A"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-xs shadow-sm"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)} 
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-bold text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setIsEditing(p)} 
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(p.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ImageModal 
        isOpen={!!selectedImage} 
        onClose={() => setSelectedImage(null)} 
        imageUrls={[selectedImage?.url || '']} 
        alt={selectedImage?.name || ''} 
      />
    </div>
  );
}

function AdminOrders({ user }: { user: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(allOrders.filter(o => o.deletedByAdmin !== true));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
    });
    return () => unsubscribe();
  }, []);

  const { socket } = useSocket();

  const updateStatus = async (id: string, status: string, orderUserId: string, userEmail: string, userName: string) => {
    try {
      await updateDoc(doc(db, "orders", id), { status });
      toast.success(`Order status updated to ${status}`);
      
      // Emit socket event for real-time notification
      if (socket) {
        socket.emit("order_status_update", {
          orderId: id,
          userId: orderUserId,
          status: status
        });
      }

      // Send email notification via backend
      try {
        await fetch('/api/notify-order-status', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
            'x-user-role': user.role
          },
          body: safeStringify({ orderId: id, status, userEmail, userName }),
        });
      } catch (notifyError) {
        safeError("Failed to send order status notification:", notifyError);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
      toast.error("Failed to update status");
    }
  };

  const deleteOrder = async (id: string) => {
    setIsDeleting(true);
    try {
      await updateDoc(doc(db, "orders", id), { deletedByAdmin: true });
      setConfirmDeleteId(null);
      toast.success("Order deleted from admin view");
    } catch (error: any) {
      safeError("Error in deleteOrder:", error);
      toast.error("Error deleting order: " + error.message);
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 sm:mb-8">Orders</h2>
      <div className="space-y-4 sm:space-y-6">
        {orders.map((o) => (
          <div key={o.id} className="bg-gray-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-[10px] sm:text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">Order ID: {o.id}</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">{o.userName}</p>
                <p className="text-xs sm:text-sm text-gray-500">{o.userEmail}</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{new Date(o.createdAt).toLocaleString()}</p>
              </div>
              <div className="w-full sm:w-auto text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                <p className="text-xl sm:text-2xl font-black text-gray-900">₹{Number(o.total).toFixed(2)}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value, o.userId, o.userEmail, o.userName)}
                    className="p-1.5 sm:p-2 border border-gray-200 rounded-lg sm:rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-xs sm:text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  {o.status === "delivered" && (
                    <div className="flex items-center gap-2">
                      {confirmDeleteId === o.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => deleteOrder(o.id)}
                            disabled={isDeleting}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:bg-red-400"
                          >
                            {isDeleting ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(o.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-xs font-bold">Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Items</p>
              <ul className="space-y-2">
                {o.items?.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">{item.name} x {item.quantity}</span>
                    <span className="text-gray-900 font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Payment Details</p>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium text-gray-700">Method:</span>{' '}
                  <span className="font-bold text-gray-900 uppercase">{o.paymentMethod || 'N/A'}</span>
                </p>
                {o.paymentMethod === 'upi' && (
                  <>
                    <p>
                      <span className="font-medium text-gray-700">UTR / Ref No:</span>{' '}
                      <span className="font-bold text-gray-900">{o.utrNumber || 'N/A'}</span>
                    </p>
                    {o.receiptUrl && o.receiptUrl !== 'verified_by_ai' && o.receiptUrl !== 'verified_by_ai_but_upload_failed' && (
                      <div className="mt-2">
                        <p className="font-medium text-gray-700 mb-1">Screenshot:</p>
                        <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                          <img src={o.receiptUrl} alt="Payment Screenshot" className="w-32 h-32 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                        </a>
                      </div>
                    )}
                    {(o.receiptUrl === 'verified_by_ai' || o.receiptUrl === 'verified_by_ai_but_upload_failed') && (
                      <p className="mt-1 text-xs font-bold text-green-600 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Verified by AI (Screenshot not saved)
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSettings({ user }: { user: any }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, "appSettings", "main");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
      } else {
        // Provide default settings if doc doesn't exist
        setSettings({
          appName: "Ruma",
          tagline: "water solutions",
          aboutUs: "Welcome to Ruma Water Solutions.",
          termsAndConditions: "Terms and conditions content not set.",
          paymentMethods: ["Credit Card", "PayPal"],
          isCardPaymentEnabled: false,
          isCodEnabled: true,
        });
      }
      setIsLoading(false);
    }, (error) => {
      safeError("Settings listener error:", error);
      handleFirestoreError(error, OperationType.GET, "appSettings/main");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const appName = String(formData.get("appName") || "").trim();
    if (appName.length < 2) {
      toast.error("App name must be at least 2 characters long");
      return;
    }

    setIsSaving(true);
    let appLogo = settings?.appLogo || "";

    if (logoFile) {
      try {
        // Check file size (limit to 2MB for logo)
        if (logoFile.size > 2 * 1024 * 1024) {
          throw new Error("Logo file is too large. Please upload an image under 2MB.");
        }

        const storageRef = ref(storage, `branding/logo_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, logoFile);
        
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error("Upload timed out. Storage might be unreachable."));
          }, 8000); // 8 seconds timeout

          uploadTask.on('state_changed', null, 
            (error) => {
              clearTimeout(timeoutId);
              reject(error);
            }, 
            () => {
              clearTimeout(timeoutId);
              resolve(null);
            }
          );
        });

        appLogo = await getDownloadURL(uploadTask.snapshot.ref);
        toast.success("Logo uploaded successfully");
      } catch (error: any) {
        safeError("Logo upload failed:", error);
        if (error.code === 'storage/canceled') {
          toast.error("Logo upload was canceled.");
        } else {
          // Fallback to base64 for all other storage errors
          try {
            const compressedBase64 = await compressImage(logoFile, 200, 200, 0.6);
            appLogo = compressedBase64;
            toast.info("Storage failed, but logo was saved to database.");
          } catch (compressErr) {
            safeError("Logo compression failed:", compressErr);
            toast.error("Logo upload and compression failed.");
          }
        }
      }
    } else {
      appLogo = formData.get("appLogo") as string;
    }

    const newSettings = {
      appName,
      tagline: formData.get("tagline"),
      appLogo,
      aboutUs: formData.get("aboutUs"),
      termsAndConditions: formData.get("termsAndConditions"),
      paymentMethods: (formData.get("paymentMethods") as string).split(",").map(s => s.trim()).filter(Boolean),
      isCardPaymentEnabled: formData.get("isCardPaymentEnabled") === "on",
      isCodEnabled: formData.get("isCodEnabled") === "on",
    };

    try {
      await setDoc(doc(db, "appSettings", "main"), newSettings, { merge: true });
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      safeError("Error saving settings:", error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
      setLogoFile(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const oldPassword = String(formData.get("oldPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    
    const response = await fetch("/api/admin-password/change", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "X-User-Id": user.uid,
        "X-User-Role": user.role
      },
      body: safeStringify({ oldPassword, newPassword }),
    });
    if (response.ok) {
      toast.success("Password changed successfully!");
    } else {
      toast.error("Failed to change password. Check old password.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <WaterLoadingAnimation />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">App Settings</h2>
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">App Name</label>
            <input name="appName" defaultValue={settings.appName} required className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tagline (e.g. water solutions)</label>
            <input name="tagline" defaultValue={settings.tagline} className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">App Logo</label>
            <div className="flex items-center gap-4">
              {settings.appLogo && !logoFile && (
                <img src={settings.appLogo} alt="Current Logo" className="w-12 h-12 object-contain border rounded" referrerPolicy="no-referrer" />
              )}
              {logoFile && (
                <img src={URL.createObjectURL(logoFile)} alt="New Logo Preview" className="w-12 h-12 object-contain border rounded" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="flex-1 p-2 border border-gray-200 rounded-xl" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Or provide a URL below:</p>
            <input name="appLogo" defaultValue={settings.appLogo} placeholder="https://example.com/logo.png" className="w-full p-4 mt-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">About Us</label>
            <textarea name="aboutUs" defaultValue={settings.aboutUs} required className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 h-32 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Terms and Conditions</label>
            <textarea name="termsAndConditions" defaultValue={settings.termsAndConditions} required className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 h-64 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Payment Methods (comma separated)</label>
            <input name="paymentMethods" defaultValue={settings.paymentMethods.join(", ")} required className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" />
          </div>
          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
            <input 
              type="checkbox" 
              name="isCardPaymentEnabled" 
              id="isCardPaymentEnabled"
              defaultChecked={settings.isCardPaymentEnabled} 
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" 
            />
            <label htmlFor="isCardPaymentEnabled" className="font-bold text-gray-700 cursor-pointer">
              Enable Credit / Debit Card Payment Option
            </label>
          </div>
          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
            <input 
              type="checkbox" 
              name="isCodEnabled" 
              id="isCodEnabled"
              defaultChecked={settings.isCodEnabled !== false} 
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" 
            />
            <label htmlFor="isCodEnabled" className="font-bold text-gray-700 cursor-pointer">
              Enable Cash on Delivery (COD) Payment Option
            </label>
          </div>
          <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:bg-indigo-400">
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Change Admin Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl">
          <input name="oldPassword" type="password" placeholder="Old Password" required className="w-full p-4 border border-gray-200 rounded-xl" />
          <input name="newPassword" type="password" placeholder="New Password" required className="w-full p-4 border border-gray-200 rounded-xl" />
          <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Change Password</button>
        </form>
      </div>
      <style>{`
        #barcode-reader { border: none !important; }
        #barcode-reader__dashboard_section_csr span { color: #1f2937 !important; }
        #barcode-reader__dashboard_section_swaplink { color: #4f46e5 !important; text-decoration: none !important; margin-top: 10px; display: inline-block; }
        #barcode-reader button { background-color: #4f46e5 !important; color: white !important; border: none !important; padding: 8px 16px !important; border-radius: 8px !important; font-weight: 600 !important; cursor: pointer !important; margin: 10px 0 !important; }
        #barcode-reader select { padding: 8px !important; border-radius: 8px !important; border: 1px solid #d1d5db !important; margin-bottom: 10px !important; width: 100% !important; max-width: 300px !important; color: #1f2937 !important; }
      `}</style>
    </div>
  );
}
