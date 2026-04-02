import React, { useState, useEffect } from "react";
import { useRemoteConfig } from "../context/RemoteConfigContext";
import { APP_VERSION, APP_BUILD_NUMBER } from "../constants";
import { Download, X, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Browser } from "@capacitor/browser";

export default function UpdateChecker() {
  const { latestVersion, appVersion, latestVersionCode, updateUrl, isLoading } = useRemoteConfig();
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!isLoading && updateUrl) {
      // Compare latestVersionCode from Remote Config with current APP_BUILD_NUMBER
      // Or compare appVersion string with current APP_VERSION
      if (latestVersionCode > APP_BUILD_NUMBER || (appVersion && appVersion !== APP_VERSION)) {
        setShowUpdate(true);
      }
    }
  }, [latestVersionCode, appVersion, APP_BUILD_NUMBER, APP_VERSION, isLoading, updateUrl]);

  const handleUpdate = async () => {
    if (updateUrl) {
      try {
        // Use Capacitor Browser to open the update URL (Intent.ACTION_VIEW equivalent)
        await Browser.open({ url: updateUrl });
      } catch (error) {
        console.error("Failed to open update URL:", error);
        // Fallback to window.open if Browser plugin fails
        window.open(updateUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!showUpdate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-4 border-indigo-500 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50" />

          <button
            onClick={() => setShowUpdate(false)}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 rotate-3 transform hover:rotate-0 transition-transform duration-300">
              <Rocket className="w-12 h-12 text-white" />
            </div>

            <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              Update Available!
            </h3>
            <p className="text-indigo-600 font-black text-sm uppercase tracking-widest mb-4">
              Version {latestVersion}
            </p>

            <p className="text-gray-600 font-medium mb-8 leading-relaxed">
              A newer version of the app is available. Update now to get the latest features and bug fixes!
            </p>

            <button
              onClick={handleUpdate}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
            >
              <Download className="w-6 h-6" />
              Update Now
            </button>

            <button
              onClick={() => setShowUpdate(false)}
              className="mt-4 text-gray-400 font-bold hover:text-gray-600 transition-colors text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
