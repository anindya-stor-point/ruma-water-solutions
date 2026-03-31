import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [terms, setTerms] = useState<string>('');

  useEffect(() => {
    const fetchTerms = async () => {
      const docRef = doc(db, 'appSettings', 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTerms(docSnap.data().termsAndConditions || 'Terms and conditions content not set.');
      }
    };
    fetchTerms();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
      <button 
        onClick={() => navigate("/profile")}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        {t('common.back')}
      </button>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">{t('profile.terms')}</h1>
      <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-wrap">
        {terms}
      </div>
    </div>
  );
}
