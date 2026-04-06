import React, { useState, useEffect } from "react";
import { useRemoteConfig } from "../context/RemoteConfigContext";
import { useLanguage } from "../context/LanguageContext";
import { APP_VERSION, APP_BUILD_NUMBER } from "../constants";
import { Download, X, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Toast } from "@capacitor/toast";
import { FileOpener } from "@capacitor-community/file-opener";
import { CapacitorHttp } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export default function UpdateChecker() {
  const { latestVersion, latestVersionCode, updateUrl, isLoading } = useRemoteConfig();
  const { language } = useLanguage();
  const [showUpdate, setShowUpdate] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const isBengali = language === 'bn';
  const currentText = isBengali ? { title: 'নতুন আপডেট পাওয়া গেছে!', body: 'অ্যাপটি আপডেট হচ্ছে...', updateBtn: 'Update' } : { title: 'New Update Available!', body: 'App is updating...', updateBtn: 'Update' };

  useEffect(() => {
    if (!isLoading && latestVersionCode > APP_BUILD_NUMBER && !isDismissed) {
      setShowUpdate(true);
    }
  }, [latestVersionCode, isLoading, isDismissed]);

  const handleDismiss = () => {
    setShowUpdate(false);
    setIsDismissed(true);
  };

  const handleUpdate = async () => {
    if (!updateUrl) {
      await Toast.show({ text: "Update URL missing" });
      return;
    }
    
    setIsDownloading(true);
    setProgress(0);

    try {
      // 1. Request Permissions
      const status = await Filesystem.requestPermissions();
      if (status.publicStorage !== 'granted') {
        throw new Error("Permission denied. Please enable storage permission in settings.");
      }
      
      // 2. Download APK using CapacitorHttp
      const fileName = 'update.apk';
      const result = await CapacitorHttp.downloadFile({
        url: updateUrl,
        filePath: fileName,
        fileDirectory: Directory.Cache,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:86.0) Gecko/20100101 Firefox/86.0'
        }
      });
      
      // CapacitorHttp doesn't provide progress directly easily.
      // We'll simulate progress for UI feedback.
      setProgress(50); 
      
      await Toast.show({ text: "Download complete! Installing..." });
      setProgress(100);
      
      // Open and install
      await FileOpener.open({
        filePath: result.path!,
        contentType: 'application/vnd.android.package-archive',
        openWithDefault: true
      });
      
      // Auto-delete after 10 seconds
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: fileName,
            directory: Directory.Cache
          });
          console.log("APK deleted successfully");
        } catch (e) {
          console.error("Failed to delete APK:", e);
        }
      }, 10000);
      
      setIsDownloading(false);
      setShowUpdate(false);

    } catch (error) {
      console.error("Update failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await Toast.show({ text: "Update failed: " + errorMessage });
      alert("Update failed:\n\n" + errorMessage);
      setIsDownloading(false);
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
            onClick={handleDismiss}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-[110]"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 rotate-3 transform hover:rotate-0 transition-transform duration-300">
              <Rocket className="w-12 h-12 text-white" />
            </div>

            <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              {currentText.title}
            </h3>
            <p className="text-indigo-600 font-black text-sm uppercase tracking-widest mb-4">
              Version {latestVersion}
            </p>

            {isDownloading ? (
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div className="bg-indigo-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                <p className="text-center mt-2">{progress}%</p>
              </div>
            ) : (
              <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                {currentText.body}
              </p>
            )}

            {!isDownloading && (
              <button
                onClick={handleUpdate}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                <Download className="w-6 h-6" />
                {currentText.updateBtn}
              </button>
            )}

            <button
              onClick={handleDismiss}
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
