import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const WaterDropCharacter = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1, rotate: [0, -5, 5, 0] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    className="relative flex items-center justify-center"
  >
    {/* Water Drop Shape */}
    <svg width="200" height="250" viewBox="0 0 150 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M75 0C75 0 0 100 0 150C0 183.137 33.5786 200 75 200C116.421 200 150 183.137 150 150C150 100 75 0 75 0Z" fill="#38BDF8" />
      {/* Eyes */}
      <circle cx="50" cy="80" r="12" fill="white" />
      <circle cx="100" cy="80" r="12" fill="white" />
      <circle cx="50" cy="80" r="6" fill="black" />
      <circle cx="100" cy="80" r="6" fill="black" />
      {/* Smile */}
      <path d="M50 130C65 145 85 145 100 130" stroke="black" strokeWidth="6" strokeLinecap="round" />
    </svg>
    
    {/* Water Bottle */}
    <motion.div 
      className="absolute -right-12 top-24 w-16 h-32 bg-blue-100 rounded-t-lg rounded-b-md border-4 border-blue-300 flex flex-col items-center justify-start p-1"
      animate={{ rotate: [0, 10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="w-6 h-4 bg-blue-300 rounded-t-sm" />
      <div className="w-full h-full bg-blue-200 rounded-b-sm" />
    </motion.div>
  </motion.div>
);

export default function SplashScreen() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      // Check auth state and navigate accordingly
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          navigate('/home', { replace: true });
        } else {
          navigate('/signup', { replace: true });
        }
        unsubscribe();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <WaterDropCharacter />
          <motion.p 
            className="mt-12 text-sky-600 font-bold text-2xl tracking-widest"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
