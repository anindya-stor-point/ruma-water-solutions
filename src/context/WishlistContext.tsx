import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, auth, OperationType, handleFirestoreError, safeError } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  addedAt: any;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: { id: string; name: string; price: string | number; imageUrl: string }) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWishlist([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const unsubscribe = onSnapshot(wishlistRef, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as WishlistItem);
      setWishlist(items);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/wishlist`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addToWishlist = async (product: { id: string; name: string; price: string | number; imageUrl: string }) => {
    if (!user) {
      toast.error("Please login to add items to wishlist");
      return;
    }

    const path = `users/${user.uid}/wishlist/${product.id}`;
    try {
      const numericPrice = typeof product.price === 'string' 
        ? parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0 
        : product.price;

      const itemRef = doc(db, 'users', user.uid, 'wishlist', product.id);
      await setDoc(itemRef, {
        productId: product.id,
        name: product.name,
        price: numericPrice,
        imageUrl: product.imageUrl,
        addedAt: serverTimestamp()
      });
      toast.success("Added to wishlist");
    } catch (error) {
      safeError("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist");
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;

    const path = `users/${user.uid}/wishlist/${productId}`;
    try {
      const itemRef = doc(db, 'users', user.uid, 'wishlist', productId);
      await deleteDoc(itemRef);
      toast.success("Removed from wishlist");
    } catch (error) {
      safeError("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.productId === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, isLoading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
