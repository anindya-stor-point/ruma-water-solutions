import React, { useState } from "react";
import { toast } from "sonner";
import { Ticket, Send, User, Mail, AlertCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { safeStringify } from "../firebase";

export default function CustomerCare() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: "", email: "", problemType: "", details: "" });
  const [ticketId, setTicketId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.problemType || !formData.details) {
        toast.error(t('customer_care.fill_all'));
        return;
      }
      
      try {
        const response = await fetch('/api/support-ticket', {
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
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Ticket className="w-6 h-6" /> {t('customer_care.title')}
      </h1>

      {step === 1 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('customer_care.name')}</label>
            <div className="mt-1 flex items-center border rounded-md">
              <User className="w-5 h-5 ml-2 text-gray-400" />
              <input
                type="text"
                required
                className="w-full p-2 border-none focus:ring-0"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('customer_care.email')}</label>
            <div className="mt-1 flex items-center border rounded-md">
              <Mail className="w-5 h-5 ml-2 text-gray-400" />
              <input
                type="email"
                required
                className="w-full p-2 border-none focus:ring-0"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('customer_care.problem_type')}</label>
            <div className="mt-1 flex items-center border rounded-md">
              <AlertCircle className="w-5 h-5 ml-2 text-gray-400" />
              <select
                required
                className="w-full p-2 border-none focus:ring-0"
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
            <label className="block text-sm font-medium text-gray-700">{t('customer_care.details')}</label>
            <textarea
              required
              className="w-full p-2 border rounded-md mt-1 focus:ring-0"
              rows={4}
              placeholder={t('customer_care.details_placeholder')}
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> {t('customer_care.submit')}
          </button>
        </form>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-green-600 font-bold text-lg">{t('customer_care.success')}</div>
          <div className="text-xl font-mono bg-gray-100 p-4 rounded-md">{t('customer_care.ticket_id')}: {ticketId}</div>
          <p className="text-gray-600">{t('customer_care.contact_info')}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="text-blue-600 hover:underline"
          >
            {t('customer_care.back_home')}
          </button>
        </div>
      )}
    </div>
  );
}
