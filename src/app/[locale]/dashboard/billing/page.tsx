'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Receipt, FileText, Send, Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  billingMonth: number;
  billingYear: number;
  totalQty: number;
  avgRate: number;
  grandTotal: number;
  status: 'GENERATED' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  customer: {
    name: string;
    customerId: string;
    whatsappNumber: string;
  };
}

export default function BillingPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bulkSendIndex, setBulkSendIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/billing?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [month, year]);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ 
          type: 'success', 
          text: t('billing.generationSuccess', { period: `${month}/${year}` }) + (locale === 'hi' ? ` (कुल: ${data.count})` : ` (Total: ${data.count})`)
        });
        fetchInvoices();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || t('common.error') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendWhatsAppManual = (invoice: Invoice) => {
    const customerName = invoice.customer.name;
    const totalMilk = invoice.totalQty.toFixed(1);
    const avgRate = invoice.avgRate.toFixed(1);
    const grandTotal = invoice.grandTotal.toFixed(2);
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthHindi = [
      'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
      'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
    ];
    
    const monthName = locale === 'hi' 
      ? monthHindi[invoice.billingMonth - 1] 
      : monthNames[invoice.billingMonth - 1];
    
    const publicPdfUrl = `${window.location.origin}/api/public/invoice/${invoice.id}`;
    
    const text = locale === 'hi'
      ? `नमस्ते ${customerName},\n\n` +
        `कृष्णा डेयरी से ${monthName} ${invoice.billingYear} का बिल तैयार है।\n\n` +
        `🥛 कुल दूध: ${totalMilk} लीटर\n` +
        `💰 दर: ₹${avgRate}/लीटर\n` +
        `📊 कुल राशि: ₹${grandTotal}\n\n` +
        `कृपया इस लिंक से अपना इनवॉइस डाउनलोड करें:\n${publicPdfUrl}\n\n` +
        `कृष्णा डेयरी को चुनने के लिए धन्यवाद! 🙏`
      : `Hello ${customerName},\n\n` +
        `Your dairy bill for ${monthName} ${invoice.billingYear} from Krishna Dairy is ready.\n\n` +
        `🥛 Total Milk: ${totalMilk} Liters\n` +
        `💰 Rate: ₹${avgRate}/Liter\n` +
        `📊 Total Amount: ₹${grandTotal}\n\n` +
        `Please view your detailed invoice here:\n${publicPdfUrl}\n\n` +
        `Thank you for choosing Krishna Dairy! 🙏`;
        
    const cleanPhone = invoice.customer.whatsappNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('billing.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {locale === 'hi' 
            ? 'सभी ग्राहकों के लिए मासिक बिल तैयार करें और व्हाट्सएप पर शेयर करें।' 
            : 'Generate monthly invoices for all customers and share bills directly via WhatsApp.'}
        </p>
      </div>

      {/* Date Selectors & Generate Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-880 shadow-sm transition-colors">
        
        {/* Month Year Select */}
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
          
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold text-sm cursor-pointer"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {locale === 'hi' 
                  ? ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'][m - 1]
                  : new Date(2000, m - 1, 1).toLocaleString('en', { month: 'long' })
                }
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold text-sm cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Generate Button */}
          <button
            onClick={handleGenerateInvoices}
            disabled={generating || loading}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 text-sm"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('billing.generating')}
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                {t('billing.generateInvoices')}
              </>
            )}
          </button>

          {/* Send All Bills Button */}
          {invoices.length > 0 && (
            <button
              onClick={() => setBulkSendIndex(0)}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-sm"
            >
              <Send className="h-4 w-4" />
              {locale === 'hi' ? '📲 सभी को बिल भेजें (Send All)' : '📲 Send All Bills'}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold shadow-sm transition-all ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
            : 'bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Invoices List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 text-center px-4">
          <Receipt className="h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {locale === 'hi' ? 'कोई बिल नहीं मिला' : 'No Invoices Found'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            {locale === 'hi' 
              ? 'इस अवधि के लिए सभी सक्रिय ग्राहकों के बिल की गणना करने के लिए ऊपर दिए गए "बिल तैयार करें" बटन पर क्लिक करें।' 
              : 'Click the "Generate Invoices" button above to calculate bills for all active customers for this period.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-sm transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4">{t('billing.invoiceNo')}</th>
                    <th className="px-6 py-4">{t('customers.name')}</th>
                    <th className="px-6 py-4">{t('billing.milkQty')}</th>
                    <th className="px-6 py-4">{t('billing.amount')}</th>
                    <th className="px-6 py-4">{t('billing.status')}</th>
                    <th className="px-6 py-4 text-right">{t('billing.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-800 dark:text-slate-200">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                      <td className="px-6 py-4 font-semibold text-xs text-slate-500">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-bold">{inv.customer.name}</td>
                      <td className="px-6 py-4 font-semibold">{inv.totalQty.toFixed(1)} L</td>
                      <td className="px-6 py-4 font-bold">₹{inv.grandTotal.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                          {inv.status === 'PAID' ? t('billing.statusPaid') : t('billing.statusPending')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View PDF */}
                          <a
                            href={`/api/billing/${inv.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 dark:text-slate-350 dark:border-slate-800 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {t('billing.viewPDF')}
                          </a>
                          
                          {/* Send via WhatsApp */}
                          <button
                            onClick={() => handleSendWhatsAppManual(inv)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-100 dark:text-emerald-400 dark:border-emerald-900/30 dark:hover:bg-emerald-950/20 px-3 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {t('billing.sendWhatsApp')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid View */}
          <div className="block md:hidden space-y-4">
            {invoices.map((inv) => (
              <div 
                key={inv.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-5 shadow-sm space-y-4 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block">{inv.invoiceNumber}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{inv.customer.name}</h4>
                  </div>
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    inv.status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30'
                  }`}>
                    {inv.status === 'PAID' ? t('billing.statusPaid') : t('billing.statusPending')}
                  </span>
                </div>

                {/* Liters and Amount */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('billing.milkQty')}</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{inv.totalQty.toFixed(1)} L</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('billing.amount')}</p>
                    <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">₹{inv.grandTotal.toFixed(2)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                  <a
                    href={`/api/billing/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 dark:text-slate-350 dark:border-slate-800 dark:hover:bg-slate-800 py-2.5 rounded-xl transition-all cursor-pointer text-center"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t('billing.viewPDF')}
                  </a>
                  <button
                    onClick={() => handleSendWhatsAppManual(inv)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-100 dark:text-emerald-400 dark:border-emerald-900/30 dark:hover:bg-emerald-950/20 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {t('billing.sendWhatsApp')}
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Bulk WhatsApp Bill Assistant Wizard */}
      {bulkSendIndex !== null && invoices[bulkSendIndex] && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="h-16 w-16 bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full flex items-center justify-center">
              <Send className="h-8 w-8 animate-pulse" />
            </div>

            {/* Title & Stats */}
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {locale === 'hi' ? '📲 बिल भेजने का सहायक' : '📲 Send All Bills Assistant'}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-bold dark:text-slate-400">
                {locale === 'hi' 
                  ? `ग्राहक ${bulkSendIndex + 1} / ${invoices.length}` 
                  : `Customer ${bulkSendIndex + 1} of ${invoices.length}`
                }
              </p>
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 w-full max-w-xs mx-auto">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                  {locale === 'hi' ? 'ग्राहक का नाम' : 'Customer Name'}
                </span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {invoices[bulkSendIndex].customer.name}
                </span>
                <span className="text-xs text-slate-450 block mt-2">
                  {locale === 'hi' ? `कुल देय: ₹${invoices[bulkSendIndex].grandTotal.toFixed(2)}` : `Due: ₹${invoices[bulkSendIndex].grandTotal.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  // Send WhatsApp message in new tab
                  handleSendWhatsAppManual(invoices[bulkSendIndex]);
                  // Advance index
                  if (bulkSendIndex + 1 >= invoices.length) {
                    setBulkSendIndex(null);
                    // Show success
                    setMessage({
                      type: 'success',
                      text: locale === 'hi' ? 'सभी बिल सफलतापूर्वक व्हाट्सएप पर शेयर कर दिए गए हैं!' : 'All bills successfully shared on WhatsApp!',
                    });
                  } else {
                    setBulkSendIndex(bulkSendIndex + 1);
                  }
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg rounded-2xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                {locale === 'hi' ? '📲 व्हाट्सएप पर भेजें (Send) →' : '📲 Send via WhatsApp →'}
              </button>

              <button
                onClick={() => setBulkSendIndex(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-2xl transition-all cursor-pointer"
              >
                {locale === 'hi' ? 'रद्द करें (Cancel)' : 'Cancel'}
              </button>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-slate-400 font-semibold max-w-xs leading-normal">
              {locale === 'hi' 
                ? 'निर्देश: ऊपर हरा बटन दबाएं। हर बार दबाने पर एक नया व्हाट्सएप टैब खुलेगा, और सहायक अगले ग्राहक पर आगे बढ़ जाएगा।' 
                : 'Instruction: Click the green button. Each click opens a new WhatsApp tab, and the assistant moves to the next customer.'
              }
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
