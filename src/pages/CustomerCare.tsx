import React, { useState } from "react";
import { toast } from "sonner";
import { Ticket, Send, User, Mail, AlertCircle, ArrowLeft, CheckCircle2, MessageSquare, Phone, Globe } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { safeStringify, getApiUrl } from "../firebase";

export default function CustomerCare() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", email: "", problemType: "", details: "" });
  const [ticketId, setTicketId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.problemType || !formData.details) {
        toast.error(t('customer_care.fill_all'));
        return;
      }
      
      setIsSubmitting(true);
      try {
        const response = await fetch(getApiUrl('/api/support-ticket'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeStringify(formData),
        });
        
        if (!response.ok) throw new Error('Failed to send ticket');
        
        const data = await response.json();
        setTicketId(data.ticketId);
        setStep(2);
        toast.success(t('customer_care.success_toast'));
      } catch (error) {
        toast.error('Failed to create ticket. Please try again later.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <Ticket className="w-8 h-8 text-indigo-600" />
          {t('customer_care.title')}
        </h1>
      </div>

      {step === 1 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Mail Us</p>
                <p className="text-sm font-bold text-indigo-900">rumawatersolutions@gmail.com</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">WhatsApp</p>
                <p className="text-sm font-bold text-green-900">+91 8420289264</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('customer_care.name')}</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('customer_care.email')}</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('customer_care.problem_type')}</label>
                <div className="relative group">
                  <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <select
                    required
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold appearance-none"
                    value={formData.problemType}
                    onChange={(e) => setFormData({ ...formData, problemType: e.target.value })}
                  >
                    <option value="">{t('customer_care.select_problem')}</option>
                    <option value="delivery">{t('customer_care.delivery')}</option>
                    <option value="payment">{t('customer_care.payment')}</option>
                    <option value="product">{t('customer_care.product')}</option>
                    <option value="other">{t('customer_care.other')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('customer_care.details')}</label>
                <textarea
                  required
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold min-h-[120px]"
                  placeholder={t('customer_care.details_placeholder')}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t('customer_care.submit')}
                </>
              )}
            </button>
          </form>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-2xl border border-gray-100 text-center space-y-8"
        >
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">{t('customer_care.success')}</h2>
            <p className="text-gray-500 font-medium">{t('customer_care.contact_info')}</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('customer_care.ticket_id')}</p>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-wider">{ticketId}</p>
          </div>

          <button
            onClick={() => navigate("/", { replace: true })}
            className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2"
          >
            <Globe className="w-5 h-5" />
            {t('customer_care.back_home')}
          </button>
        </motion.div>
      )}
    </div>
  );
}
