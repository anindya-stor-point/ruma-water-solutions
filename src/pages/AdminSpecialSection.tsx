import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType, storage } from "../firebase";
import { collection, query, getDocs, doc, onSnapshot, addDoc, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Star, Package, Plus, Trash2, User, Key, Search, X, Image as ImageIcon, Save, Upload, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { compressImage } from "../lib/imageUtils";

export default function AdminSpecialSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [specialCodes, setSpecialCodes] = useState<any[]>([]);
  const [specialProducts, setSpecialProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // New Product Form
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    stock: 0,
    imageUrl: "",
    description: ""
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCodes = onSnapshot(collection(db, "specialCodes"), (snapshot) => {
      setSpecialCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProducts = onSnapshot(collection(db, "specialProducts"), (snapshot) => {
      setSpecialProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubCodes();
      unsubProducts();
    };
  }, []);

  const generateCode = async (userId: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await addDoc(collection(db, "specialCodes"), {
        code,
        userId,
        createdAt: serverTimestamp()
      });
      toast.success(`Code ${code} generated for user!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "specialCodes");
    }
  };

  const deleteCode = async (codeId: string) => {
    try {
      await deleteDoc(doc(db, "specialCodes", codeId));
      toast.info("Special code removed");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "specialCodes");
    }
  };

  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploadStatus, setUploadStatus] = useState("");

  const addSpecialProduct = async () => {
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }
    
    if (!newProduct.name || newProduct.price <= 0 || newProduct.stock <= 0) {
      toast.error("Please fill all fields with valid values");
      return;
    }

    if (!imageFile && !newProduct.imageUrl) {
      toast.error("Please upload an image");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting...");
    
    try {
      let finalImageUrl = newProduct.imageUrl;

      if (imageFile) {
        setUploadStatus("Processing image...");
        console.log("Starting image compression...");
        
        let base64Image: string;
        try {
          // aggressive compression (400x400) to ensure Base64 is small enough for Firestore if needed
          base64Image = await compressImage(imageFile, 400, 400, 0.6);
          console.log("Compression successful, size:", Math.round(base64Image.length / 1024), "KB");
        } catch (compError) {
          console.error("Compression failed:", compError);
          toast.error("Image processing failed. Please try a different image.");
          setUploading(false);
          return;
        }

        setUploadStatus("Uploading to server...");
        console.log("Attempting upload to Firebase Storage...");
        const storageRef = ref(storage, `special_products/${Date.now()}_${imageFile.name}`);
        
        try {
          // Try upload with a 20s timeout
          const uploadPromise = uploadString(storageRef, base64Image, 'data_url');
          const uploadTimeout = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Storage timeout")), 20000)
          );

          const uploadResult = await Promise.race([uploadPromise, uploadTimeout]);
          
          if (uploadResult) {
            console.log("Storage upload successful, getting URL...");
            setUploadStatus("Finalizing...");
            finalImageUrl = await getDownloadURL(uploadResult.ref);
          } else {
            throw new Error("Upload returned no result");
          }
        } catch (storageError) {
          console.warn("Storage upload failed or timed out, falling back to Base64 in Firestore:", storageError);
          setUploadStatus("Using reliable mode...");
          // If storage fails, we use the base64 string directly. 
          // Firestore document limit is 1MB, our compressed image is ~50KB.
          finalImageUrl = base64Image;
        }
      }

      setUploadStatus("Saving to database...");
      console.log("Adding document to Firestore...");
      
      try {
        await addDoc(collection(db, "specialProducts"), {
          ...newProduct,
          imageUrl: finalImageUrl,
          assignedUserId: selectedUser.id,
          createdAt: serverTimestamp()
        });
        
        toast.success("Special product added successfully!");
        setShowAddProduct(false);
        setNewProduct({ name: "", price: 0, stock: 0, imageUrl: "", description: "" });
        setImageFile(null);
        setUploadProgress(0);
        setUploadStatus("");
      } catch (firestoreError: any) {
        console.error("Firestore error in addSpecialProduct:", firestoreError);
        toast.error("Database error: " + (firestoreError.message || "Could not save product."));
      }
    } catch (error: any) {
      console.error("Critical error in addSpecialProduct:", error);
      toast.error(error.message || "Failed to add product. Please try again.");
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "specialProducts", productId));
      toast.info("Product removed");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "specialProducts");
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center font-bold">Loading...</div>;

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-gray-900 p-10 rounded-[3rem] text-white shadow-2xl">
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Special User Management</h1>
        <p className="text-gray-400 font-bold">Generate codes and assign exclusive products to special users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* User List & Code Generation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                <User className="w-8 h-8 text-indigo-600" />
                Users
              </h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredUsers.map((u) => {
                const userCode = specialCodes.find(c => c.userId === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <img src={u.photoURL || undefined} alt={u.displayName} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-black text-gray-900 uppercase tracking-tight">{u.displayName}</p>
                        <p className="text-gray-500 text-xs font-bold">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {userCode ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black tracking-widest text-sm shadow-lg shadow-indigo-100">
                            {userCode.code}
                          </div>
                          <button 
                            onClick={() => deleteCode(userCode.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateCode(u.id)}
                          className="flex items-center gap-2 bg-white text-indigo-600 border-2 border-indigo-100 px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <Key className="w-4 h-4" />
                          Generate Code
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowAddProduct(true);
                        }}
                        className="p-3 bg-gray-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-gray-200"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Special Products List */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-8 flex items-center gap-3">
              <Star className="w-8 h-8 text-amber-500" />
              Special Products
            </h2>
            
            <div className="space-y-4">
              {specialProducts.length === 0 ? (
                <p className="text-gray-400 font-bold text-center py-10">No special products yet.</p>
              ) : (
                specialProducts.map((p) => {
                  const assignedUser = users.find(u => u.id === p.assignedUserId);
                  return (
                    <div key={p.id} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl || undefined} alt={p.name} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 uppercase tracking-tight truncate">{p.name}</p>
                          <p className="text-indigo-600 font-black">₹{p.price}</p>
                        </div>
                        <button 
                          onClick={() => deleteProduct(p.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <User className="w-3 h-3 text-gray-400" />
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
                          For: {assignedUser?.displayName || "Unknown User"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProduct(false)}
              className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Add Special Product</h3>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">For: {selectedUser?.displayName}</p>
                </div>
                <button onClick={() => setShowAddProduct(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                    <input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Stock</label>
                    <input
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Image</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="special-product-image"
                      />
                      <label
                        htmlFor="special-product-image"
                        className="flex flex-col items-center justify-center w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all overflow-hidden"
                      >
                        {imageFile ? (
                          <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Click to upload</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-bold resize-none"
                  />
                </div>

                <button
                  onClick={addSpecialProduct}
                  disabled={uploading}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xl uppercase tracking-tighter hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>{uploadStatus || "Processing..."}</span>
                      </div>
                      {uploadProgress > 0 && (
                        <div className="w-48 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-white transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Save className="w-6 h-6" />
                      <span>Save Special Product</span>
                    </div>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
