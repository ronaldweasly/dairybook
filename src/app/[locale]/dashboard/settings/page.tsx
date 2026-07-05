'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Settings, Landmark, ShieldAlert, Download, Upload, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'backup'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    gstNumber: '',
    upiId: '',
    bankName: '',
    bankAccount: '',
    bankIfsc: '',
    language: 'hi',
    invoicePrefix: 'DB',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          gstNumber: data.gstNumber || '',
          upiId: data.upiId || '',
          bankName: data.bankName || '',
          bankAccount: data.bankAccount || '',
          bankIfsc: data.bankIfsc || '',
          language: data.language || 'hi',
          invoicePrefix: data.invoicePrefix || 'DB',
        });
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saveSuccess') });
        fetchSettings();
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

  const handleExportBackup = () => {
    window.open('/api/backup', '_blank');
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmMsg = locale === 'hi' 
      ? 'क्या आप वाकई रीस्टोर करना चाहते हैं? यह इस डेयरी के सभी वर्तमान ग्राहकों, दूध की एंट्रियों, इनवॉइस और भुगतानों को बैकअप डेटा से अधिलेखित (overwrite) कर देगा!'
      : 'Are you sure? This will overwrite all current customers, milk entries, invoices and payments in this dairy with the backup data!';

    if (!confirm(confirmMsg)) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      });

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: locale === 'hi' ? 'डेटाबेस सफलतापूर्वक रीस्टोर किया गया!' : 'Database restored successfully!' 
        });
        fetchSettings();
      } else {
        const err = await res.json();
        setMessage({ 
          type: 'error', 
          text: err.error || (locale === 'hi' ? 'डेटाबेस रीस्टोर करने में विफल।' : 'Failed to restore database.') 
        });
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: locale === 'hi' ? 'अमान्य बैकअप फ़ाइल प्रारूप' : 'Invalid backup file format' 
      });
    } finally {
      setSaving(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {locale === 'hi' 
            ? 'अपनी डेयरी सेटिंग्स, UPI इनवॉइस के लिए बैंक खाता और बैकअप फ़ाइलें प्रबंधित करें।' 
            : 'Configure your dairy settings, bank account for UPI invoices, and manage backup files.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-emerald-650 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="h-4 w-4" />
          {t('settings.profile')}
        </button>
        
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'border-emerald-650 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'
          }`}
        >
          <Landmark className="h-4 w-4" />
          {t('settings.bank')}
        </button>
        
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'backup'
              ? 'border-emerald-650 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          {locale === 'hi' ? 'बैकअप और रीस्टोर' : 'Backup & Restore'}
        </button>
      </div>

      {/* Notification toast */}
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

      {/* Form Content */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm transition-colors">
        
        {/* Tab 1: Profile Settings */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.dairyName')} *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.phone')}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.address')}
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('settings.gst')}
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'hi' ? 'इनवॉइस उपसर्ग (Prefix)' : 'Invoice Prefix'}
                </label>
                <input
                  type="text"
                  name="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {locale === 'hi' ? 'डिफ़ॉल्ट इनवॉइस भाषा' : 'Default Invoice Language'}
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm cursor-pointer"
              >
                <option value="hi">Hindi (हिंदी)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer text-sm"
              >
                <Save className="h-4.5 w-4.5" />
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Banking & UPI Settings */}
        {activeTab === 'bank' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.upi')}
              </label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleInputChange}
                placeholder="e.g. yourname@upi"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
              />
              <p className="text-[10px] text-slate-400 font-bold block mt-1">
                {locale === 'hi' ? 'इनवॉइस PDF पर भुगतान क्यूआर कोड बनाने के लिए उपयोग किया जाता है' : 'Used to generate payment QR code on invoice PDFs'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('settings.bankName')}
              </label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('settings.account')}
                </label>
                <input
                  type="text"
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('settings.ifsc')}
                </label>
                <input
                  type="text"
                  name="bankIfsc"
                  value={formData.bankIfsc}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer text-sm"
              >
                <Save className="h-4.5 w-4.5" />
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Backup & Restore */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            
            {/* Export backup */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
              <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
                <Download className="h-4.5 w-4.5 text-emerald-650" />
                {t('settings.exportDb')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'hi' 
                  ? 'डेयरी सेटिंग्स, ग्राहक, दैनिक दूध संग्रह लॉग, इनवॉइस और भुगतान वाली JSON बैकअप फ़ाइल डाउनलोड करें। इस फ़ाइल को सुरक्षित रखें।' 
                  : 'Download a JSON backup containing all dairy settings, customers, daily milk collection logs, invoices, and payments. Keep this file safe.'}
              </p>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                {t('settings.exportDb')}
              </button>
            </div>

            {/* Import backup */}
            <div className="p-4 rounded-xl border border-red-100/60 dark:border-red-950/20 bg-red-50/10 space-y-3">
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
                <Upload className="h-4.5 w-4.5" />
                {t('settings.importDb')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === 'hi' ? (
                  <>
                    पहले डाउनलोड की गई JSON बैकअप फ़ाइल से डेटा रीस्टोर करें। <strong className="text-red-750 dark:text-red-400">चेतावनी: यह सभी वर्तमान डेटा को हटा देगा और बदल देगा। इस कार्य को पूर्ववत (undo) नहीं किया जा सकता।</strong>
                  </>
                ) : (
                  <>
                    Restore data from a previously downloaded JSON backup file. <strong className="text-red-700 dark:text-red-400">WARNING: This will delete and replace all current data. This action cannot be undone.</strong>
                  </>
                )}
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  disabled={saving}
                  className="block w-full text-xs text-slate-500
                    file:mr-4 file:py-2.5 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-bold
                    file:bg-rose-50 file:text-rose-700
                    file:cursor-pointer hover:file:bg-rose-100
                    disabled:opacity-50"
                />
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
