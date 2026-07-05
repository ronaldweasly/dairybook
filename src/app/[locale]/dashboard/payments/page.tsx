'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { IndianRupee, Landmark, Coins, CreditCard, PlusCircle, History, CheckCircle, AlertCircle } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  customerId: string;
}

interface Payment {
  id: string;
  amount: number;
  method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  reference: string | null;
  notes: string | null;
  isAdvance: boolean;
  paidAt: string;
  customer: {
    name: string;
    customerId: string;
  };
  invoice: {
    invoiceNumber: string;
  } | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  status: string;
}

export default function PaymentsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdvance, setIsAdvance] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active customers
      const custRes = await fetch('/api/customers?status=active');
      const custData = await custRes.json();
      setCustomers(custData);

      // 2. Fetch recent payments
      const payRes = await fetch('/api/payments');
      const payData = await payRes.json();
      setPayments(payData);
    } catch (err) {
      console.error('Failed to load payments data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch pending invoices for the selected customer
  useEffect(() => {
    if (!selectedCustomerId) {
      setInvoices([]);
      return;
    }
    
    // Fetch this month's invoices to link them
    const fetchCurrentMonthInvoices = async () => {
      const today = new Date();
      const res = await fetch(`/api/billing?month=${today.getMonth() + 1}&year=${today.getFullYear()}`);
      if (res.ok) {
        const data: Invoice[] = await res.json();
        // filter for this customer
        const customerInvoices = data.filter((inv: any) => inv.customerId === selectedCustomerId && inv.status !== 'PAID');
        setInvoices(customerInvoices);
      }
    };

    fetchCurrentMonthInvoices();
  }, [selectedCustomerId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    setSaving(true);

    if (!selectedCustomerId || !amount || !method) {
      setErrorState(locale === 'hi' ? 'कृपया सभी आवश्यक फ़ील्ड भरें' : 'Please fill in all required fields');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          invoiceId: isAdvance ? null : selectedInvoiceId || null,
          amount,
          method,
          reference,
          notes,
          isAdvance,
          date,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: t('payments.saveSuccess') });
        // Reset form
        setSelectedCustomerId('');
        setSelectedInvoiceId('');
        setAmount('');
        setReference('');
        setNotes('');
        setIsAdvance(false);
        setDate(new Date().toISOString().split('T')[0]);
        // Refresh list
        fetchInitialData();
      } else {
        const err = await res.json();
        setErrorState(err.error || t('common.error'));
      }
    } catch (err) {
      setErrorState(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const setErrorState = (txt: string | null) => {
    setMessage(txt ? { type: 'error', text: txt } : null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Record Payment Form (Left Panel) */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 border-b border-slate-50 dark:border-slate-800 pb-3 mb-5">
            <PlusCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('payments.recordPayment')}</h2>
          </div>

          {message && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold shadow-sm mb-5 transition-all ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                : 'bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <span className="break-words">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleRecordPayment} className="space-y-4">
            
            {/* Customer Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('payments.customer')} *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm cursor-pointer"
              >
                <option value="">{locale === 'hi' ? '-- ग्राहक चुनें --' : '-- select customer --'}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.customerId})</option>
                ))}
              </select>
            </div>

            {/* Advance Toggle */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="isAdvance"
                checked={isAdvance}
                onChange={(e) => setIsAdvance(e.target.checked)}
                className="h-4.5 w-4.5 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="isAdvance" className="text-sm font-semibold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                {t('payments.isAdvance')}
              </label>
            </div>

            {/* Invoice Selection (disable if advance is active) */}
            {!isAdvance && selectedCustomerId && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'hi' ? 'इनवॉइस से लिंक करें (वैकल्पिक)' : 'Link to Invoice (Optional)'}
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm cursor-pointer"
                >
                  <option value="">{locale === 'hi' ? '-- इनवॉइस चुनें (वैकल्पिक) --' : '-- select invoice (optional) --'}</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} (₹{inv.grandTotal})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('payments.amount')} *
              </label>
              <input
                type="number"
                step="1"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                placeholder="₹"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('payments.date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm cursor-pointer"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('payments.method')} *
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm cursor-pointer"
              >
                <option value="CASH">{t('payments.cash')}</option>
                <option value="UPI">{t('payments.upi')}</option>
                <option value="BANK_TRANSFER">{t('payments.bank')}</option>
                <option value="CARD">{t('payments.card')}</option>
                <option value="OTHER">{t('payments.other')}</option>
              </select>
            </div>

            {/* Reference ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('payments.reference')}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                placeholder={locale === 'hi' ? 'UPI रेफरेंस आईडी, बैंक ट्रांजेक्शन आईडी...' : 'UPI Ref ID, Bank Transaction ID...'}
              />
            </div>

            {/* Remarks / Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('payments.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                placeholder="..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer text-sm"
            >
              <IndianRupee className="h-4.5 w-4.5" />
              {saving ? t('common.saving') : t('payments.recordPayment')}
            </button>
          </form>
        </div>
      </div>

      {/* Payment History (Right Panel) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm transition-colors flex flex-col h-full">
          <div className="flex items-center gap-2.5 border-b border-slate-50 dark:border-slate-800 pb-3 mb-5">
            <History className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('payments.history')}</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center flex-1 py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 flex-1">
              <IndianRupee className="h-12 w-12 text-slate-350 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('common.noData')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {locale === 'hi' 
                  ? 'अभी तक कोई भुगतान दर्ज नहीं किया गया है। भुगतान जोड़ने के लिए बाईं ओर दिए गए फ़ॉर्म का उपयोग करें।' 
                  : 'No payments have been recorded yet. Use the form on the left to add a payment.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">{t('payments.date')}</th>
                      <th className="px-4 py-3">{t('customers.name')}</th>
                      <th className="px-4 py-3">{t('payments.amount')}</th>
                      <th className="px-4 py-3">{t('payments.method')}</th>
                      <th className="px-4 py-3">{locale === 'hi' ? 'विवरण' : 'Details'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-800 dark:text-slate-200">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                          {new Date(p.paidAt).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-US')}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold">{p.customer.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{p.customer.customerId}</div>
                        </td>
                        <td className="px-4 py-3.5 font-bold">
                          ₹{p.amount}
                          {p.isAdvance && (
                            <span className="ml-1 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                              {locale === 'hi' ? 'अग्रिम' : 'Adv'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold">
                          <span className="flex items-center gap-1">
                            {p.method === 'CASH' && <Coins className="h-3.5 w-3.5 text-amber-500" />}
                            {p.method === 'UPI' && <Landmark className="h-3.5 w-3.5 text-emerald-500" />}
                            {p.method === 'BANK_TRANSFER' && <Landmark className="h-3.5 w-3.5 text-indigo-500" />}
                            {p.method === 'CARD' && <CreditCard className="h-3.5 w-3.5 text-blue-500" />}
                            {p.method}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {p.invoice ? (
                            <div className="font-bold">
                              {locale === 'hi' ? 'संबद्ध: ' : 'Linked: '}{p.invoice.invoiceNumber}
                            </div>
                          ) : (
                            <div>{locale === 'hi' ? 'सामान्य' : 'General'}</div>
                          )}
                          {p.reference && <div className="text-[10px] mt-0.5 font-semibold">Ref: {p.reference}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {payments.map((p) => (
                  <div 
                    key={p.id} 
                    className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3 transition-colors text-sm"
                  >
                    <div className="flex items-start justify-between border-b border-slate-200/50 dark:border-slate-800 pb-1.5">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{p.customer.name}</h4>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{p.customer.customerId}</span>
                      </div>
                      <span className="text-xs text-slate-450 dark:text-slate-400 font-semibold">
                        {new Date(p.paidAt).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-US')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('payments.amount')}</p>
                        <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5 flex items-center gap-1">
                          ₹{p.amount}
                          {p.isAdvance && (
                            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                              {locale === 'hi' ? 'अग्रिम' : 'Adv'}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('payments.method')}</p>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1 text-xs">
                          {p.method === 'CASH' && <Coins className="h-3.5 w-3.5 text-amber-500" />}
                          {p.method === 'UPI' && <Landmark className="h-3.5 w-3.5 text-emerald-500" />}
                          {p.method === 'BANK_TRANSFER' && <Landmark className="h-3.5 w-3.5 text-indigo-500" />}
                          {p.method === 'CARD' && <CreditCard className="h-3.5 w-3.5 text-blue-500" />}
                          {p.method}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 border-t border-slate-200/30 dark:border-slate-800/40 pt-1.5 flex justify-between items-center">
                      <div>
                        {p.invoice ? (
                          <span className="font-bold">
                            {locale === 'hi' ? 'संबद्ध: ' : 'Linked: '}{p.invoice.invoiceNumber}
                          </span>
                        ) : (
                          <span>{locale === 'hi' ? 'सामान्य' : 'General'}</span>
                        )}
                      </div>
                      {p.reference && <span className="text-[10px] font-bold">Ref: {p.reference}</span>}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>

    </div>
  );
}
