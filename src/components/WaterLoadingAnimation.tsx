import React from 'react';
import { motion } from 'motion/react';

export default function WaterLoadingAnimation() {
  return (
    <div className="relative flex flex-col items-center justify-center w-32 h-64">
      {/* Tap */}
      <svg className="w-16 h-16 mb-2" viewBox="0 0 100 100">
        <path d="M40 0h20v40c0 10 10 10 10 20v20c0 10-10 10-10 10H40c-10 0-10-10-10-20V60c0-10 10-10 10-20V0z" fill="#d1d5db" />
        <path d="M50 80a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" fill="#9ca3af" />
      </svg>

      {/* Bottle */}
      <div className="relative w-20 h-32 border-4 border-gray-300 rounded-b-2xl rounded-t-sm overflow-hidden bg-transparent">
        {/* Water Wave */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0044ff] to-[#00aaff]"
          initial={{ height: '0%' }}
          animate={{ height: ['0%', '100%', '110%', '110%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="absolute -top-4 w-full h-4" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path d="M0 10 Q 25 0 50 10 T 100 10 V 20 H 0 Z" fill="url(#waterGradient)" className="animate-wave" />
          </svg>
        </motion.div>
        
        {/* Overflow Effect */}
        <motion.div
          className="absolute -top-4 left-0 right-0 h-4 bg-[#00aaff] rounded-full opacity-0"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, times: [0.75, 0.85, 0.95] }}
        />
      </div>
      
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient id="waterGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00aaff" />
            <stop offset="100%" stopColor="#0044ff" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
