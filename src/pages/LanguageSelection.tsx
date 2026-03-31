import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, Language } from "../context/LanguageContext";
import { ChevronRight, Check } from "lucide-react";

export default function LanguageSelection() {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    navigate(-1); // Go back to profile
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-gray-900">{t('profile.select_language')}</h2>
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6 rotate-90" />
        </button>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => handleLanguageSelect('en')}
          className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
            language === 'en' 
              ? 'border-indigo-600 bg-indigo-50/50' 
              : 'border-gray-100 hover:border-indigo-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${
              language === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              EN
            </div>
            <span className={`text-lg font-bold ${language === 'en' ? 'text-indigo-900' : 'text-gray-700'}`}>
              {t('profile.english')}
            </span>
          </div>
          {language === 'en' && <Check className="w-6 h-6 text-indigo-600" />}
        </button>

        <button
          onClick={() => handleLanguageSelect('bn')}
          className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${
            language === 'bn' 
              ? 'border-indigo-600 bg-indigo-50/50' 
              : 'border-gray-100 hover:border-indigo-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black ${
              language === 'bn' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              BN
            </div>
            <span className={`text-lg font-bold ${language === 'bn' ? 'text-indigo-900' : 'text-gray-700'}`}>
              {t('profile.bengali')}
            </span>
          </div>
          {language === 'bn' && <Check className="w-6 h-6 text-indigo-600" />}
        </button>
      </div>
    </div>
  );
}
