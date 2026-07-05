'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Settings, Landmark, ShieldAlert, Download, Upload, Save, CheckCircle, AlertCircle, BarChart3, Send,
  Store, Phone, MapPin, Hash, Globe, KeyRound, QrCode, CreditCard, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const tabQuery = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'profile' | 'bank' | 'backup' | 'whatsapp'>('profile');
  const [mobileActiveAccordion, setMobileActiveAccordion] = useState<'profile' | 'bank' | 'backup' | null>('profile');

  const toggleAccordion = (sec: 'profile' | 'bank' | 'backup') => {
    setMobileActiveAccordion(prev => prev === sec ? null : sec);
    setActiveTab(sec);
  };

  useEffect(() => {
    if (tabQuery === 'whatsapp') {
      setActiveTab('whatsapp');
    }
  }, [tabQuery]);

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
    pin: '',
    whatsappApiKey: '',
    whatsappPhoneId: '',
    whatsappBusinessId: '',
  });

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'qrcode' | 'error'>('idle');
  const [qrError, setQrError] = useState('');
  const [showEvolutionAdvanced, setShowEvolutionAdvanced] = useState(false);

  const handleConnectWhatsApp = async () => {
    setQrLoading(true);
    setQrError('');
    setQrCode(null);
    setConnectionStatus('idle');
    try {
      const res = await fetch('/api/whatsapp/connect');
      const data = await res.json();
      if (!res.ok) {
        setQrError(data.error || 'Failed to connect');
        setConnectionStatus('error');
      } else if (data.status === 'connected') {
        setConnectionStatus('connected');
      } else if (data.status === 'qrcode') {
        setConnectionStatus('qrcode');
        setQrCode(data.qrcode);
      }
    } catch (err) {
      setQrError('Failed to establish contact with server');
      setConnectionStatus('error');
    } finally {
      setQrLoading(false);
    }
  };

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
          pin: '',
          whatsappApiKey: data.whatsappApiKey || 'dairybook_global_apikey',
          whatsappPhoneId: data.whatsappPhoneId || 'http://localhost:8080',
          whatsappBusinessId: data.whatsappBusinessId || 'krishna_dairy_instance',
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

  // ── Form Components JSX Blocks ──
  const profileForm = (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <span className="text-xl">👤</span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            {locale === 'hi' ? 'डेयरी प्रोफ़ाइल जानकारी' : 'Dairy Profile Information'}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold block mt-0.5">
            {locale === 'hi' ? 'अपनी डेयरी का मूल विवरण और पिन कोड बदलें' : 'Manage your dairy business profile settings and login PIN'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {t('settings.dairyName')} *
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Store className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
                placeholder={locale === 'hi' ? 'डेयरी का नाम' : 'Dairy Name'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {t('settings.phone')}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Phone className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
                placeholder="e.g. +91 9876543210"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            {t('settings.address')}
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute top-3 left-3.5 text-slate-400 dark:text-slate-500">
              <MapPin className="h-4 w-4" />
            </div>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={2}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
              placeholder={locale === 'hi' ? 'डेयरी का पूरा पता' : 'Full Dairy Address'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {t('settings.gst')}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Hash className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
                placeholder="e.g. 22AAAAA0000A1Z5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {locale === 'hi' ? 'इनवॉइस उपसर्ग (Prefix)' : 'Invoice Prefix'}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Hash className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
                placeholder="e.g. KD"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {locale === 'hi' ? 'डिफ़ॉल्ट इनवॉइस भाषा' : 'Default Invoice Language'}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Globe className="h-4 w-4" />
              </div>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all cursor-pointer"
              >
                <option value="hi">Hindi (हिंदी)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {locale === 'hi' ? '🔑 नया 4-अंकों का लॉगिन पिन' : '🔑 New 4-Digit Login PIN'}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="pin"
                maxLength={4}
                pattern="\d*"
                value={formData.pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, pin: val }));
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
                placeholder={locale === 'hi' ? 'पिन न बदलने हेतु खाली छोड़ें' : 'leave blank to keep current'}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer text-sm"
        >
          <Save className="h-4.5 w-4.5" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );

  const bankForm = (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <span className="text-xl">🏦</span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            {locale === 'hi' ? 'बैंक और भुगतान सेटिंग्स' : 'Bank & Payment Settings'}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold block mt-0.5">
            {locale === 'hi' ? 'इनवॉइस पर भुगतान विवरण और QR कोड सेट करें' : 'Configure receiving accounts and invoice QR settings'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            {t('settings.upi')}
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <QrCode className="h-4 w-4" />
            </div>
            <input
              type="text"
              name="upiId"
              value={formData.upiId}
              onChange={handleInputChange}
              placeholder="e.g. yourname@upi"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-bold block mt-1">
            {locale === 'hi' ? 'इनवॉइस PDF पर ऑटो-जनरेटेड UPI भुगतान क्यूआर कोड बनाने के लिए उपयोग किया जाता है' : 'Used to generate auto-payment QR code on customer invoice PDFs'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {t('settings.bankName')}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Landmark className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="e.g. State Bank of India"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {t('settings.account')}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <CreditCard className="h-4 w-4" />
              </div>
              <input
                type="text"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleInputChange}
                placeholder="e.g. 10002938484"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            {t('settings.ifsc')}
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <input
              type="text"
              name="bankIfsc"
              value={formData.bankIfsc}
              onChange={handleInputChange}
              placeholder="e.g. SBIN0001234"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer text-sm"
        >
          <Save className="h-4.5 w-4.5" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );

  const backupForm = (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <span className="text-xl">💾</span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            {locale === 'hi' ? 'डेटा बैकअप और रीस्टोर' : 'Data Backup & Restore'}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold block mt-0.5">
            {locale === 'hi' ? 'अपनी डेयरी का पूरा डेटा बैकअप लें या पुराने बैकअप से बहाल करें' : 'Export all ledger data or restore previous local database backups'}
          </p>
        </div>
      </div>
      
      {/* Export backup */}
      <div className="p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-slate-55/40 dark:bg-slate-950/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-650 dark:bg-emerald-950/30 dark:text-emerald-450 rounded-xl">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {t('settings.exportDb')}
            </h3>
            <p className="text-xs text-slate-450 mt-1 leading-normal">
              {locale === 'hi' 
                ? 'डेयरी सेटिंग्स, ग्राहक सूची, दैनिक दूध संग्रह लॉग, इनवॉइस और भुगतान वाली JSON बैकअप फ़ाइल डाउनलोड करें।' 
                : 'Download a complete JSON database snapshot of your settings, customers, daily milk logs, invoices, and payments.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleExportBackup}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <Download className="h-4 w-4" />
          {t('settings.exportDb')}
        </button>
      </div>

      {/* Import backup */}
      <div className="p-5 rounded-3xl border border-rose-100/65 dark:border-rose-950/30 bg-rose-50/10 dark:bg-rose-955/5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-50 text-red-650 dark:bg-red-950/30 dark:text-red-450 rounded-xl">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-400">
              {t('settings.importDb')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 leading-normal">
              {locale === 'hi' ? (
                <>
                  JSON बैकअप फ़ाइल से पुराना डेटा रीस्टोर करें। <strong className="text-red-650 dark:text-red-400">चेतावनी: यह सभी वर्तमान डेटा को मिटा देगा और बैकअप फ़ाइल के डेटा से बदल देगा। यह प्रक्रिया पूर्ववत नहीं की जा सकती।</strong>
                </>
              ) : (
                <>
                  Restore database ledger from a previously exported backup file. <strong className="text-red-650 dark:text-red-405">WARNING: This will overwrite and completely replace all current logs. This action is irreversible.</strong>
                </>
              )}
            </p>
          </div>
        </div>
        
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-red-200/50 dark:border-red-900/30 rounded-2xl p-8 bg-white dark:bg-slate-900/60 hover:bg-red-50/10 dark:hover:bg-red-955/10 cursor-pointer transition-all">
          <Upload className="h-8 w-8 text-rose-600 mb-2 animate-bounce" />
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            {locale === 'hi' ? 'JSON बैकअप फ़ाइल चुनें' : 'Choose JSON Backup File'}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">
            {locale === 'hi' ? 'यहाँ क्लिक करें या फ़ाइल ड्रैग करें' : 'Click here or drag file to upload'}
          </span>
          <input
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            disabled={saving}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Tab Strip: Settings / WhatsApp API / Reports ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab !== 'whatsapp'
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4" />
          {locale === 'hi' ? 'सेटिंग' : 'Settings'}
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Send className="h-4 w-4" />
          {locale === 'hi' ? 'व्हाट्सएप QR' : 'WhatsApp QR'}
        </button>

        <Link
          href={`/${locale}/dashboard/reports`}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white -mb-px shrink-0"
        >
          <BarChart3 className="h-4 w-4" />
          {locale === 'hi' ? 'रिपोर्ट' : 'Reports'}
        </Link>
      </div>

      {/* Tabs - Only shown when in Settings sections (Desktop only) */}
      {activeTab !== 'whatsapp' && (
        <div className="hidden md:flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none flex-nowrap md:flex-wrap">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'border-emerald-650 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-455 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            {t('settings.profile')}
          </button>
          
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'bank'
                ? 'border-emerald-650 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-455 dark:hover:text-slate-200'
            }`}
          >
            <Landmark className="h-4 w-4" />
            {t('settings.bank')}
          </button>
          
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'backup'
                ? 'border-emerald-650 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-455 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            {locale === 'hi' ? 'बैकअप और रीस्टोर' : 'Backup & Restore'}
          </button>
        </div>
      )}

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

      {/* Desktop Form Content Container (Hidden on mobile) */}
      {activeTab !== 'whatsapp' && (
        <div className="hidden md:block bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-sm transition-colors">
          {activeTab === 'profile' && profileForm}
          {activeTab === 'bank' && bankForm}
          {activeTab === 'backup' && backupForm}
        </div>
      )}

      {/* Mobile Form Content Accordions Container (Hidden on desktop) */}
      {activeTab !== 'whatsapp' && (
        <div className="block md:hidden space-y-4">
          {/* Accordion 1: Profile */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion('profile')}
              className="w-full flex items-center justify-between p-4 font-extrabold text-slate-850 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">👤</span>
                <div className="text-left">
                  <span className="text-sm block leading-tight">{locale === 'hi' ? 'डेयरी प्रोफाइल' : 'Dairy Profile'}</span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{locale === 'hi' ? 'नाम, फोन, पता और पिन कोड' : 'Name, phone, address & login PIN'}</span>
                </div>
              </div>
              {mobileActiveAccordion === 'profile' ? <ChevronUp className="h-4 w-4 text-emerald-650 animate-pulse" /> : <ChevronDown className="h-4 w-4 text-slate-450" />}
            </button>
            {mobileActiveAccordion === 'profile' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-slate-950/20">
                {profileForm}
              </div>
            )}
          </div>

          {/* Accordion 2: Bank */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion('bank')}
              className="w-full flex items-center justify-between p-4 font-extrabold text-slate-855 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🏦</span>
                <div className="text-left">
                  <span className="text-sm block leading-tight">{locale === 'hi' ? 'बैंक और UPI विवरण' : 'Bank & UPI Details'}</span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{locale === 'hi' ? 'UPI आईडी और बैंक खाता' : 'UPI address & bank accounts'}</span>
                </div>
              </div>
              {mobileActiveAccordion === 'bank' ? <ChevronUp className="h-4 w-4 text-emerald-650 animate-pulse" /> : <ChevronDown className="h-4 w-4 text-slate-450" />}
            </button>
            {mobileActiveAccordion === 'bank' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-855 bg-slate-50/30 dark:bg-slate-950/20">
                {bankForm}
              </div>
            )}
          </div>

          {/* Accordion 3: Backup */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden transition-all duration-300">
            <button
              type="button"
              onClick={() => toggleAccordion('backup')}
              className="w-full flex items-center justify-between p-4 font-extrabold text-slate-855 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-955 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💾</span>
                <div className="text-left">
                  <span className="text-sm block leading-tight">{locale === 'hi' ? 'बैकअप और रीस्टोर' : 'Backup & Restore'}</span>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{locale === 'hi' ? 'डेटा सुरक्षित करें या बहाल करें' : 'Export data or restore backup file'}</span>
                </div>
              </div>
              {mobileActiveAccordion === 'backup' ? <ChevronUp className="h-4 w-4 text-emerald-650 animate-pulse" /> : <ChevronDown className="h-4 w-4 text-slate-450" />}
            </button>
            {mobileActiveAccordion === 'backup' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-855 bg-slate-50/30 dark:bg-slate-950/20">
                {backupForm}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: WhatsApp Headless API Settings */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          
          {/* Simple setup card */}
          <div className="bg-indigo-50/20 border border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/30 rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-indigo-50 text-indigo-755 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full flex items-center justify-center text-2xl shadow-sm">
              📲
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {locale === 'hi' ? 'व्हाट्सएप ऑटो-सेंड (Evolution API)' : 'WhatsApp Auto-Send Setup'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-normal">
                {locale === 'hi'
                  ? 'नीचे दिए बटन पर क्लिक करें और अपने व्हाट्सएप से QR कोड स्कैन करें। इसके बाद सभी बिल अपने आप व्हाट्सएप पर चले जाएंगे।'
                  : 'Click the button below and scan the QR code with your WhatsApp to automatically send bill statements.'}
              </p>
            </div>

            {/* QR Connection status & Actions */}
            <div className="w-full max-w-sm pt-2">
              {connectionStatus === 'connected' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-105 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 flex items-center justify-center gap-2 text-sm font-bold shadow-sm">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>{locale === 'hi' ? 'व्हाट्सएप कनेक्टेड है!' : 'WhatsApp is Connected!'}</span>
                </div>
              ) : connectionStatus === 'qrcode' && qrCode ? (
                <div className="flex flex-col items-center p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 space-y-4 shadow-sm w-full">
                  <h4 className="text-[11px] font-extrabold text-slate-450 uppercase tracking-wider">
                    {locale === 'hi' ? '📲 अपने phone से यह QR कोड स्कैन करें' : '📲 Scan this QR Code'}
                  </h4>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <img src={qrCode} alt="WhatsApp QR Code" className="h-48 w-48 object-contain" />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {locale === 'hi'
                      ? 'लिंक डिवाइस से स्कैन करें। स्कैन होने के बाद कनेक्शन जांचें दबाएं।'
                      : 'Go to Linked Devices in WhatsApp to scan. Click re-verify once done.'}
                  </p>
                  <button
                    onClick={handleConnectWhatsApp}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    🔄 {locale === 'hi' ? 'कनेक्शन जांचें' : 'Check connection status'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={qrLoading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 text-sm"
                >
                  {qrLoading ? (
                    <span>{locale === 'hi' ? 'कनेक्ट हो रहा है...' : 'Connecting...'}</span>
                  ) : (
                    <>
                      <Send className="h-4.5 w-4.5" />
                      <span>{locale === 'hi' ? '📲 व्हाट्सएप कनेक्ट करें (QR कोड दिखाएं)' : '📲 Link WhatsApp (Get QR Code)'}</span>
                    </>
                  )}
                </button>
              )}

              {connectionStatus === 'error' && (
                <div className="mt-3 p-4 rounded-xl bg-red-50 text-red-800 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 flex items-center gap-2 text-xs font-semibold text-left">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{qrError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Advanced settings */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowEvolutionAdvanced(!showEvolutionAdvanced)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
            >
              🔄 {showEvolutionAdvanced 
                ? (locale === 'hi' ? 'उन्नत सेटिंग्स छिपाएं' : 'Hide Advanced Settings')
                : (locale === 'hi' ? 'उन्नत सेटिंग्स (Evolution URL/Key)' : 'Advanced Settings (Evolution URL/Key)')}
            </button>

            {showEvolutionAdvanced && (
              <form onSubmit={handleSaveSettings} className="w-full mt-4 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-55/50 dark:bg-slate-900/40 space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {locale === 'hi' ? 'एवोल्यूशन API बेस URL (URL)' : 'Evolution API Base URL'}
                  </label>
                  <input
                    type="text"
                    name="whatsappPhoneId"
                    value={formData.whatsappPhoneId}
                    onChange={handleInputChange}
                    placeholder="e.g. http://localhost:8080"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {locale === 'hi' ? 'इंस्टेंस का नाम (Instance Name)' : 'Instance Name'}
                  </label>
                  <input
                    type="text"
                    name="whatsappBusinessId"
                    value={formData.whatsappBusinessId}
                    onChange={handleInputChange}
                    placeholder="e.g. krishna_dairy_instance"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {locale === 'hi' ? 'एवोल्यूशन API की (apikey)' : 'Global API Key (apikey)'}
                  </label>
                  <input
                    type="password"
                    name="whatsappApiKey"
                    value={formData.whatsappApiKey}
                    onChange={handleInputChange}
                    placeholder="e.g. apikey"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-white text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer text-xs"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
