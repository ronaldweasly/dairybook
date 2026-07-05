'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Download, FileSpreadsheet, Calendar, IndianRupee, ClipboardList, TrendingUp, AlertCircle, Settings, Send } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ReportRow {
  id: string;
  invoiceNumber: string;
  totalQty: number;
  avgRate: number;
  milkAmount: number;
  previousBalance: number;
  advancePayment: number;
  grandTotal: number;
  status: string;
  customer: {
    customerId: string;
    name: string;
    milkType: string;
  };
  payments: { amount: number }[];
}

export default function ReportsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [month, year]);

  // Compute stats
  const totalLiters = reportData.reduce((sum, row) => sum + row.totalQty, 0);
  const totalBilling = reportData.reduce((sum, row) => sum + row.grandTotal, 0);
  const totalReceived = reportData.reduce((sum, row) => {
    const paid = row.payments.reduce((s, p) => s + p.amount, 0);
    return sum + paid;
  }, 0);
  const totalDues = Math.max(0, totalBilling - totalReceived);

  // Excel Export Handler
  const handleExportExcel = () => {
    const dataToExport = reportData.map((row) => {
      const paid = row.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, row.grandTotal - paid);
      return {
        [t('customers.id')]: row.customer.customerId,
        [t('customers.name')]: row.customer.name,
        [t('customers.milkType')]: row.customer.milkType,
        [t('billing.milkQty') + ' (L)']: row.totalQty,
        [t('dailyEntry.rate')]: row.avgRate,
        [t('billing.milkAmount')]: row.milkAmount,
        [t('billing.previousBalance')]: row.previousBalance,
        [t('billing.advancePayment')]: row.advancePayment,
        [t('billing.grandTotal')]: row.grandTotal,
        [locale === 'hi' ? 'भुगतान की गई राशि (₹)' : 'Amount Paid (₹)']: paid,
        [locale === 'hi' ? 'बकाया राशि (₹)' : 'Balance Due (₹)']: balance,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Ledger');

    // Add totals row at bottom
    XLSX.utils.sheet_add_aoa(worksheet, [
      [], // empty row
      [locale === 'hi' ? 'कुल' : 'Total', '', '', totalLiters, '', '', '', '', totalBilling, totalReceived, totalDues]
    ], { origin: -1 });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(fileData, `DairyBook_Report_${month}_${year}.xlsx`);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = locale === 'hi'
      ? ['ग्राहक आईडी', 'नाम', 'दूध का प्रकार', 'मात्रा (लीटर)', 'औसत दर (₹)', 'दूध की राशि (₹)', 'कुल राशि (₹)', 'प्राप्त राशि (₹)', 'बकाया राशि (₹)']
      : ['Customer ID', 'Name', 'Milk Type', 'Qty (L)', 'Avg Rate (₹)', 'Milk Amount (₹)', 'Grand Total (₹)', 'Paid (₹)', 'Due (₹)'];

    const rows = reportData.map((row) => {
      const paid = row.payments.reduce((s, p) => s + p.amount, 0);
      const balance = Math.max(0, row.grandTotal - paid);
      return [
        row.customer.customerId,
        `"${row.customer.name}"`,
        row.customer.milkType,
        row.totalQty.toFixed(1),
        row.avgRate.toFixed(2),
        row.milkAmount.toFixed(2),
        row.grandTotal.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
      ];
    });

    // Add summary row
    rows.push([
      locale === 'hi' ? 'कुल' : 'TOTAL',
      '',
      '',
      totalLiters.toFixed(1),
      '',
      '',
      totalBilling.toFixed(2),
      totalReceived.toFixed(2),
      totalDues.toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const fileData = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(fileData, `DairyBook_Report_${month}_${year}.csv`);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">

      {/* ── Tab Strip: Settings / WhatsApp API / Reports ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap">
        <Link
          href={`/${locale}/dashboard/settings`}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white -mb-px shrink-0"
        >
          <Settings className="h-4 w-4" />
          {locale === 'hi' ? 'सेटिंग' : 'Settings'}
        </Link>

        <Link
          href={`/${locale}/dashboard/settings?tab=whatsapp`}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white -mb-px shrink-0"
        >
          <Send className="h-4 w-4" />
          {locale === 'hi' ? 'व्हाट्सएप QR' : 'WhatsApp QR'}
        </Link>

        <Link
          href={`/${locale}/dashboard/reports`}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 -mb-px shrink-0"
        >
          <BarChart3 className="h-4 w-4" />
          {locale === 'hi' ? 'रिपोर्ट' : 'Reports'}
        </Link>
      </div>

      {/* Date Selector & Export Actions Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold text-sm cursor-pointer"
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
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold text-sm cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            disabled={loading || reportData.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span>{t('reports.exportExcel')}</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={loading || reportData.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>{t('reports.exportCSV')}</span>
          </button>
        </div>
      </div>


      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Liters */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('reports.totalCollection')}</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{totalLiters.toFixed(1)} L</h3>
          </div>
        </div>

        {/* Total Billing */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('reports.totalRevenue')}</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">₹{totalBilling.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-US')}</h3>
          </div>
        </div>

        {/* Total Received */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-teal-50 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 rounded-xl">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('reports.receivedAmount')}</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">₹{totalReceived.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-US')}</h3>
          </div>
        </div>

        {/* Total Dues */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{t('reports.dueAmount')}</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">₹{totalDues.toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-US')}</h3>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : reportData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 text-center px-4">
          <BarChart3 className="h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {locale === 'hi' ? 'कोई रिपोर्ट उपलब्ध नहीं' : 'No Report Data'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {locale === 'hi' 
              ? 'रिपोर्ट देखने के लिए पहले इस अवधि के बिल जनरेट करें।' 
              : 'Generate invoices for this period first to view report ledger.'}
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
                    <th className="px-4 py-3">{t('customers.id')}</th>
                    <th className="px-4 py-3">{t('customers.name')}</th>
                    <th className="px-4 py-3">{t('customers.milkType')}</th>
                    <th className="px-4 py-3">{t('billing.milkQty')}</th>
                    <th className="px-4 py-3">{t('billing.milkAmount')}</th>
                    <th className="px-4 py-3">{t('billing.previousBalance')}</th>
                    <th className="px-4 py-3">{t('billing.advancePayment')}</th>
                    <th className="px-4 py-3">{t('billing.grandTotal')}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'भुगतान (₹)' : 'Paid (₹)'}</th>
                    <th className="px-4 py-3">{locale === 'hi' ? 'बकाया (₹)' : 'Balance (₹)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-800 dark:text-slate-200">
                  {reportData.map((row) => {
                    const paid = row.payments.reduce((sumPaid, p) => sumPaid + p.amount, 0);
                    const balance = Math.max(0, row.grandTotal - paid);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                        <td className="px-4 py-3.5 font-semibold text-xs text-slate-500">{row.customer.customerId}</td>
                        <td className="px-4 py-3.5 font-bold">{row.customer.name}</td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-650">
                            {row.customer.milkType === 'COW' && t('common.cow')}
                            {row.customer.milkType === 'BUFFALO' && t('common.buffalo')}
                            {row.customer.milkType === 'MIXED' && t('common.mixed')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold">{row.totalQty.toFixed(1)} L</td>
                        <td className="px-4 py-3.5">₹{row.milkAmount.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-rose-500">₹{row.previousBalance.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-emerald-500">₹{row.advancePayment.toFixed(2)}</td>
                        <td className="px-4 py-3.5 font-bold">₹{row.grandTotal.toFixed(2)}</td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-600">₹{paid.toFixed(2)}</td>
                        <td className={`px-4 py-3.5 font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          ₹{balance.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-4" colSpan={3}>{locale === 'hi' ? 'कुल' : 'TOTAL'}</td>
                    <td className="px-4 py-4">{totalLiters.toFixed(1)} L</td>
                    <td className="px-4 py-4" colSpan={4}></td>
                    <td className="px-4 py-4 text-emerald-600">₹{totalReceived.toFixed(2)}</td>
                    <td className="px-4 py-4 text-rose-600">₹{totalDues.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {reportData.map((row) => {
              const paid = row.payments.reduce((sumPaid, p) => sumPaid + p.amount, 0);
              const balance = Math.max(0, row.grandTotal - paid);
              return (
                <div 
                  key={row.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-5 shadow-sm space-y-3 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">{row.customer.customerId}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{row.customer.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650">
                      {row.customer.milkType === 'COW' && t('common.cow')}
                      {row.customer.milkType === 'BUFFALO' && t('common.buffalo')}
                      {row.customer.milkType === 'MIXED' && t('common.mixed')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('billing.milkQty')}</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{row.totalQty.toFixed(1)} L</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('billing.milkAmount')}</p>
                      <p className="font-semibold text-slate-850 dark:text-slate-200 mt-0.5">₹{row.milkAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{locale === 'hi' ? 'भुगतान किया (₹)' : 'Paid (₹)'}</p>
                      <p className="font-bold text-emerald-600 mt-0.5">₹{paid.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{locale === 'hi' ? 'बकाया राशि (₹)' : 'Due (₹)'}</p>
                      <p className={`font-bold mt-0.5 ${balance > 0 ? 'text-rose-600' : 'text-slate-550'}`}>₹{balance.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 dark:border-slate-800 pt-2 text-[10px] text-slate-400 flex justify-between">
                    <span>{t('billing.previousBalance')}: ₹{row.previousBalance.toFixed(2)}</span>
                    <span>{t('billing.advancePayment')}: ₹{row.advancePayment.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
