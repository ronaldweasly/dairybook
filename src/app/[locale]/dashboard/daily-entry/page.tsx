'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Copy, CalendarOff, Save, Trash2, Sliders, CheckCircle } from 'lucide-react';

interface EntryRow {
  id: string | null;
  customerId: string;
  customerName: string;
  customerIdStr: string;
  date: string;
  morningQty: number;
  eveningQty: number;
  milkType: 'COW' | 'BUFFALO' | 'MIXED';
  ratePerLiter: number;
  extraCharges: number;
  discount: number;
  remarks: string;
  isHoliday: boolean;
  isSaved: boolean;
}

export default function DailyEntryPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [date, setDate] = useState<string>(() => {
    // Default to today in YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Bulk update state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkField, setBulkField] = useState<'morningQty' | 'eveningQty' | 'ratePerLiter'>('morningQty');
  const [bulkValue, setBulkValue] = useState('');

  const fetchEntries = async (targetDate: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/daily-entries?date=${targetDate}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch entries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(date);
  }, [date]);

  const handleDateChange = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleValueChange = (index: number, field: keyof EntryRow, val: any) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { 
        ...updated[index], 
        [field]: val,
        isSaved: false // mark as modified
      };
      return updated;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/daily-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, entries }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('dailyEntry.successSave') });
        fetchEntries(date);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || t('common.error') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyYesterday = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/daily-entries/copy-yesterday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('dailyEntry.successCopy') });
        fetchEntries(date);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || t('common.error') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHoliday = async (currentHolidayStatus: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/daily-entries/holiday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, isHoliday: !currentHolidayStatus }),
      });
      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: !currentHolidayStatus 
            ? (locale === 'hi' ? 'छुट्टी सफलतापूर्वक दर्ज की गई' : 'Holiday marked successfully')
            : (locale === 'hi' ? 'छुट्टी सफलतापूर्वक हटा दी गई' : 'Holiday cleared successfully')
        });
        fetchEntries(date);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || t('common.error') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyBulk = () => {
    if (!bulkValue) return;
    const value = parseFloat(bulkValue);
    if (isNaN(value)) return;

    setEntries((prev) => 
      prev.map((e) => ({
        ...e,
        [bulkField]: value,
        isSaved: false
      }))
    );
    setShowBulk(false);
    setBulkValue('');
  };

  const isHolidayActive = entries.length > 0 && entries.every((e) => e.isHoliday);

  return (
    <div className="space-y-6">
      
      {/* Date Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-850 dark:bg-slate-950 dark:text-white font-semibold text-sm cursor-pointer"
          />

          <button
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white cursor-pointer transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Copy Yesterday */}
          <button
            onClick={handleCopyYesterday}
            disabled={loading || saving || isHolidayActive}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            {t('dailyEntry.copyYesterday')}
          </button>

          {/* Bulk Edit Toggle */}
          <button
            onClick={() => setShowBulk(!showBulk)}
            disabled={loading || saving || isHolidayActive}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sliders className="h-4 w-4" />
            {t('dailyEntry.bulkUpdate')}
          </button>

          {/* Holiday */}
          <button
            onClick={() => handleToggleHoliday(isHolidayActive)}
            disabled={loading || saving}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isHolidayActive
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                : 'border border-amber-100 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:border-amber-950/30 dark:bg-amber-950/10 dark:text-amber-400'
            }`}
          >
            <CalendarOff className="h-4 w-4" />
            {isHolidayActive ? t('dailyEntry.clearHoliday') : t('dailyEntry.markHoliday')}
          </button>
        </div>
      </div>

      {/* Bulk Update Bar */}
      {showBulk && (
        <div className="flex flex-wrap items-center gap-3 bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {locale === 'hi' ? 'सभी सेट करें:' : 'Set all:'}
          </span>
          <select
            value={bulkField}
            onChange={(e) => setBulkField(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-950 dark:text-white text-xs cursor-pointer focus:outline-none"
          >
            <option value="morningQty">{t('common.morning')} ({t('common.litersShort')})</option>
            <option value="eveningQty">{t('common.evening')} ({t('common.litersShort')})</option>
            <option value="ratePerLiter">{t('customers.rate')}</option>
          </select>
          <input
            type="number"
            step="0.1"
            placeholder={t('dailyEntry.bulkQtyPlaceholder')}
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-950 dark:text-white text-xs w-28 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleApplyBulk}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            {t('dailyEntry.bulkUpdateBtn')}
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold shadow-sm transition-all ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
            : 'bg-red-50 text-red-800 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
        }`}>
          {message.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* List / Table Area */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 text-center px-4">
          <p className="text-slate-500 dark:text-slate-400 font-semibold">
            {locale === 'hi'
              ? 'दूध रिकॉर्ड करने के लिए कोई सक्रिय ग्राहक नहीं है। पहले ग्राहक सूची में सक्रिय ग्राहक जोड़ें!'
              : 'No active customers to record milk. Add active customers in the customer list first!'
            }
          </p>
        </div>
      ) : isHolidayActive ? (
        <div className="flex flex-col items-center justify-center py-16 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-center px-4">
          <CalendarOff className="h-12 w-12 text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400">{t('dailyEntry.holidayText')}</h3>
          <button
            onClick={() => handleToggleHoliday(true)}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            {t('dailyEntry.clearHoliday')}
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-12">
          
          {/* Main Table for Desktop, Card grid for Mobile */}
          
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 overflow-hidden shadow-sm transition-colors">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-850 uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">{t('customers.id')}</th>
                  <th className="px-6 py-4">{t('customers.name')}</th>
                  <th className="px-6 py-4">{t('customers.milkType')}</th>
                  <th className="px-6 py-4">{t('common.morning')} ({t('common.litersShort')})</th>
                  <th className="px-6 py-4">{t('common.evening')} ({t('common.litersShort')})</th>
                  <th className="px-6 py-4">{t('customers.rate')} (₹)</th>
                  <th className="px-6 py-4">{t('dailyEntry.remarks')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-800 dark:text-slate-200">
                {entries.map((entry, idx) => (
                  <tr key={entry.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                    <td className="px-6 py-4 font-bold text-[11px] text-slate-500">{entry.customerIdStr}</td>
                    <td className="px-6 py-4 font-bold">{entry.customerName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                        {entry.milkType === 'COW' && t('common.cow')}
                        {entry.milkType === 'BUFFALO' && t('common.buffalo')}
                        {entry.milkType === 'MIXED' && t('common.mixed')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={entry.morningQty || ''}
                        onChange={(e) => handleValueChange(idx, 'morningQty', parseFloat(e.target.value) || 0)}
                        className={`w-24 px-2 py-1.5 border rounded-lg focus:outline-none dark:bg-slate-950 dark:text-white no-spinner font-semibold text-center text-sm ${
                          entry.isSaved 
                            ? 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                            : 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-50/10'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        value={entry.eveningQty || ''}
                        onChange={(e) => handleValueChange(idx, 'eveningQty', parseFloat(e.target.value) || 0)}
                        className={`w-24 px-2 py-1.5 border rounded-lg focus:outline-none dark:bg-slate-950 dark:text-white no-spinner font-semibold text-center text-sm ${
                          entry.isSaved 
                            ? 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                            : 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-50/10'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        step="0.5"
                        inputMode="decimal"
                        value={entry.ratePerLiter || ''}
                        onChange={(e) => handleValueChange(idx, 'ratePerLiter', parseFloat(e.target.value) || 0)}
                        className={`w-20 px-2 py-1.5 border rounded-lg focus:outline-none dark:bg-slate-950 dark:text-white no-spinner font-semibold text-center text-sm ${
                          entry.isSaved 
                            ? 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                            : 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-50/10'
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={entry.remarks || ''}
                        onChange={(e) => handleValueChange(idx, 'remarks', e.target.value)}
                        className={`w-full max-w-xs px-2.5 py-1.5 border rounded-lg focus:outline-none dark:bg-slate-950 dark:text-white text-xs ${
                          entry.isSaved 
                            ? 'border-slate-200 focus:border-emerald-500' 
                            : 'border-amber-400 focus:border-amber-505 bg-amber-50/10'
                        }`}
                        placeholder={t('dailyEntry.remarks') + '...'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based Grid View */}
          <div className="block md:hidden space-y-4">
            {entries.map((entry, idx) => (
              <div 
                key={entry.customerId} 
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm space-y-3 transition-all ${
                  entry.isSaved 
                    ? 'border-slate-100 dark:border-slate-850' 
                    : 'border-amber-400 dark:border-amber-500 bg-amber-50/5'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block">{entry.customerIdStr}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{entry.customerName}</h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full">
                    {entry.milkType === 'COW' && t('common.cow')}
                    {entry.milkType === 'BUFFALO' && t('common.buffalo')}
                    {entry.milkType === 'MIXED' && t('common.mixed')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  
                  {/* Morning Qty input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('common.morning')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={entry.morningQty || ''}
                      onChange={(e) => handleValueChange(idx, 'morningQty', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-xl text-center text-sm font-semibold dark:bg-slate-950 dark:text-white no-spinner focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Evening Qty input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('common.evening')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={entry.eveningQty || ''}
                      onChange={(e) => handleValueChange(idx, 'eveningQty', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-xl text-center text-sm font-semibold dark:bg-slate-950 dark:text-white no-spinner focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Rate input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('customers.rate')}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      value={entry.ratePerLiter || ''}
                      onChange={(e) => handleValueChange(idx, 'ratePerLiter', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 border border-slate-200 rounded-xl text-center text-sm font-semibold dark:bg-slate-950 dark:text-white no-spinner focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                </div>

                {/* Remarks input */}
                <div>
                  <input
                    type="text"
                    value={entry.remarks || ''}
                    onChange={(e) => handleValueChange(idx, 'remarks', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs dark:bg-slate-950 dark:text-white focus:outline-none focus:border-emerald-500"
                    placeholder={t('dailyEntry.remarks') + '...'}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-end z-20 shadow-lg md:shadow-md transition-all">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl shadow-md disabled:opacity-50 cursor-pointer w-full md:w-auto transition-all text-sm"
            >
              <Save className="h-5 w-5" />
              {saving ? t('common.saving') : t('dailyEntry.saveAll')}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
