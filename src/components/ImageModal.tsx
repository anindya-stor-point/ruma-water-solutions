import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrls: string[];
  alt: string;
}

export default function ImageModal({ isOpen, onClose, imageUrls, alt }: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  if (!isOpen || !imageUrls || imageUrls.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="relative max-w-5xl w-full flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={imageUrls[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </div>

      {imageUrls.length > 1 && (
        <div className="flex gap-3 mt-4 overflow-x-auto max-w-full pb-4 px-4 hide-scrollbar" onClick={(e) => e.stopPropagation()}>
          {imageUrls.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all ${
                currentIndex === idx ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`${alt} ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
