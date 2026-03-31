import React from 'react';
import { motion } from 'motion/react';

export default function WaterLoadingSpinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <motion.div 
      className={`rounded-full bg-blue-400 ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}
