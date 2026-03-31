import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, ScanLine, Search, Package, AlertCircle, Camera } from 'lucide-react';
import WaterLoadingAnimation from '../components/WaterLoadingAnimation';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { db, OperationType, handleFirestoreError, safeError } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function BarcodeScanner() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [foundProduct, setFoundProduct] = useState<{ id: string; name: string } | null>(null);
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const searchProduct = async (barcode: string) => {
    setIsSearching(true);
    setFoundProduct(null);
    try {
      const q = query(collection(db, "products"), where("barcode", "==", barcode));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const product = { id: doc.id, name: doc.data().name };
        setFoundProduct(product);
        toast.success(`Product found: ${product.name}`);
        setTimeout(() => {
          navigate(`/product/${doc.id}`);
        }, 1500);
      } else {
        toast.error("No product found with this barcode.");
      }
    } catch (error) {
      safeError("Error searching product:", error);
      handleFirestoreError(error, OperationType.GET, "products");
    } finally {
      setIsSearching(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        safeError("Error stopping scanner:", err);
      }
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      // Get available cameras to pick the best one
      const cameras = await Html5Qrcode.getCameras();
      let cameraId = "";

      if (cameras && cameras.length > 0) {
        // Try to find a back camera by label or just pick the last one if multiple exist
        const backCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('environment') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('camera 2')
        );
        
        if (backCamera) {
          cameraId = backCamera.id;
        } else if (cameras.length > 1) {
          // If no explicit "back" label but multiple cameras, usually the second one is back
          cameraId = cameras[1].id;
        } else {
          cameraId = cameras[0].id;
        }
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      if (cameraId) {
        await scannerRef.current.start(
          cameraId,
          config,
          (decodedText) => {
            setScannedText(decodedText);
            stopScanner();
            searchProduct(decodedText);
          },
          () => {}
        );
      } else {
        // Fallback to facingMode if no camera IDs found
        await scannerRef.current.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setScannedText(decodedText);
            stopScanner();
            searchProduct(decodedText);
          },
          () => {}
        );
      }
      setIsScannerStarted(true);
    } catch (err) {
      safeError("Error starting scanner:", err);
      setCameraError("Could not access camera. Please ensure you have granted camera permissions.");
      setIsScannerStarted(false);
    }
  };

  useEffect(() => {
    // Start scanner on mount
    const timeoutId = setTimeout(startScanner, 500);

    return () => {
      clearTimeout(timeoutId);
      stopScanner();
    };
  }, []);

  const handleAppSearch = () => {
    if (scannedText) {
      navigate(`/?q=${encodeURIComponent(scannedText)}`);
    }
  };

  const handleGoogleSearch = () => {
    if (scannedText) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(scannedText)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-gray-800 shadow-md z-10">
        <button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate("/", { replace: true });
            }
          }}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ScanLine className="w-5 h-5" />
          {t('common.scan_barcode') || 'Scan Barcode / QR'}
        </h1>
      </div>

      {/* Scanner Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {!scannedText ? (
          <>
            <div className="w-full max-w-md aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl relative border-2 border-indigo-500/30">
              <div id="reader" className="w-full h-full"></div>
              
              {!isScannerStarted && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10">
                  <WaterLoadingAnimation />
                  <p className="text-gray-300">Initializing Camera...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-6 text-center z-20">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-white font-bold mb-4">{cameraError}</p>
                  <button 
                    onClick={startScanner}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Retry Camera
                  </button>
                </div>
              )}

              {isScannerStarted && (
                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                  <div className="w-full h-full border-2 border-indigo-500 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400"></div>
                    
                    {/* Scanning Animation Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-line"></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 text-center max-w-sm">
              <p className="text-gray-300 text-sm">
                Point your camera at a product barcode or QR code. The scanner will automatically detect it.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                <Camera className="w-4 h-4" />
                <span>Back Camera Active</span>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
            {isSearching ? (
              <div className="py-12 flex flex-col items-center gap-4">
                <WaterLoadingAnimation />
                <p className="text-gray-300 font-medium">Searching for product...</p>
              </div>
            ) : foundProduct ? (
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-2">
                  <Package className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white">{foundProduct.name}</h2>
                <p className="text-green-400 font-bold">Product Found!</p>
                <p className="text-gray-400 text-sm">Redirecting to product page...</p>
                
                <button
                  onClick={() => navigate(`/product/${foundProduct.id}`)}
                  className="mt-4 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors"
                >
                  Go to Product Now
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">No Product Found</h2>
                <p className="text-gray-400">We couldn't find a product matching this barcode in our store.</p>
                <div className="bg-gray-900 p-4 rounded-xl break-all">
                  <p className="text-gray-300 font-mono text-lg">{scannedText}</p>
                </div>
                
                <div className="space-y-3 pt-4">
                  <button
                    onClick={handleAppSearch}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Search in App
                  </button>
                  
                  <button
                    onClick={handleGoogleSearch}
                    className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Search on Google
                  </button>
                  
                  <button
                    onClick={() => {
                      setScannedText(null);
                      setFoundProduct(null);
                      setIsScannerStarted(false);
                      startScanner();
                    }}
                    className="w-full py-3 px-4 bg-transparent border border-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors mt-4"
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan 3s ease-in-out infinite;
          position: absolute;
          width: 100%;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
