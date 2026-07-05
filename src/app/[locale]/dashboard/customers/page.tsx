'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Plus, Search, Edit2, Archive, Check, X, Phone, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { getLocalizedName, splitName, transliterateEngToHin, transliterateHinToEng, formatNameCombined } from '@/lib/translit';

interface Customer {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  whatsappNumber: string;
  address: string | null;
  village: string | null;
  milkType: 'COW' | 'BUFFALO' | 'MIXED';
  morningQty: number;
  eveningQty: number;
  ratePerLiter: number;
  startDate: string;
  notes: string | null;
  isActive: boolean;
  isArchived: boolean;
}

export default function CustomersPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'archived' | 'all'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form State
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({
    nameEng: '',
    nameHin: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    village: '',
    milkType: 'COW' as 'COW' | 'BUFFALO' | 'MIXED',
    morningQty: '0',
    eveningQty: '0',
    ratePerLiter: '',
    notes: '',
    isActive: true,
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?status=${statusFilter}&search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter]);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setError('');
    setCurrentId('');
    setFormData({
      nameEng: '',
      nameHin: '',
      phone: '',
      whatsappNumber: '',
      address: '',
      village: '',
      milkType: 'COW',
      morningQty: '0',
      eveningQty: '0',
      ratePerLiter: '',
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setIsEditMode(true);
    setError('');
    setCurrentId(c.id);
    const { engName, hinName } = splitName(c.name);
    setFormData({
      nameEng: engName,
      nameHin: hinName,
      phone: c.phone,
      whatsappNumber: c.whatsappNumber,
      address: c.address || '',
      village: c.village || '',
      milkType: c.milkType,
      morningQty: String(c.morningQty),
      eveningQty: String(c.eveningQty),
      ratePerLiter: String(c.ratePerLiter),
      notes: c.notes || '',
      isActive: c.isActive,
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-transliterate English to Hindi
      if (name === 'nameEng') {
        updated.nameHin = transliterateEngToHin(value);
      }
      // Auto-transliterate Hindi to English
      if (name === 'nameHin') {
        updated.nameEng = transliterateHinToEng(value);
      }
      // Auto-fill WhatsApp number with Phone number if WhatsApp was empty or matched phone
      if (name === 'phone' && (prev.whatsappNumber === prev.phone || !prev.whatsappNumber)) {
        updated.whatsappNumber = value;
      }
      return updated;
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (!formData.nameEng || !formData.phone || !formData.ratePerLiter) {
      setError(locale === 'hi' 
        ? `${t('customers.name')}, ${t('customers.phone')} और ${t('customers.rate')} आवश्यक हैं`
        : `${t('customers.name')}, ${t('customers.phone')} & ${t('customers.rate')} are required`
      );
      setSaving(false);
      return;
    }

    try {
      const url = isEditMode ? `/api/customers/${currentId}` : '/api/customers';
      const method = isEditMode ? 'PUT' : 'POST';

      const combinedName = formatNameCombined(formData.nameEng, formData.nameHin);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: combinedName,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.error || t('common.error'));
      } else {
        setIsModalOpen(false);
        fetchCustomers();
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveCustomer = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      }
    } catch (err) {
      console.error('Failed to archive customer', err);
    }
  };

  const handleToggleStatus = async (c: Customer) => {
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (res.ok) {
        fetchCustomers();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('customers.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.totalCustomers')}: {customers.length}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer w-full sm:w-auto text-sm"
        >
          <Plus className="h-5 w-5" />
          {t('customers.addNew')}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('customers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(['active', 'inactive', 'archived', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {filter === 'active' && t('common.active')}
              {filter === 'inactive' && t('common.inactive')}
              {filter === 'archived' && t('common.archived')}
              {filter === 'all' && t('common.all')}
            </button>
          ))}
        </div>
      </div>

      {/* Customer List Container */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center px-4">
          <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('common.noData')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            {locale === 'hi'
              ? 'कोई भी ग्राहक आपकी शर्तों से मेल नहीं खाता। दैनिक दूध की एंट्रियां दर्ज करना शुरू करने के लिए एक नया ग्राहक जोड़ें।'
              : 'No customers match your criteria. Add a new customer to start recording daily milk entries.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850 p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                !customer.isActive ? 'opacity-70' : ''
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full dark:text-emerald-400 dark:bg-emerald-950/30 mb-1">
                      {customer.customerId}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {getLocalizedName(customer.name, locale)}
                    </h3>
                  </div>

                  {/* Status toggle button */}
                  <button
                    onClick={() => handleToggleStatus(customer)}
                    className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                      customer.isActive
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20'
                        : 'text-slate-400 bg-slate-100 hover:bg-slate-200 dark:text-slate-500 dark:bg-slate-800'
                    }`}
                    title={customer.isActive ? t('common.active') : t('common.inactive')}
                  >
                    {customer.isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  </button>
                </div>

                {/* Card Details */}
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.village && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('customers.village')}:</span>
                      <span>{customer.village}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('customers.milkType')}</p>
                      <p className="font-semibold text-slate-850 dark:text-slate-200">
                        {customer.milkType === 'COW' && t('common.cow')}
                        {customer.milkType === 'BUFFALO' && t('common.buffalo')}
                        {customer.milkType === 'MIXED' && t('common.mixed')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('customers.rate')}</p>
                      <p className="font-semibold text-slate-850 dark:text-slate-200">₹{customer.ratePerLiter}/L</p>
                    </div>
                    <div className="mt-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('common.morning')}</p>
                      <p className="font-semibold text-slate-850 dark:text-slate-200">{customer.morningQty} L</p>
                    </div>
                    <div className="mt-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('common.evening')}</p>
                      <p className="font-semibold text-slate-850 dark:text-slate-200">{customer.eveningQty} L</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <button
                  onClick={() => handleOpenEditModal(customer)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 cursor-pointer transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => handleArchiveCustomer(customer.id)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-100 dark:border-rose-900/20 cursor-pointer transition-all"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditMode ? t('customers.editCustomer') : t('customers.addNew')}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Name English */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {locale === 'hi' ? 'नाम (अंग्रेजी में)' : 'Name (English)'} *
                  </label>
                  <input
                    type="text"
                    name="nameEng"
                    required
                    value={formData.nameEng}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>

                {/* Name Hindi */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {locale === 'hi' ? 'नाम (हिंदी में)' : 'Name (Hindi)'}
                  </label>
                  <input
                    type="text"
                    name="nameHin"
                    value={formData.nameHin}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="जैसे: रमेश कुमार"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.phone')} *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="e.g. 9812345678"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.whatsapp')}
                  </label>
                  <input
                    type="text"
                    name="whatsappNumber"
                    maxLength={10}
                    value={formData.whatsappNumber}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="e.g. 9812345678"
                  />
                </div>

                {/* Village */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.village')}
                  </label>
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="e.g. Rampur"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.address')}
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="e.g. Gali No. 5"
                  />
                </div>

                {/* Milk Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.milkType')}
                  </label>
                  <select
                    name="milkType"
                    value={formData.milkType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                  >
                    <option value="COW">{t('common.cow')}</option>
                    <option value="BUFFALO">{t('common.buffalo')}</option>
                    <option value="MIXED">{t('common.mixed')}</option>
                  </select>
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.rate')} *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="ratePerLiter"
                    required
                    value={formData.ratePerLiter}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="e.g. 55"
                  />
                </div>

                {/* Morning Qty */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('common.morning')} ({t('common.litersShort')})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    name="morningQty"
                    value={formData.morningQty}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                  />
                </div>

                {/* Evening Qty */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('common.evening')} ({t('common.litersShort')})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    name="eveningQty"
                    value={formData.eveningQty}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-1">
                    {t('customers.notes')}
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white text-sm"
                    placeholder="Notes..."
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 cursor-pointer text-sm"
                >
                  {saving ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
